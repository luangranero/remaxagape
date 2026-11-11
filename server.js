'use strict';
/**
 * Servidor local (npm start). Em produção na Netlify este arquivo não é usado:
 * os estáticos saem de public/ e as rotas dinâmicas de netlify/functions/app.mjs.
 * As rotas dinâmicas ficam em src/app.js e são as mesmas nos dois ambientes.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

carregarEnv();
if (process.env.NODE_ENV !== 'production') process.env.WEBHOOK_DEV_ABERTO = '1';

const app = require('./src/app');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const LIMITE_CORPO = 10 * 1024 * 1024;

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

const lerTemplate = async () => fs.readFileSync(path.join(PUBLIC, 'imovel.html'), 'utf8');

function enviar(req, res, status, corpo, headers) {
  const buf = Buffer.isBuffer(corpo) ? corpo : Buffer.from(corpo);
  const tipo = headers['Content-Type'] || '';
  const h = { 'X-Content-Type-Options': 'nosniff', ...headers };
  if (/\bgzip\b/.test(req.headers['accept-encoding'] || '') && buf.length > 1024 && /text|json|xml|javascript|svg/.test(tipo)) {
    h['Content-Encoding'] = 'gzip';
    h['Vary'] = 'Accept-Encoding';
    res.writeHead(status, h);
    return res.end(req.method === 'HEAD' ? undefined : zlib.gzipSync(buf));
  }
  res.writeHead(status, h);
  res.end(req.method === 'HEAD' ? undefined : buf);
}

function estatico(req, res, rel) {
  const alvo = path.normalize(path.join(PUBLIC, rel));
  if (!alvo.startsWith(PUBLIC)) return false;
  let stat;
  try { stat = fs.statSync(alvo); } catch { return false; }
  if (!stat.isFile()) return false;
  const ext = path.extname(alvo).toLowerCase();
  enviar(req, res, 200, fs.readFileSync(alvo), {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
  });
  return true;
}

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

/** Converte a requisição do Node para um Request Web e repassa ao app. */
async function rotear(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (['host', 'connection', 'content-length', 'transfer-encoding', 'keep-alive'].includes(k)) continue;
    headers.set(k, Array.isArray(v) ? v.join(', ') : v);
  }
  const temCorpo = !['GET', 'HEAD'].includes(req.method);
  const request = new Request(url, { method: req.method, headers, body: temCorpo ? await lerCorpo(req) : undefined });

  const resposta = await app.handle(request, { lerTemplate });
  if (resposta) {
    const h = Object.fromEntries(resposta.headers.entries());
    if (h['content-type']) { h['Content-Type'] = h['content-type']; delete h['content-type']; }
    return enviar(req, res, resposta.status, Buffer.from(await resposta.arrayBuffer()), h);
  }

  const p = decodeURIComponent(url.pathname);
  if (p === '/' || p === '/imoveis') return estatico(req, res, 'index.html');
  if (estatico(req, res, p)) return;
  enviar(req, res, 404, fs.readFileSync(path.join(PUBLIC, '404.html')), { 'Content-Type': MIME['.html'] });
}

const servidor = http.createServer((req, res) => {
  rotear(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) enviar(req, res, 500, JSON.stringify({ erro: 'Erro interno' }), { 'Content-Type': MIME['.json'] });
  });
});

if (require.main === module) {
  servidor.listen(PORT, async () => {
    const r = await app.handle(new Request(`http://localhost:${PORT}/api/saude`), { lerTemplate });
    const { imoveis } = await r.json();
    console.log(`RE/MAX Agapê rodando em http://localhost:${PORT}  (${imoveis} imóveis)`);
    if (!process.env.WEBHOOK_TOKEN && !process.env.WEBHOOK_SECRET) {
      console.warn('⚠ WEBHOOK_TOKEN não definido — o webhook aceita qualquer chamada (só em desenvolvimento).');
    }
  });
}

module.exports = servidor;
