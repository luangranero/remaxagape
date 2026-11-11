'use strict';
/**
 * Servidor do site RE/MAX Agapê — sem dependências externas.
 *
 *   GET  /                         vitrine (catálogo com filtros)
 *   GET  /imovel/:slug             página do imóvel
 *   GET  /api/imoveis              lista de imóveis ativos (resumo)
 *   GET  /api/imoveis/:id          imóvel completo (id, código ou slug)
 *   GET  /api/config               dados da unidade
 *   POST /api/webhook/imoveis      recebe criação/atualização/remoção do CRM
 *   GET  /sitemap.xml, /robots.txt
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

carregarEnv();

const store = require('./src/store');
const config = require('./src/config');
const webhook = require('./src/webhook');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const LIMITE_CORPO = 10 * 1024 * 1024; // 10 MB

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function carregarEnv() {
  try {
    const txt = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    for (const linha of txt.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(linha);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* .env é opcional */ }
}

function enviar(req, res, status, corpo, tipo, extraHeaders = {}) {
  const buf = Buffer.isBuffer(corpo) ? corpo : Buffer.from(corpo);
  const headers = { 'Content-Type': tipo, 'X-Content-Type-Options': 'nosniff', ...extraHeaders };
  const aceitaGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (aceitaGzip && buf.length > 1024 && /text|json|xml|javascript|svg/.test(tipo)) {
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
    res.writeHead(status, headers);
    return res.end(zlib.gzipSync(buf));
  }
  res.writeHead(status, headers);
  res.end(buf);
}

const json = (req, res, status, obj, cache = 'no-store') =>
  enviar(req, res, status, JSON.stringify(obj), MIME['.json'], { 'Cache-Control': cache });

function lerCorpo(req) {
  return new Promise((ok, erro) => {
    const partes = [];
    let tam = 0;
    req.on('data', (c) => {
      tam += c.length;
      if (tam > LIMITE_CORPO) { erro(new Error('Corpo muito grande')); req.destroy(); return; }
      partes.push(c);
    });
    req.on('end', () => ok(Buffer.concat(partes)));
    req.on('error', erro);
  });
}

/** Versão enxuta para a listagem (sem descrição longa, poucas fotos). */
function resumo(i) {
  const { descricao, fotos, ...resto } = i;
  return { ...resto, fotos: fotos.slice(0, 6), totalFotos: fotos.length };
}

