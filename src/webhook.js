'use strict';
/**
 * Processa as notificações enviadas pelo CRM.
 *
 * Formatos aceitos (o normalizador é tolerante a variações):
 *   { "event": "property.updated", "data": { ...imóvel } }
 *   { "evento": "imovel.removido", "imovel": { "id": "..." } }
 *   { ...imóvel }                         (o próprio imóvel)
 *   [ { ...imóvel }, { ...imóvel } ]      (lote)
 *
 * Eventos cujo nome indica remoção/venda/inativação tiram o imóvel do site.
 * Qualquer outro evento cria ou atualiza o imóvel.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const store = require('./store');
const { normalizarImovel, slugify } = require('./normalizar');

const LOG = path.join(__dirname, '..', 'data', 'webhook-log.jsonl');
const LOG_MAX = 200; // últimas N chamadas guardadas para depuração

const REMOCAO = /delet|remov|exclu|inativ|inactiv|archiv|arquiv|unpublish|despublic|vendid|sold|alugad|rented|suspen/i;

function registrar(entrada) {
  try {
    fs.mkdirSync(path.dirname(LOG), { recursive: true });
    let linhas = [];
    try { linhas = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean); } catch { /* primeiro log */ }
    linhas.push(JSON.stringify({ em: new Date().toISOString(), ...entrada }));
    fs.writeFileSync(LOG, linhas.slice(-LOG_MAX).join('\n') + '\n');
  } catch (e) {
    console.error('Falha ao gravar log do webhook:', e.message);
  }
}

/** Verifica token simples e/ou assinatura HMAC-SHA256 do corpo. */
function autorizado(req, corpoBruto, url) {
  const token = process.env.WEBHOOK_TOKEN;
  const segredo = process.env.WEBHOOK_SECRET;
  if (!token && !segredo) {
    // Sem credenciais configuradas: só aceita em desenvolvimento
    return process.env.NODE_ENV !== 'production';
  }
  const igual = (a, b) => {
    const A = Buffer.from(String(a)), B = Buffer.from(String(b));
    return A.length === B.length && crypto.timingSafeEqual(A, B);
  };
  if (token) {
    const auth = req.headers['authorization'] || '';
    const recebido =
      req.headers['x-webhook-token'] || req.headers['x-api-key'] ||
      (auth.startsWith('Bearer ') ? auth.slice(7) : null) ||
      url.searchParams.get('token');
    if (recebido && igual(recebido, token)) return true;
  }
  if (segredo) {
    const assinatura = String(req.headers['x-hub-signature-256'] || req.headers['x-signature'] || '').replace(/^sha256=/, '');
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
    // { data: { property: {...} } }
    const interno = dados.property || dados.imovel;
    return [{ evento, dados: interno && typeof interno === 'object' ? interno : dados }];
  }
  return [{ evento, dados: corpo }];
}

function processar(corpo) {
  const resultados = [];
  for (const { evento, dados } of extrairItens(corpo)) {
    const id = dados && (dados.id || dados._id || dados.base36Id || dados.codigo || dados.code);
    if (!id) {
      resultados.push({ id: null, acao: 'ignorado', erro: 'Item sem id/código' });
      continue;
    }
    try {
      if (REMOCAO.test(evento)) {
        resultados.push({ id, acao: store.remover(String(id)) ? 'removido' : 'nao_encontrado' });
        continue;
      }
      const imovel = normalizarImovel(dados);
      // Se o CRM mandou só uma atualização parcial, mescla com o que já temos
      const atual = store.obter(imovel.id) || store.obter(imovel.codigo);
      const final = atual ? mesclar(atual, imovel, dados) : imovel;
      if (!final.ativo) {
        store.remover(final.id);
        resultados.push({ id: final.id, acao: 'removido' });
      } else {
        store.salvar(final);
        resultados.push({ id: final.id, acao: atual ? 'atualizado' : 'criado' });
      }
    } catch (e) {
      resultados.push({ id, acao: 'erro', erro: e.message });
    }
  }
  return resultados;
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

module.exports = { autorizado, processar, registrar };
