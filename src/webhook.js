'use strict';
/**
 * Processa as notificações enviadas pelo CRM.
 *
 * Formatos aceitos (o normalizador é tolerante a variações):
 *   { "event": "property.updated", "data": { ...imóvel } }
 *   { "evento": "imovel.removido", "imovel": { "id": "..." } }
 *   { ...imóvel }                         (o próprio imóvel)
 *   [ { ...imóvel }, { ...imóvel } ]      (lote)
 *   { "event": "sync", "data": [ ... ] }  (substitui o catálogo inteiro)
 *
 * Eventos cujo nome indica remoção/venda/inativação tiram o imóvel do site.
 * Qualquer outro evento cria ou atualiza o imóvel.
 */
const crypto = require('crypto');
const store = require('./store');
const { normalizarImovel, slugify } = require('./normalizar');

const REMOCAO = /delet|remov|exclu|inativ|inactiv|archiv|arquiv|unpublish|despublic|vendid|sold|alugad|rented|suspen/i;
const SYNC = /^(sync|full|sincroniza|carga)/i;

/**
 * Verifica token simples e/ou assinatura HMAC-SHA256 do corpo.
 * @param {Headers} headers  @param {Buffer} corpoBruto  @param {URL} url
 */
function autorizado(headers, corpoBruto, url) {
  const token = process.env.WEBHOOK_TOKEN;
  const segredo = process.env.WEBHOOK_SECRET;
  if (!token && !segredo) {
    // Sem credenciais: só aceita no servidor local de desenvolvimento
    return process.env.WEBHOOK_DEV_ABERTO === '1';
  }
  const igual = (a, b) => {
    const A = Buffer.from(String(a)), B = Buffer.from(String(b));
    return A.length === B.length && crypto.timingSafeEqual(A, B);
  };
  if (token) {
    const auth = headers.get('authorization') || '';
    const recebido =
      headers.get('x-webhook-token') || headers.get('x-api-key') ||
      (auth.startsWith('Bearer ') ? auth.slice(7) : null) ||
      url.searchParams.get('token');
    if (recebido && igual(recebido, token)) return true;
  }
  if (segredo) {
    const assinatura = String(headers.get('x-hub-signature-256') || headers.get('x-signature') || '').replace(/^sha256=/, '');
    const esperado = crypto.createHmac('sha256', segredo).update(corpoBruto).digest('hex');
    if (assinatura && igual(assinatura, esperado)) return true;
  }
  return false;
}

function extrairItens(corpo) {
  if (Array.isArray(corpo)) return corpo.flatMap(extrairItens);
  if (!corpo || typeof corpo !== 'object') return [];
  const evento = String(corpo.event || corpo.evento || corpo.type_event || corpo.action || corpo.acao || '');
  const dados = corpo.data ?? corpo.dados ?? corpo.property ?? corpo.imovel ?? corpo.payload ?? corpo.properties ?? corpo.imoveis;
  if (Array.isArray(dados)) return dados.map((d) => ({ evento, dados: d }));
  if (dados && typeof dados === 'object') {
    const interno = dados.property || dados.imovel; // { data: { property: {...} } }
    return [{ evento, dados: interno && typeof interno === 'object' ? interno : dados }];
  }
  return [{ evento, dados: corpo }];
}

/**
 * Campos que o normalizador preenche com valor padrão/derivado quando
 * ausentes. Numa atualização parcial, só sobrescrevem o valor atual se
 * alguma das chaves de origem veio de fato no payload.
 */
const ORIGENS = {
  codigo: ['base36Id', 'codigo', 'code', 'reference', 'referencia'],
  titulo: ['title', 'titulo'],
  tipo: ['type', 'tipo', 'propertyType'],
  corretor: ['user', 'corretor', 'agent', 'broker'],
  endereco: ['address', 'endereco'],
  criadoEm: ['createdAt', 'criadoEm', 'created_at'],
  ocultarPreco: ['mgmt', 'ocultarPreco'],
  ocultarEndereco: ['mgmt', 'ocultarEndereco'],
  ativo: ['status', 'situacao', 'ativo', 'active'],
  vagas: ['parkingLots', 'vagas', 'parking', 'parkingSpaces', 'garages'],
};

/** Mantém os campos antigos quando o payload novo não os traz. */
function mesclar(atual, novo, bruto) {
  const r = { ...atual };
  for (const [k, v] of Object.entries(novo)) {
    if (ORIGENS[k] && !ORIGENS[k].some((o) => o in bruto)) continue;
    const vazio = v === null || v === '' || (Array.isArray(v) && !v.length);
    if (!vazio) r[k] = v;
  }
  r.id = atual.id;
  r.slug = slugify([r.tipo, r.ocultarEndereco ? null : r.endereco.rua, r.endereco.bairro, r.endereco.cidade, r.codigo].filter(Boolean).join(' '));
  return r;
}

/** Aplica o payload ao catálogo: lê uma vez, altera em memória, grava uma vez. */
async function processar(corpo) {
  const itens = extrairItens(corpo);
  const resultados = [];

  // Carga completa: substitui o catálogo
  if (itens.length && itens.every((x) => SYNC.test(x.evento))) {
    const novos = [];
    for (const { dados } of itens) {
      try { const i = normalizarImovel(dados); if (i.ativo) novos.push(i); } catch (e) { resultados.push({ acao: 'erro', erro: e.message }); }
    }
    if (!novos.length) return [{ acao: 'erro', erro: 'Carga completa sem imóveis válidos — catálogo mantido' }];
    await store.salvarTodos(novos);
    return [{ acao: 'sincronizado', total: novos.length }, ...resultados];
  }

  let lista = await store.listar();
  let mudou = false;

  for (const { evento, dados } of itens) {
    const id = dados && (dados.id || dados._id || dados.base36Id || dados.codigo || dados.code);
    if (!id) {
      resultados.push({ id: null, acao: 'ignorado', erro: 'Item sem id/código' });
      continue;
    }
    try {
      if (REMOCAO.test(evento)) {
        const alvo = store.encontrar(lista, id);
        if (alvo) { lista = lista.filter((i) => i !== alvo); mudou = true; }
        resultados.push({ id, acao: alvo ? 'removido' : 'nao_encontrado' });
        continue;
      }
      const imovel = normalizarImovel(dados);
      const atual = store.encontrar(lista, imovel.id) || store.encontrar(lista, imovel.codigo);
      const final = atual ? mesclar(atual, imovel, dados) : imovel;
      lista = lista.filter((i) => i !== atual);
      if (final.ativo) lista.push(final);
      mudou = true;
      resultados.push({ id: final.id, acao: !final.ativo ? 'removido' : atual ? 'atualizado' : 'criado' });
    } catch (e) {
      resultados.push({ id, acao: 'erro', erro: e.message });
    }
  }

  if (mudou) await store.salvarTodos(lista);
  return resultados;
}

module.exports = { autorizado, processar };
