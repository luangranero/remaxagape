'use strict';
/**
 * Rotas dinâmicas do site, no padrão Web (Request → Response).
 * Usado pela Netlify Function (netlify/functions/app.mjs) e pelo servidor local (server.js).
 *
 *   GET  /api/imoveis              lista de imóveis ativos (resumo)
 *   GET  /api/imoveis/:id          imóvel completo (id, código ou slug)
 *   GET  /api/config               dados da unidade
 *   GET  /api/saude                status
 *   GET  /api/webhook/log          últimas chamadas do webhook (exige token)
 *   POST /api/webhook/imoveis      recebe criação/atualização/remoção do CRM
 *   GET  /imovel/:slug             página do imóvel com meta tags de SEO
 *   GET  /sitemap.xml, /robots.txt
 *
 * Retorna null quando a rota não é dinâmica (o chamador serve o arquivo estático).
 */
const store = require('./store');
const config = require('./config');
const webhook = require('./webhook');

function json(status, obj, cache = 'no-store') {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Versão enxuta para a listagem (sem descrição longa, poucas fotos). */
function resumo(i) {
  const { descricao, fotos, ...resto } = i;
  return { ...resto, fotos: fotos.slice(0, 6), totalFotos: fotos.length };
}

async function ativos() {
  return (await store.listar())
    .filter((i) => i.ativo)
    .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
}

function urlBase(url) {
  return (process.env.SITE_URL || url.origin).replace(/\/$/, '');
}

async function paginaImovel(url, slug, lerTemplate) {
  const lista = await store.listar();
  const imovel = store.encontrar(lista, slug) || store.encontrar(lista, slug.split('-').pop());
  let html = await lerTemplate();
  const tipoHtml = { 'Content-Type': 'text/html; charset=utf-8' };
  if (!imovel || !imovel.ativo) {
    html = html.replace('<!--META-->', '<meta name="robots" content="noindex">');
    return new Response(html, { status: 404, headers: tipoHtml });
  }
  const preco = imovel.precoVenda || imovel.precoLocacao;
  const desc = `${imovel.tipo} em ${imovel.endereco.bairro}, ${imovel.endereco.cidade}` +
    (imovel.quartos ? ` · ${imovel.quartos} quartos` : '') +
    (imovel.areaUtil ? ` · ${imovel.areaUtil} m²` : '') +
    (preco && !imovel.ocultarPreco ? ` · R$ ${preco.toLocaleString('pt-BR')}` : '');
  const canonica = `${urlBase(url)}/imovel/${imovel.slug}`;
  const meta = [
    `<title>${esc(imovel.titulo)} | ${esc(config.nome)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(canonica)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(imovel.titulo)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(canonica)}">`,
    imovel.fotos[0] ? `<meta property="og:image" content="${esc(imovel.fotos[0])}">` : '',
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join('\n    ');
  html = html.replace(/<title>.*?<\/title>/, '').replace('<!--META-->', meta);
  return new Response(html, { status: 200, headers: { ...tipoHtml, 'Cache-Control': 'public, max-age=0, must-revalidate' } });
}

async function receberWebhook(request, url) {
  if (request.method !== 'POST') return json(405, { erro: 'Use POST' });
  const bruto = Buffer.from(await request.arrayBuffer());
  if (bruto.length > 10 * 1024 * 1024) return json(413, { erro: 'Corpo muito grande' });
  if (!webhook.autorizado(request.headers, bruto, url)) {
    await store.registrarLog({ status: 401 });
    return json(401, { erro: 'Não autorizado' });
  }
  let corpo;
  try {
    const tipo = request.headers.get('content-type') || '';
    const texto = bruto.toString().trim();
    // JSON mesmo sem o Content-Type correto (ex.: curl -d sem header)
    corpo = /^[{[]/.test(texto) || !tipo.includes('application/x-www-form-urlencoded')
      ? JSON.parse(texto || '{}')
      : Object.fromEntries(new URLSearchParams(texto));
    // alguns sistemas mandam o JSON dentro de um campo de formulário
    for (const k of ['payload', 'data', 'json']) {
      if (typeof corpo[k] === 'string' && /^\s*[{[]/.test(corpo[k])) corpo[k] = JSON.parse(corpo[k]);
    }
  } catch {
    await store.registrarLog({ status: 400, corpo: bruto.toString().slice(0, 5000) });
    return json(400, { erro: 'JSON inválido' });
  }
  const resultados = await webhook.processar(corpo);
  // não guarda cargas completas inteiras no log
  const corpoLog = JSON.stringify(corpo).length > 20000 ? '(corpo grande omitido)' : corpo;
  await store.registrarLog({ status: 200, resultados, corpo: corpoLog });
  console.log('[webhook]', JSON.stringify(resultados));
  return json(200, { ok: true, resultados });
}

/**
 * @param {Request} request
 * @param {{ lerTemplate: () => Promise<string> }} opcoes  lê public/imovel.html
 * @returns {Promise<Response|null>}
 */
async function handle(request, { lerTemplate }) {
  const url = new URL(request.url);
  const p = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/';

  if (p === '/api/webhook/imoveis' || p === '/api/webhook') return receberWebhook(request, url);

  if (p === '/api/webhook/log') {
    if (!webhook.autorizado(request.headers, Buffer.alloc(0), url)) return json(401, { erro: 'Não autorizado' });
    return json(200, (await store.lerLog()).reverse());
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return p.startsWith('/api/') ? json(405, { erro: 'Método não permitido' }) : null;
  }

  if (p === '/api/imoveis') {
    const lista = await ativos();
    return json(200, { total: lista.length, imoveis: lista.map(resumo) }, 'public, max-age=60');
  }
  if (p.startsWith('/api/imoveis/')) {
    const i = await store.obter(p.slice('/api/imoveis/'.length));
    if (!i || !i.ativo) return json(404, { erro: 'Imóvel não encontrado' });
    return json(200, i, 'public, max-age=60');
  }
  if (p === '/api/config') return json(200, config, 'public, max-age=300');
  if (p === '/api/saude') return json(200, { ok: true, imoveis: (await ativos()).length, armazenamento: store.naNetlify() ? 'netlify-blobs' : 'arquivo' });
  if (p.startsWith('/api/')) return json(404, { erro: 'Rota não encontrada' });

  if (p === '/robots.txt') {
    return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${urlBase(url)}/sitemap.xml\n`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  if (p === '/sitemap.xml') {
    const base = urlBase(url);
    const urls = [`${base}/`, ...(await ativos()).map((i) => `${base}/imovel/${i.slug}`)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n')}\n</urlset>\n`;
    return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  }

  if (p.startsWith('/imovel/')) return paginaImovel(url, p.slice('/imovel/'.length), lerTemplate);

  return null;
}

module.exports = { handle };
