'use strict';
/**
 * Converte um imóvel vindo do CRM (formato Nonstop/Square, usado pela RE/MAX)
 * ou de um payload genérico para o modelo interno do site.
 *
 * O normalizador é tolerante: aceita nomes de campos alternativos
 * (pt/en, camelCase/snake_case) para que o webhook funcione mesmo que
 * o formato exato enviado pelo sistema varie.
 */

const TIPOS = {
  APARTAMENTO: 'Apartamento',
  APARTAMENTO_TIPO: 'Apartamento',
  APARTAMENTO_PADRAO: 'Apartamento',
  APARTAMENTO_GARDEN: 'Apartamento Garden',
  APARTAMENTO_DUPLEX: 'Apartamento Duplex',
  KITNET: 'Kitnet / Studio',
  STUDIO: 'Kitnet / Studio',
  STUDIO_TIPO: 'Kitnet / Studio',
  FLAT: 'Flat',
  LOFT: 'Loft',
  COBERTURA: 'Cobertura',
  COBERTURA_TIPO: 'Cobertura',
  CASA: 'Casa',
  CASA_TIPO: 'Casa',
  CASA_TERREA: 'Casa',
  SOBRADO: 'Sobrado',
  CASA_SOBRADO: 'Sobrado',
  CASA_CONDOMINIO: 'Casa de Condomínio',
  CASA_DE_CONDOMINIO: 'Casa de Condomínio',
  CONDOMINIO_TIPO: 'Casa de Condomínio',
  CASA_VILA: 'Casa de Vila',
  TERRENO: 'Terreno',
  TERRENO_TIPO: 'Terreno',
  LOTE: 'Terreno',
  SALA_COMERCIAL: 'Sala Comercial',
  CONJUNTO_COMERCIAL: 'Sala Comercial',
  LOJA: 'Loja',
  PONTO_COMERCIAL: 'Ponto Comercial',
  GALPAO: 'Galpão',
  GALPAO_COMERCIAL: 'Galpão',
  CASA_COMERCIAL: 'Casa Comercial',
  CASA_DE_VILA: 'Casa de Vila',
  TERRENO_RESIDENCIAL: 'Terreno',
  TERRENO_COMERCIAL: 'Terreno Comercial',
  PREDIO: 'Prédio',
  PREDIO_INTEIRO: 'Prédio',
  CHACARA: 'Chácara',
  SITIO: 'Sítio',
  FAZENDA: 'Fazenda',
};

const CARACTERISTICAS = {
  AREA_SERVICO: 'Área de serviço',
  LAVABO: 'Lavabo',
  CHURRASQUEIRA: 'Churrasqueira',
  PISCINA: 'Piscina',
  ACADEMIA: 'Academia',
  PLAYGROUND: 'Playground',
  SALAO_FESTAS: 'Salão de festas',
  SALAO_DE_FESTAS: 'Salão de festas',
  SALAO_JOGOS: 'Salão de jogos',
  VARANDA: 'Varanda',
  VARANDA_GOURMET: 'Varanda gourmet',
  SACADA: 'Sacada',
  QUINTAL: 'Quintal',
  JARDIM: 'Jardim',
  ELEVADOR: 'Elevador',
  PORTARIA_24H: 'Portaria 24h',
  PORTARIA: 'Portaria',
  ARMARIOS_EMBUTIDOS: 'Armários embutidos',
  ARMARIO_EMBUTIDO: 'Armários embutidos',
  ARMARIOS_COZINHA: 'Armários na cozinha',
  ARMARIO_COZINHA: 'Armários na cozinha',
  AR_CONDICIONADO: 'Ar-condicionado',
  MOBILIADO: 'Mobiliado',
  SEMIMOBILIADO: 'Semimobiliado',
  ACEITA_PET: 'Aceita pet',
  PET: 'Aceita pet',
  QUADRA: 'Quadra esportiva',
  QUADRA_POLIESPORTIVA: 'Quadra poliesportiva',
  SAUNA: 'Sauna',
  ESPACO_GOURMET: 'Espaço gourmet',
  EDICULA: 'Edícula',
  ESCRITORIO: 'Escritório',
  CLOSET: 'Closet',
  DESPENSA: 'Despensa',
  DEPOSITO: 'Depósito',
  DEPENDENCIA_EMPREGADA: 'Dependência de empregada',
  QUARTO_EMPREGADA: 'Dependência de empregada',
  LAVANDERIA: 'Lavanderia',
  BICICLETARIO: 'Bicicletário',
  BRINQUEDOTECA: 'Brinquedoteca',
  COWORKING: 'Coworking',
  GERADOR: 'Gerador',
  AQUECIMENTO_SOLAR: 'Aquecimento solar',
  AQUECEDOR_GAS: 'Aquecedor a gás',
  INTERFONE: 'Interfone',
  CAMERAS: 'Câmeras de segurança',
  CERCA_ELETRICA: 'Cerca elétrica',
  PORTAO_ELETRONICO: 'Portão eletrônico',
  VISTA_MAR: 'Vista para o mar',
  MOVEIS_PLANEJADOS: 'Móveis planejados',
  BANHEIRO_SR_SRA: 'Banheiro sr. e sra.',
  GAS_ENCANADO: 'Gás encanado',
  AGUA_QUENTE: 'Água quente',
  INFRAESTRUTURA_AR_CONDICIONADO: 'Infraestrutura p/ ar-condicionado',
  AR_CONDICIONADO_CENTRAL: 'Ar-condicionado central',
  PISO_PORCELANATO: 'Piso porcelanato',
  PISO_MADEIRA: 'Piso de madeira',
  PISO_VINILICO: 'Piso vinílico',
  BANHEIRO_SERVICO: 'Banheiro de serviço',
  DEPENDENCIA_DE_FUNCIONARIO: 'Dependência de funcionário',
  DEPENDENCIA_FUNCIONARIO: 'Dependência de funcionário',
  SALA_INTIMA: 'Sala íntima',
  SALA_CINEMA: 'Sala de cinema',
  VISTA_CIDADE: 'Vista para a cidade',
  VISTA_PARA_CIDADE: 'Vista para a cidade',
  OFURO: 'Ofurô',
  HOME_OFFICE: 'Home office',
  VISTA_PANORAMICA: 'Vista panorâmica',
};

