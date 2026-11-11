'use strict';
/**
 * Armazenamento do catálogo.
 *
 *  - Na Netlify: Netlify Blobs (store "catalogo"), já que functions não têm disco.
 *    Enquanto o blob não existir, usa data/imoveis.json (embutido no deploy) como semente.
 *  - Local (npm start): arquivo data/imoveis.json, com escrita atômica.
 *
 * O catálogo inteiro é um único documento JSON (dezenas/centenas de imóveis),
 * lido e gravado de uma vez — simples e consistente para esse volume.
 */
const fs = require('fs');
const path = require('path');

const ARQ = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'imoveis.json');
const ARQ_LOG = path.join(path.dirname(ARQ), 'webhook-log.jsonl');
const LOG_MAX = 200;

const naNetlify = () => Boolean(process.env.NETLIFY_BLOBS_CONTEXT || globalThis.Netlify);

/* ---------- Netlify Blobs ---------- */
let blobStore = null;
async function blobs() {
  if (!blobStore) {
    const { getStore } = await import('@netlify/blobs');
    blobStore = getStore({ name: 'catalogo', consistency: 'strong' });
  }
  return blobStore;
}

function semente() {
  try {
    // require estático: o bundler da Netlify embute o JSON na function
    return require('../data/imoveis.json').imoveis || [];
  } catch {
    return [];
  }
}

/* ---------- Arquivo local ---------- */
function lerArquivo() {
  try {
    return JSON.parse(fs.readFileSync(ARQ, 'utf8')).imoveis || [];
  } catch {
    return [];
  }
}
function gravarArquivo(doc) {
  fs.mkdirSync(path.dirname(ARQ), { recursive: true });
  const tmp = ARQ + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(doc, null, 2));
  fs.renameSync(tmp, ARQ);
}

/* ---------- API ---------- */
async function listar() {
  if (naNetlify()) {
    const doc = await (await blobs()).get('imoveis', { type: 'json' });
    return doc ? doc.imoveis : semente();
  }
  return lerArquivo();
}

async function salvarTodos(imoveis) {
  const doc = { atualizadoEm: new Date().toISOString(), total: imoveis.length, imoveis };
  if (naNetlify()) await (await blobs()).setJSON('imoveis', doc);
  else gravarArquivo(doc);
}

/** Busca por id, código (case-insensitive) ou slug. */
function encontrar(lista, chave) {
  const k = String(chave);
  const K = k.toUpperCase();
  return lista.find((i) => i.id === k) ||
    lista.find((i) => String(i.codigo).toUpperCase() === K) ||
    lista.find((i) => i.slug === k) || null;
}

async function obter(chave) {
  return encontrar(await listar(), chave);
}

async function registrarLog(entrada) {
  const linha = { em: new Date().toISOString(), ...entrada };
  try {
    if (naNetlify()) {
      const s = await blobs();
      const atual = (await s.get('webhook-log', { type: 'json' })) || [];
      atual.push(linha);
      await s.setJSON('webhook-log', atual.slice(-LOG_MAX));
    } else {
      let linhas = [];
      try { linhas = fs.readFileSync(ARQ_LOG, 'utf8').split('\n').filter(Boolean); } catch { /* primeiro log */ }
      linhas.push(JSON.stringify(linha));
      fs.mkdirSync(path.dirname(ARQ_LOG), { recursive: true });
      fs.writeFileSync(ARQ_LOG, linhas.slice(-LOG_MAX).join('\n') + '\n');
    }
  } catch (e) {
    console.error('Falha ao gravar log do webhook:', e.message);
  }
}

async function lerLog() {
  if (naNetlify()) return (await (await blobs()).get('webhook-log', { type: 'json' })) || [];
  try {
    return fs.readFileSync(ARQ_LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

module.exports = { listar, salvarTodos, obter, encontrar, registrarLog, lerLog, naNetlify };