function ativos() {
  return store.listar()
    .filter((i) => i.ativo)
    .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function urlBase(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${req.headers.host}`;
}

function arquivoEstatico(req, res, rel) {
  const alvo = path.normalize(path.join(PUBLIC, rel));
  if (!alvo.startsWith(PUBLIC)) return false;
  let stat;
  try { stat = fs.statSync(alvo); } catch { return false; }
  if (!stat.isFile()) return false;
  const ext = path.extname(alvo).toLowerCase();
  const cache = ext === '.html' ? 'no-cache' : 'public, max-age=3600';
  enviar(req, res, 200, fs.readFileSync(alvo), MIME[ext] || 'application/octet-stream', { 'Cache-Control': cache });
  return true;
}

/** Injeta título/descrição/imagem do imóvel no HTML para SEO e compartilhamento. */
function paginaImovel(req, res, slug) {
  const imovel = store.obter(slug) || store.obter(slug.split('-').pop());
  let html = fs.readFileSync(path.join(PUBLIC, 'imovel.html'), 'utf8');
  if (!imovel || !imovel.ativo) {
    html = html.replace('<!--META-->', '<meta name="robots" content="noindex">');
    return enviar(req, res, 404, html, MIME['.html']);
  }
  const preco = imovel.precoVenda || imovel.precoLocacao;
  const desc = `${imovel.tipo} em ${imovel.endereco.bairro}, ${imovel.endereco.cidade}` +
    (imovel.quartos ? ` · ${imovel.quartos} quartos` : '') +
    (imovel.areaUtil ? ` · ${imovel.areaUtil} m²` : '') +
    (preco && !imovel.ocultarPreco ? ` · R$ ${preco.toLocaleString('pt-BR')}` : '');
  const url = `${urlBase(req)}/imovel/${imovel.slug}`;
  const meta = [
    `<title>${esc(imovel.titulo)} | ${esc(config.nome)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(imovel.titulo)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    imovel.fotos[0] ? `<meta property="og:image" content="${esc(imovel.fotos[0])}">` : '',
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join('\n    ');
  html = html.replace(/<title>.*?<\/title>/, '').replace('<!--META-->', meta);
  enviar(req, res, 200, html, MIME['.html'], { 'Cache-Control': 'no-cache' });
}

async function rotear(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);

  // ---------- Webhook ----------
  if (p === '/api/webhook/imoveis' || p === '/api/webhook') {
    if (req.method !== 'POST') return json(req, res, 405, { erro: 'Use POST' });
    let bruto;
    try { bruto = await lerCorpo(req); } catch (e) { return json(req, res, 413, { erro: e.message }); }
    if (!webhook.autorizado(req, bruto, url)) {
      webhook.registrar({ status: 401, ip: req.socket.remoteAddress });
      return json(req, res, 401, { erro: 'Não autorizado' });
    }
    let corpo;
    try {
      const tipo = req.headers['content-type'] || '';
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
      webhook.registrar({ status: 400, corpo: bruto.toString().slice(0, 5000) });
      return json(req, res, 400, { erro: 'JSON inválido' });
    }
    const resultados = webhook.processar(corpo);
    webhook.registrar({ status: 200, resultados, corpo });
    console.log('[webhook]', JSON.stringify(resultados));
    return json(req, res, 200, { ok: true, resultados });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return json(req, res, 405, { erro: 'Método não permitido' });

  // ---------- API ----------
  if (p === '/api/imoveis') {
    return json(req, res, 200, { total: ativos().length, imoveis: ativos().map(resumo) }, 'public, max-age=60');
  }
  if (p.startsWith('/api/imoveis/')) {
    const i = store.obter(p.slice('/api/imoveis/'.length));
    if (!i || !i.ativo) return json(req, res, 404, { erro: 'Imóvel não encontrado' });
    return json(req, res, 200, i, 'public, max-age=60');
  }
  if (p === '/api/config') return json(req, res, 200, config, 'public, max-age=300');
  if (p === '/api/saude') return json(req, res, 200, { ok: true, imoveis: ativos().length });

  // ---------- SEO ----------
  if (p === '/robots.txt') {
    return enviar(req, res, 200, `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${urlBase(req)}/sitemap.xml\n`, MIME['.txt']);
  }
  if (p === '/sitemap.xml') {
    const base = urlBase(req);
    const urls = [`${base}/`, ...ativos().map((i) => `${base}/imovel/${i.slug}`)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n')}\n</urlset>\n`;
    return enviar(req, res, 200, xml, MIME['.xml']);
  }

  // ---------- Páginas ----------
  if (p.startsWith('/imovel/')) return paginaImovel(req, res, p.slice('/imovel/'.length).replace(/\/$/, ''));
  if (p === '/' || p === '/imoveis') return arquivoEstatico(req, res, 'index.html');
  if (arquivoEstatico(req, res, p)) return;

  enviar(req, res, 404, fs.readFileSync(path.join(PUBLIC, '404.html')), MIME['.html']);
}

const servidor = http.createServer((req, res) => {
  rotear(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) json(req, res, 500, { erro: 'Erro interno' });
  });
});

if (require.main === module) {
  servidor.listen(PORT, () => {
    console.log(`RE/MAX Agapê rodando em http://localhost:${PORT}  (${ativos().length} imóveis)`);
    if (!process.env.WEBHOOK_TOKEN && !process.env.WEBHOOK_SECRET) {
      console.warn('⚠ WEBHOOK_TOKEN não definido — o webhook só aceita chamadas fora de produção.');
    }
  });
}

module.exports = servidor;