function primeiro(...vals) {
  for (const v of vals) if (v !== undefined && v !== null && v !== '') return v;
  return null;
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[^\d,.-]/g, '');
  // "1.250.000,00" -> 1250000.00 ; "1250000.5" -> 1250000.5
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : null;
}

function rotular(cod, mapa) {
  if (!cod) return null;
  const k = String(cod).trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s-]+/g, '_');
  if (mapa[k]) return mapa[k];
  // Fallback: "SALAO_DE_JOGOS" -> "Salão de jogos" (sem acentos garantidos)
  const t = String(cod).replace(/_/g, ' ').toLowerCase().trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function soDigitos(s) {
  return s ? String(s).replace(/\D/g, '') : null;
}

function normalizarWhatsapp(s) {
  let d = soDigitos(s);
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = '55' + d; // sem DDI
  return d;
}

function extrairFotos(p) {
  const fontes = [
    p.media && p.media.images,
    p.fotos, p.photos, p.images, p.imagens, p.media,
  ].find(Array.isArray);
  if (!fontes) return [];
  return fontes
    .map((f) => (typeof f === 'string' ? f : primeiro(f.url, f.src, f.link, f.original)))
    .filter(Boolean);
}

function extrairFinalidade(p, valores) {
  const fin = new Set();
  const av = p.available || p.disponivel || {};
  if (av.sale || av.venda) fin.add('venda');
  if (av.longStay || av.rent || av.locacao || av.aluguel) fin.add('locacao');
  const bruto = [].concat(p.finalidade || p.availableFor || p.transactionType || p.purpose || []);
  for (const b of bruto) {
    const s = String(b).toLowerCase();
    if (/venda|sale|sell/.test(s)) fin.add('venda');
    if (/loca|alug|rent|long/.test(s)) fin.add('locacao');
  }
  if (!fin.size) {
    if (valores.venda) fin.add('venda');
    if (valores.locacao) fin.add('locacao');
  }
  return [...fin];
}

/**
 * @param {object} p   objeto do imóvel (formato do CRM ou genérico)
 * @param {object} extra  { descricao, fotos } — usados quando vêm separados
 */
