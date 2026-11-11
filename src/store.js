'use strict';
/**
 * Armazenamento simples em arquivo JSON (data/imoveis.json).
 * Escrita atômica (arquivo temporário + rename) para não corromper
 * o catálogo se o processo cair no meio de uma gravação.
 *
 * Para escalar (vários servidores / serverless), trocar por um banco
 * (Postgres, SQLite, Supabase...) mantendo a mesma interface.
 */
const fs = require('fs');
const path = require('path');

const ARQ = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'imoveis.json');

let cache = null;

function carregar() {
  if (cache) return cache;
  try {
    const dados = JSON.parse(fs.readFileSync(ARQ, 'utf8'));
    cache = new Map((dados.imoveis || []).map((i) => [i.id, i]));
  } catch {
    cache = new Map();
  }
  return cache;
}

function persistir() {
  fs.mkdirSync(path.dirname(ARQ), { recursive: true });
  const tmp = ARQ + '.tmp';
  const imoveis = [...carregar().values()];
  fs.writeFileSync(tmp, JSON.stringify({ atualizadoEm: new Date().toISOString(), total: imoveis.length, imoveis }, null, 2));
  fs.renameSync(tmp, ARQ);
}

function listar() {
  return [...carregar().values()];
}

function obter(idOuCodigo) {
  const m = carregar();
  if (m.has(idOuCodigo)) return m.get(idOuCodigo);
  const alvo = String(idOuCodigo).toUpperCase();
  for (const i of m.values()) if (String(i.codigo).toUpperCase() === alvo || i.slug === idOuCodigo) return i;
  return null;
}

function salvar(imovel) {
  const m = carregar();
  // Mesmo imóvel pode chegar identificado só pelo código
  const existente = obter(imovel.id) || obter(imovel.codigo);
  if (existente && existente.id !== imovel.id) m.delete(existente.id);
  m.set(imovel.id, imovel);
  persistir();
  return imovel;
}

function remover(idOuCodigo) {
  const i = obter(idOuCodigo);
  if (!i) return false;
  carregar().delete(i.id);
  persistir();
  return true;
}

function salvarTodos(lista) {
  cache = new Map(lista.map((i) => [i.id, i]));
  persistir();
}

module.exports = { listar, obter, salvar, remover, salvarTodos };
