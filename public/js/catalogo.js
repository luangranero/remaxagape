/* ==========================================================================
   Catálogo: filtros facetados, ordenação, paginação e estado na URL
   ========================================================================== */
(function () {
  'use strict';
  const { icone, esc, brlCurto, plural, precoDe, cardHtml, ligarCards, carrinho, linkWhats, avatarPadrao } = window.App;

  const POR_PAGINA = 12;
  const CARAC_VISIVEIS = 8;
  const $ = (s) => document.querySelector(s);
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  let TODOS = [];
  let porId = new Map();
  let pagina = 1;
  let caracTodas = false;

  const PADRAO = () => ({
    fin: 'venda', busca: '', tipos: new Set(), bairros: new Set(), cidades: new Set(), carac: new Set(),
    pmin: null, pmax: null, amin: null, amax: null, quartos: 0, banheiros: 0, vagas: 0,
    corretor: '', ordem: 'recentes',
  });
  let F = PADRAO();

  /* ---------- URL <-> estado ---------- */
  function lerUrl() {
    const q = new URLSearchParams(location.search);
    const set = (k) => new Set(q.getAll(k).filter(Boolean));
    const n = (k) => (q.get(k) ? Number(q.get(k)) : null);
    F = {
      ...PADRAO(),
      fin: q.get('fin') === 'locacao' ? 'locacao' : 'venda',
      busca: q.get('q') || '',
      tipos: set('tipo'), bairros: set('bairro'), cidades: set('cidade'), carac: set('carac'),
      pmin: n('pmin'), pmax: n('pmax'), amin: n('amin'), amax: n('amax'),
      quartos: n('quartos') || 0, banheiros: n('banheiros') || 0, vagas: n('vagas') || 0,
      corretor: q.get('corretor') || '',
      ordem: q.get('ordem') || 'recentes',
    };
  }

  function gravarUrl() {
    const q = new URLSearchParams();
    if (F.fin !== 'venda') q.set('fin', F.fin);
    if (F.busca) q.set('q', F.busca);
    F.tipos.forEach((v) => q.append('tipo', v));
    F.bairros.forEach((v) => q.append('bairro', v));
    F.cidades.forEach((v) => q.append('cidade', v));
    F.carac.forEach((v) => q.append('carac', v));
    for (const k of ['pmin', 'pmax', 'amin', 'amax']) if (F[k] != null) q.set(k, F[k]);
    for (const k of ['quartos', 'banheiros', 'vagas']) if (F[k]) q.set(k, F[k]);
    if (F.corretor) q.set('corretor', F.corretor);
    if (F.ordem !== 'recentes') q.set('ordem', F.ordem);
    const s = q.toString();
    history.replaceState(null, '', (s ? '?' + s : location.pathname) + location.hash);
  }

  /* ---------- Filtragem ---------- */
  const precoFiltro = (i) => (F.fin === 'locacao' ? i.precoLocacao : i.precoVenda);

  function passa(i, ignorar) {
    if (!i.finalidade.includes(F.fin)) return false;
    if (ignorar !== 'tipos' && F.tipos.size && !F.tipos.has(i.tipo)) return false;
    if (ignorar !== 'bairros' && F.bairros.size && !F.bairros.has(i.endereco.bairro)) return false;
    if (ignorar !== 'cidades' && F.cidades.size && !F.cidades.has(i.endereco.cidade)) return false;
    if (ignorar !== 'carac' && F.carac.size && ![...F.carac].every((c) => i.caracteristicas.includes(c))) return false;
    const p = precoFiltro(i);
    if (F.pmin != null && !(p >= F.pmin)) return false;
    if (F.pmax != null && !(p <= F.pmax)) return false;
    if (F.amin != null && !(i.areaUtil >= F.amin)) return false;
    if (F.amax != null && !(i.areaUtil <= F.amax)) return false;
    if (F.quartos && !((i.quartos || 0) >= F.quartos)) return false;
    if (F.banheiros && !((i.banheiros || 0) >= F.banheiros)) return false;
    if (F.vagas && !((i.vagas || 0) >= F.vagas)) return false;
    if (F.corretor && i.corretor.id !== F.corretor) return false;
    if (F.busca) {
      const alvo = norm([i.codigo, i.titulo, i.tipo, i.endereco.bairro, i.endereco.cidade, i.ocultarEndereco ? '' : i.endereco.rua, i.condominioNome].join(' '));
      if (!norm(F.busca).split(/\s+/).every((t) => alvo.includes(t))) return false;
    }
    return true;
  }

  function ordenar(lista) {
    const p = (i) => precoFiltro(i) ?? Infinity;
    const cmp = {
      recentes: (a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)),
      menor: (a, b) => p(a) - p(b),
      maior: (a, b) => (precoFiltro(b) ?? -1) - (precoFiltro(a) ?? -1),
      area: (a, b) => (b.areaUtil || 0) - (a.areaUtil || 0),
      m2: (a, b) => (a.areaUtil ? p(a) / a.areaUtil : Infinity) - (b.areaUtil ? p(b) / b.areaUtil : Infinity),
    }[F.ordem] || (() => 0);
    return lista.slice().sort(cmp);
  }

  function contar(lista, chave) {
    const m = new Map();
    for (const i of lista) for (const v of [].concat(chave(i))) m.set(v, (m.get(v) || 0) + 1);
    return m;
  }

  /* ---------- Render dos filtros ---------- */
  function checks(el, contagens, selecionados, campo, { ordenarPorNome = false, filtroTexto = '' } = {}) {
    let entradas = [...contagens.entries()];
    // mantém visíveis os selecionados mesmo com contagem zero
    selecionados.forEach((v) => { if (!contagens.has(v)) entradas.push([v, 0]); });
    entradas.sort((a, b) => (ordenarPorNome ? a[0].localeCompare(b[0], 'pt-BR') : b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR')));
    if (filtroTexto) entradas = entradas.filter(([v]) => norm(v).includes(norm(filtroTexto)));
    if (campo === 'carac' && !caracTodas) {
      const sel = entradas.filter(([v]) => selecionados.has(v));
      const resto = entradas.filter(([v]) => !selecionados.has(v)).slice(0, Math.max(0, CARAC_VISIVEIS - sel.length));
      entradas = [...sel, ...resto];
    }
    el.innerHTML = entradas.length
      ? entradas.map(([v, n]) => `
        <label class="check ${n ? '' : 'zero'}">
          <input type="checkbox" data-campo="${campo}" value="${esc(v)}" ${selecionados.has(v) ? 'checked' : ''}>
          <span>${esc(v)}</span><small>${n}</small>
        </label>`).join('')
      : '<small style="color:var(--soft)">Nenhuma opção</small>';
  }

  function pills(el) {
    const campo = el.dataset.campo;
    const ops = [0, 1, 2, 3, 4];
    el.innerHTML = ops.map((n) => `<button type="button" data-v="${n}" aria-pressed="${F[campo] === n}">${n ? n + '+' : 'Todos'}</button>`).join('');
  }

  function presets() {
    const faixas = F.fin === 'locacao'
      ? [[null, 2000], [2000, 4000], [4000, 8000], [8000, null]]
      : [[null, 300000], [300000, 500000], [500000, 1000000], [1000000, null]];
    $('#f-presets').innerHTML = faixas.map(([a, b]) => {
      const rot = a == null ? `Até ${brlCurto(b)}` : b == null ? `Acima de ${brlCurto(a)}` : `${brlCurto(a)} – ${brlCurto(b)}`;
      return `<button type="button" data-a="${a ?? ''}" data-b="${b ?? ''}">${rot}</button>`;
    }).join('');
  }

  function renderFiltros() {
    const base = TODOS.filter((i) => i.finalidade.includes(F.fin));
    document.querySelectorAll('#f-fin button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === F.fin));
    document.querySelectorAll('.busca-tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.fin === F.fin));

    checks($('#f-tipos'), contar(TODOS.filter((i) => passa(i, 'tipos')), (i) => i.tipo), F.tipos, 'tipos');
    checks($('#f-bairros'), contar(TODOS.filter((i) => passa(i, 'bairros')), (i) => i.endereco.bairro), F.bairros, 'bairros',
      { ordenarPorNome: true, filtroTexto: $('#f-bairro-busca').value });
    checks($('#f-cidades'), contar(TODOS.filter((i) => passa(i, 'cidades')), (i) => i.endereco.cidade), F.cidades, 'cidades');
    const cc = contar(TODOS.filter((i) => passa(i, 'carac')), (i) => i.caracteristicas);
    checks($('#f-carac'), cc, F.carac, 'carac');
    $('#carac-mais').hidden = cc.size <= CARAC_VISIVEIS;
    $('#carac-mais').textContent = caracTodas ? 'Ver menos' : `Ver todas (${cc.size})`;

    document.querySelectorAll('.pills[data-campo]').forEach(pills);
    presets();
    const fmt = (v) => (v == null ? '' : Number(v).toLocaleString('pt-BR'));
    if (document.activeElement?.id !== 'f-pmin') $('#f-pmin').value = fmt(F.pmin);
    if (document.activeElement?.id !== 'f-pmax') $('#f-pmax').value = fmt(F.pmax);
    if (document.activeElement?.id !== 'f-amin') $('#f-amin').value = fmt(F.amin);
    if (document.activeElement?.id !== 'f-amax') $('#f-amax').value = fmt(F.amax);
    $('#ordem').value = F.ordem;

    // Atalhos de tipo (topo do catálogo)
    const ct = contar(base, (i) => i.tipo);
    const tipos = [...ct.entries()].sort((a, b) => b[1] - a[1]);
    $('#atalhos').innerHTML =
      `<button class="atalho" type="button" data-tipo="" aria-pressed="${!F.tipos.size}">${icone('casa', 'icon-sm')}Todos <small>${base.length}</small></button>` +
      tipos.map(([t, n]) => `<button class="atalho" type="button" data-tipo="${esc(t)}" aria-pressed="${F.tipos.size === 1 && F.tipos.has(t)}">${esc(t)} <small>${n}</small></button>`).join('');

    // Select de tipo no hero
    const sel = $('#busca-tipo');
    const atual = F.tipos.size === 1 ? [...F.tipos][0] : '';
    sel.innerHTML = '<option value="">Todos os tipos</option>' + tipos.map(([t]) => `<option ${t === atual ? 'selected' : ''}>${esc(t)}</option>`).join('');
    if (document.activeElement?.id !== 'busca-texto') $('#busca-texto').value = F.busca;
  }

  /* ---------- Chips de filtros ativos ---------- */
  function renderChips() {
    const c = [];
    const add = (rot, fn) => c.push({ rot, fn });
    if (F.busca) add(`“${F.busca}”`, () => (F.busca = ''));
    F.tipos.forEach((v) => add(v, () => F.tipos.delete(v)));
    F.bairros.forEach((v) => add(v, () => F.bairros.delete(v)));
    F.cidades.forEach((v) => add(v, () => F.cidades.delete(v)));
    F.carac.forEach((v) => add(v, () => F.carac.delete(v)));
    if (F.pmin != null || F.pmax != null) {
      add(F.pmin != null && F.pmax != null ? `${brlCurto(F.pmin)} – ${brlCurto(F.pmax)}` : F.pmin != null ? `A partir de ${brlCurto(F.pmin)}` : `Até ${brlCurto(F.pmax)}`,
        () => { F.pmin = null; F.pmax = null; });
    }
    if (F.amin != null || F.amax != null) add(`${F.amin ?? 0}–${F.amax ?? '∞'} m²`, () => { F.amin = null; F.amax = null; });
    if (F.quartos) add(`${F.quartos}+ quartos`, () => (F.quartos = 0));
    if (F.banheiros) add(`${F.banheiros}+ banheiros`, () => (F.banheiros = 0));
    if (F.vagas) add(`${F.vagas}+ vagas`, () => (F.vagas = 0));
    if (F.corretor) {
      const cor = TODOS.find((i) => i.corretor.id === F.corretor);
      add(`Corretor: ${cor ? cor.corretor.nome : '—'}`, () => (F.corretor = ''));
    }
    const el = $('#chips');
    el.innerHTML = c.map((x, n) => `<span class="chip">${esc(x.rot)}<button type="button" data-chip="${n}" aria-label="Remover filtro ${esc(x.rot)}">${icone('x', 'icon-sm')}</button></span>`).join('') +
      (c.length > 1 ? '<button class="chip-limpar" type="button" data-limpar>Limpar tudo</button>' : '');
    el.querySelectorAll('[data-chip]').forEach((b) => (b.onclick = () => { c[+b.dataset.chip].fn(); atualizar(); }));
    el.querySelector('[data-limpar]')?.addEventListener('click', limpar);
    const n = c.length;
    $('#n-filtros').textContent = n ? `(${n})` : '';
  }

  /* ---------- Resultados ---------- */
  let resultado = [];
  function renderResultados(resetarPagina = true) {
    if (resetarPagina) pagina = 1;
    resultado = ordenar(TODOS.filter((i) => passa(i)));
    const titulo = F.fin === 'locacao' ? 'Imóveis para alugar' : 'Imóveis à venda';
    $('#titulo-resultados').firstChild.nodeValue = titulo;
    $('#contagem').textContent = resultado.length ? plural(resultado.length, 'imóvel encontrado', 'imóveis encontrados') : 'Nenhum imóvel encontrado';

    const grid = $('#grid');
    if (!resultado.length) {
      grid.innerHTML = `
        <div class="vazio" style="grid-column:1/-1">
          ${icone('busca')}
          <h3>Nenhum imóvel com esses filtros</h3>
          <p>Tente remover alguns filtros — ou conte para a gente o que você procura.</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-outline" type="button" data-limpar-vazio>Limpar filtros</button>
            <a class="btn btn-wa" target="_blank" rel="noopener" href="${linkWhats(window.App.cfg().whatsapp, 'Olá! Não encontrei no site o imóvel que procuro. Podem me ajudar?')}">${icone('whatsapp', 'icon-sm')} Pedir ajuda</a>
          </div>
        </div>`;
      grid.querySelector('[data-limpar-vazio]').onclick = limpar;
      $('#mais').innerHTML = '';
      return;
    }
    const visiveis = resultado.slice(0, pagina * POR_PAGINA);
    grid.innerHTML = visiveis.map((i) => cardHtml(i, F.fin)).join('');
    const mostrando = visiveis.length;
    $('#mais').innerHTML = mostrando < resultado.length
      ? `<span>Mostrando ${mostrando} de ${resultado.length}</span>
         <div class="progresso"><i style="width:${(mostrando / resultado.length) * 100}%"></i></div>
         <button class="btn btn-outline" type="button" id="btn-mais">Carregar mais imóveis</button>`
      : (resultado.length > POR_PAGINA ? `<span>Você viu todos os ${resultado.length} imóveis</span>` : '');
    $('#btn-mais')?.addEventListener('click', () => {
      pagina++;
      const antes = grid.children.length;
      renderResultados(false);
      grid.children[antes]?.querySelector('a')?.focus({ preventScroll: true });
    });
  }

  function atualizar() {
    gravarUrl();
    renderFiltros();
    renderChips();
    renderResultados();
  }

  function limpar() {
    const fin = F.fin;
    F = PADRAO();
    F.fin = fin;
    $('#f-bairro-busca').value = '';
    atualizar();
  }

  /* ---------- Equipe ---------- */
  function renderEquipe() {
    const m = new Map();
    TODOS.forEach((i) => {
      const c = i.corretor;
      if (!c || !c.id) return;
      if (!m.has(c.id)) m.set(c.id, { ...c, n: 0 });
      m.get(c.id).n++;
    });
    const lista = [...m.values()].sort((a, b) => b.n - a.n);
    $('#lista-equipe').innerHTML = lista.map((c) => `
      <div class="membro">
        <img src="${esc(c.foto || avatarPadrao(c.nome))}" alt="Foto de ${esc(c.nome)}" loading="lazy" onerror="this.src='${avatarPadrao(c.nome)}'">
        <div>
          <strong>${esc(c.nome)}</strong>
          <small><a href="?corretor=${esc(c.id)}#imoveis" data-corretor="${esc(c.id)}" style="color:var(--blue)">${plural(c.n, 'imóvel', 'imóveis')}</a></small><br>
          ${c.whatsapp ? `<a href="${linkWhats(c.whatsapp, `Olá, ${c.nome.split(' ')[0]}! Vim pelo site da RE/MAX Agapê.`)}" target="_blank" rel="noopener">${icone('whatsapp', 'icon-sm')} WhatsApp</a>` : ''}
        </div>
      </div>`).join('');
    $('#lista-equipe').querySelectorAll('[data-corretor]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const fin = F.fin;
      F = PADRAO();
      F.corretor = a.dataset.corretor;
      // corretor pode ter só imóveis de locação
      const dele = TODOS.filter((i) => i.corretor.id === F.corretor);
      F.fin = dele.some((i) => i.finalidade.includes(fin)) ? fin : (dele[0]?.finalidade[0] || 'venda');
      atualizar();
      $('#imoveis').scrollIntoView();
    }));
  }

  /* ---------- Eventos ---------- */
  function ligar() {
    // finalidade
    const setFin = (fin) => {
      if (F.fin === fin) return;
      F.fin = fin; F.pmin = null; F.pmax = null; // faixas de preço mudam de escala
      atualizar();
    };
    $('#f-fin').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setFin(b.dataset.v); });
    document.querySelectorAll('.busca-tabs button').forEach((b) => b.addEventListener('click', () => setFin(b.dataset.fin)));

    // busca do hero
    $('#form-busca').addEventListener('submit', (e) => {
      e.preventDefault();
      F.busca = $('#busca-texto').value.trim();
      const t = $('#busca-tipo').value;
      F.tipos = new Set(t ? [t] : []);
      atualizar();
      $('#imoveis').scrollIntoView();
    });

    // checkboxes (delegação)
    $('#filtros').addEventListener('change', (e) => {
      const cb = e.target.closest('input[type=checkbox][data-campo]');
      if (!cb) return;
      const set = F[cb.dataset.campo];
      cb.checked ? set.add(cb.value) : set.delete(cb.value);
      atualizar();
    });

    // pills
    document.querySelectorAll('.pills[data-campo]').forEach((el) => el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      F[el.dataset.campo] = +b.dataset.v;
      atualizar();
    }));

    // faixas numéricas
    const numerico = (id, campo) => {
      const el = $(id);
      let t;
      el.addEventListener('input', () => {
        const d = el.value.replace(/\D/g, '');
        el.value = d ? Number(d).toLocaleString('pt-BR') : '';
        clearTimeout(t);
        t = setTimeout(() => { F[campo] = d ? Number(d) : null; atualizar(); }, 450);
      });
    };
    numerico('#f-pmin', 'pmin'); numerico('#f-pmax', 'pmax');
    numerico('#f-amin', 'amin'); numerico('#f-amax', 'amax');
    $('#f-presets').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      F.pmin = b.dataset.a ? +b.dataset.a : null;
      F.pmax = b.dataset.b ? +b.dataset.b : null;
      atualizar();
    });

    $('#f-bairro-busca').addEventListener('input', renderFiltros);
    $('#carac-mais').addEventListener('click', () => { caracTodas = !caracTodas; renderFiltros(); });
    $('#ordem').addEventListener('change', (e) => { F.ordem = e.target.value; atualizar(); });
    $('#limpar-topo').addEventListener('click', limpar);

    $('#atalhos').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tipo]');
      if (!b) return;
      F.tipos = new Set(b.dataset.tipo ? [b.dataset.tipo] : []);
      atualizar();
    });

    // gaveta de filtros no mobile
    const abrir = () => { $('#filtros').classList.add('aberto'); $('#overlay').classList.add('on'); document.body.style.overflow = 'hidden'; };
    const fechar = () => { $('#filtros').classList.remove('aberto'); if (!$('#carrinho').classList.contains('aberto')) { $('#overlay').classList.remove('on'); document.body.style.overflow = ''; } };
    $('#abrir-filtros').addEventListener('click', abrir);
    $('#fechar-filtros').addEventListener('click', fechar);
    $('#aplicar-filtros').addEventListener('click', () => { fechar(); $('#imoveis').scrollIntoView(); });
    document.addEventListener('overlay-click', fechar);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });

    ligarCards($('#grid'), (id) => porId.get(id));
    window.addEventListener('popstate', () => { lerUrl(); atualizar(); });
  }

  function skeleton() {
    $('#grid').innerHTML = Array.from({ length: 6 }, () => `
      <div class="card"><div class="card-midia sk" style="border-radius:0"></div>
        <div class="card-corpo"><div class="sk" style="height:26px;width:55%"></div><div class="sk" style="height:16px;width:85%"></div><div class="sk" style="height:14px;width:70%"></div></div></div>`).join('');
  }

  async function iniciar() {
    window.App.montarLayout(new URLSearchParams(location.search).get('fin') === 'locacao' ? 'locacao' : 'venda');
    lerUrl();
    skeleton();
    ligar();
    try {
      const r = await fetch('/api/imoveis');
      if (!r.ok) throw new Error(r.status);
      const dados = await r.json();
      TODOS = dados.imoveis;
      porId = new Map(TODOS.map((i) => [i.id, i]));
    } catch (e) {
      $('#grid').innerHTML = `<div class="vazio" style="grid-column:1/-1">${icone('busca')}<h3>Não foi possível carregar os imóveis</h3><p>Verifique sua conexão e tente novamente.</p><button class="btn btn-navy" onclick="location.reload()">Tentar de novo</button></div>`;
      $('#contagem').textContent = '';
      return;
    }

    const removidos = carrinho.sincronizar(TODOS);
    if (removidos) window.App.toast(`${plural(removidos, 'imóvel do seu carrinho saiu', 'imóveis do seu carrinho saíram')} do ar`);

    // estatísticas e destaque do hero
    $('#st-total').textContent = TODOS.length;
    $('#st-bairros').textContent = new Set(TODOS.map((i) => i.endereco.bairro)).size;
    const destaque = TODOS.filter((i) => i.fotos[0]).sort((a, b) => (b.precoVenda || 0) - (a.precoVenda || 0))[0];
    if (destaque) $('#hero-bg').style.backgroundImage = `url("${destaque.fotos[0]}")`;

    // sugestões de busca
    const sug = new Set();
    TODOS.forEach((i) => { sug.add(i.endereco.bairro); sug.add(i.endereco.cidade); });
    $('#sugestoes').innerHTML = [...sug].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((s) => `<option value="${esc(s)}">`).join('');

    // se a finalidade pedida não tem imóveis, cai para a outra
    if (!TODOS.some((i) => i.finalidade.includes(F.fin))) F.fin = F.fin === 'venda' ? 'locacao' : 'venda';

    renderEquipe();
    atualizar();
    if (location.hash === '#imoveis' && location.search) $('#imoveis').scrollIntoView();
  }

  iniciar();
})();