function normalizarImovel(p, extra = {}) {
  if (!p || typeof p !== 'object') throw new Error('Imóvel inválido');

  const end = p.address || p.endereco || {};
  const geo = (end.geo && end.geo.coordinates) || [];
  const v = p.values || p.valores || {};
  const ar = p.areas || {};
  const u = p.user || p.corretor || p.agent || p.broker || {};
  const mg = p.mgmt || {};

  const valores = {
    venda: num(primeiro(v.sale, v.venda, p.precoVenda, p.salePrice, p.price, p.preco)),
    locacao: num(primeiro(v.longStay, v.rent, v.locacao, p.precoLocacao, p.rentPrice, p.aluguel)),
  };

  if (primeiro(p.id, p._id, p.base36Id, p.codigo, p.code, p.reference, p.referencia) === null) {
    throw new Error('Imóvel sem identificador (id/código)');
  }
  const codigo = String(primeiro(p.base36Id, p.codigo, p.code, p.reference, p.referencia, p.id, p._id) || '');
  const tipoCodigo = primeiro(p.type, p.tipo, p.propertyType);
  const tipo = rotular(tipoCodigo, TIPOS) || 'Imóvel';

  const vagas = Array.isArray(p.parkingLots)
    ? p.parkingLots.length
    : num(primeiro(p.vagas, p.parking, p.parkingSpaces, p.garages));

  const caracteristicas = []
    .concat(p.features || p.caracteristicas || p.amenities || [])
    .map((c) => rotular(typeof c === 'string' ? c : c.name || c.nome, CARACTERISTICAS))
    .filter(Boolean);

  const fotos = extra.fotos && extra.fotos.length ? extra.fotos : extrairFotos(p);

  const descricao = primeiro(
    extra.descricao,
    typeof p.description === 'string' && !/^\$\w+$/.test(p.description) ? p.description : null,
    p.descricao,
  );

  const imovel = {
    id: String(primeiro(p.id, p._id, codigo)),
    codigo,
    titulo: primeiro(p.title, p.titulo) || `${tipo} em ${primeiro(end.area, end.bairro, end.neighborhood) || ''}`.trim(),
    tipo,
    finalidade: extrairFinalidade(p, valores),
    uso: primeiro(p.use, p.uso) || null,
    precoVenda: valores.venda,
    precoLocacao: valores.locacao,
    condominio: num(primeiro(v.condoFee, v.condominio, p.condominio, p.condoFee)),
    iptu: num(primeiro(v.propertyTax, v.iptu, p.iptu, p.propertyTax)) || null,
    ocultarPreco: Boolean(mg.hidePrice || p.ocultarPreco),
    quartos: num(primeiro(p.rooms, p.quartos, p.bedrooms, p.dormitorios)),
    suites: num(primeiro(p.suites, p.suítes)),
    banheiros: num(primeiro(p.baths, p.banheiros, p.bathrooms)),
    vagas,
    areaUtil: num(primeiro(ar.private, ar.util, ar.useful, p.areaUtil, p.area, p.usefulArea)),
    areaTotal: num(primeiro(ar.total, ar.land, p.areaTotal, p.totalArea)),
    andar: num(primeiro(p.floor, p.andar)),
    anoConstrucao: num(primeiro(p.yearOfConstruction, p.anoConstrucao)),
    endereco: {
      rua: primeiro(end.street, end.rua, end.logradouro),
      numero: primeiro(end.number, end.numero),
      bairro: primeiro(end.area, end.bairro, end.neighborhood) || 'Não informado',
      cidade: primeiro(end.city, end.cidade) || 'São Paulo',
      uf: primeiro(end.state, end.uf, end.estado) || 'SP',
      cep: primeiro(end.zipcode, end.cep),
      lat: geo.length === 2 ? geo[1] : num(primeiro(end.lat, end.latitude)),
      lng: geo.length === 2 ? geo[0] : num(primeiro(end.lng, end.longitude)),
    },
    ocultarEndereco: Boolean(mg.hideAddress || p.ocultarEndereco),
    condominioNome: (p.condo && (p.condo.name || p.condo.nome)) || null,
    descricao: descricao || '',
    caracteristicas: [...new Set(caracteristicas)],
    fotos,
    corretor: {
      id: primeiro(u.id, u._id),
      nome: primeiro(u.name, u.nome) || 'RE/MAX Agapê',
      whatsapp: normalizarWhatsapp(primeiro(u.whatsapp, u.phone, u.telefone, u.celular)),
      email: primeiro(u.corporateEmail, u.email),
      foto: primeiro(u.profileImage, u.foto, u.photo),
    },
    criadoEm: primeiro(p.createdAt, p.criadoEm, p.created_at) || new Date().toISOString(),
    atualizadoEm: primeiro(p.updatedAt, p.atualizadoEm, p.updated_at) || new Date().toISOString(),
    ativo: !['VENDIDO', 'ALUGADO', 'INATIVO', 'SUSPENSO', 'ARQUIVADO', 'REMOVIDO'].includes(
      String(primeiro(p.status, p.situacao) || '').toUpperCase(),
    ) && p.ativo !== false && p.active !== false,
  };

  imovel.slug = slugify(
    [imovel.tipo, imovel.ocultarEndereco ? null : imovel.endereco.rua, imovel.endereco.bairro, imovel.endereco.cidade, imovel.codigo]
      .filter(Boolean).join(' '),
  );
  return imovel;
}

module.exports = { normalizarImovel, slugify, normalizarWhatsapp };
