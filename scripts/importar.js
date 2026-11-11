'use strict';
/**
 * Importa os imóveis publicados no site atual da unidade (Square/Nonstop)
 * e grava em data/imoveis.json.
 *
 * Uso:  npm run importar
 *
 * Serve para popular o catálogo enquanto o webhook não estiver configurado
 * e como sincronização de segurança (ex.: rodar 1x por dia via agendador).
 */
const { normalizarImovel } = require('../src/normalizar');
const { salvarTodos } = require('../src/store');

const BASE = process.env.SQUARE_URL || 'https://remaxagape.usesquare.com.br';
const UA = 'Mozilla/5.0 (compatible; RemaxAgapeSite/1.0)';

async function get(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

function decodificarFlight(html) {
  const re = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let m, out = '';
  while ((m = re.exec(html))) out += JSON.parse('"' + m[1] + '"');
  return out;
}

/** Retorna o objeto JSON que começa em `inicio` (índice do "{" ou "["). */
function extrairJson(txt, inicio) {
  const abre = txt[inicio];
  const fecha = abre === '{' ? '}' : ']';
  let prof = 0, emStr = false, esc = false;
  for (let i = inicio; i < txt.length; i++) {
    const c = txt[i];
    if (emStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') emStr = false;
      continue;
    }
    if (c === '"') emStr = true;
    else if (c === abre) prof++;
    else if (c === fecha && --prof === 0) return JSON.parse(txt.slice(inicio, i + 1));
  }
  throw new Error('JSON não terminado');
}

/** Resolve referência "$45" para o bloco de texto "45:T<hex>,<texto>". */
function resolverTexto(txt, ref) {
  if (typeof ref !== 'string' || !/^\$\w+$/.test(ref)) return ref;
  const id = ref.slice(1);
  const re = new RegExp(`(?:^|\\n|\\])${id}:T([0-9a-f]+),`);
  const m = re.exec(txt);
  if (!m) return null;
  const ini = m.index + m[0].length;
  const bytes = parseInt(m[1], 16);
  return Buffer.from(txt.slice(ini, ini + bytes * 2), 'utf8').subarray(0, bytes).toString('utf8');
}

async function importarUrl(url) {
  const html = await get(url);
  const txt = decodificarFlight(html);
  const i = txt.indexOf('"property":{"id":');
  if (i < 0) throw new Error('imóvel não encontrado na página');
  const prop = extrairJson(txt, i + '"property":'.length);

  let fotos = [];
  const im = txt.indexOf('"media":{"images":');
  if (im >= 0) {
    const media = extrairJson(txt, im + '"media":'.length);
    fotos = (media.images || []).map((f) => f.url).filter(Boolean);
  }
  // A descrição completa às vezes é uma referência a outro bloco ($45 → texto)
  let descricao = resolverTexto(txt, prop.description);
  const md = /"description":"(\$\w+)"\}\]\}\]/.exec(txt);
  if (md) {
    const alt = resolverTexto(txt, md[1]);
    if (alt && (!descricao || alt.length > descricao.length)) descricao = alt;
  }
  return normalizarImovel(prop, { fotos, descricao });
}

async function main() {
  console.log(`Lendo sitemap de ${BASE} ...`);
  const sitemap = await get(`${BASE}/sitemap.xml`);
  const urls = [...new Set([...sitemap.matchAll(/<loc>([^<]*\/imovel\/[^<]*)<\/loc>/g)].map((m) => m[1]))];
  console.log(`${urls.length} imóveis encontrados.`);

  const imoveis = [];
  const erros = [];
  const fila = [...urls];
  const workers = Array.from({ length: 4 }, async () => {
    while (fila.length) {
      const url = fila.shift();
      try {
        imoveis.push(await importarUrl(url));
        process.stdout.write('.');
      } catch (e) {
        erros.push(`${url}: ${e.message}`);
        process.stdout.write('x');
      }
    }
  });
  await Promise.all(workers);
  console.log();

  if (!imoveis.length) {
    console.error('Nenhum imóvel importado. Nada foi alterado.');
    process.exit(1);
  }
  salvarTodos(imoveis);
  console.log(`✔ ${imoveis.length} imóveis salvos em data/imoveis.json`);
  if (erros.length) console.warn(`⚠ ${erros.length} falhas:\n` + erros.join('\n'));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });

module.exports = { decodificarFlight, extrairJson };
