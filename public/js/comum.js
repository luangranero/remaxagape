/* ==========================================================================
   Comum: ícones, formatação, carrinho, cabeçalho/rodapé, card de imóvel
   ========================================================================== */
(function () {
  'use strict';

  const CFG_PADRAO = {
    nome: 'RE/MAX Agapê',
    creci: '25367-J',
    whatsapp: '5511997598200',
    telefone: '(11) 99759-8200',
    email: 'hildakeller@remax.com.br',
    endereco: { rua: 'Rua Francisco Fett, 464', bairro: 'Vila Paulo Silas', cidade: 'São Paulo', uf: 'SP', cep: '03264-000' },
  };

  /* ---------- Ícones (traço estilo Lucide) ---------- */
  const PATHS = {
    busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    casa: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-6h4v6"/>',
    cama: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
    banho: '<path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.7 3 4 3.7 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M2 12h20"/><path d="M7 19v2M17 19v2"/>',
    carro: '<path d="M19 17h2v-4l-2.5-5.5A2 2 0 0 0 16.7 6H7.3a2 2 0 0 0-1.8 1.5L3 13v4h2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5"/>',
    area: '<path d="M3 3h18v18H3z"/><path d="M3 9h4M3 15h4M9 3v4M15 3v4"/>',
    suite: '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M10 21v-5h4v5"/>',
    sacola: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    sacolaMais: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M12 10v6M9 13h6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCirc: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    lixo: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    esq: '<path d="m15 18-6-6 6-6"/>',
    dir: '<path d="m9 18 6-6-6-6"/>',
    filtro: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    fone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    email: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    fotos: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    compartilhar: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    predio: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    usuarios: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  };
  const WA_PATH = 'M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 0 1 2.2 12C2.2 6.6 6.6 2.2 12 2.2c2.6 0 5.1 1 6.9 2.9a9.7 9.7 0 0 1 2.9 6.9c0 5.4-4.4 9.8-9.8 9.8M20.5 3.5A11.8 11.8 0 0 0 12 0C5.4 0 .1 5.3.1 11.9c0 2.1.6 4.2 1.6 6L0 24l6.3-1.6c1.8 1 3.8 1.5 5.7 1.5 6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.4-8.5';

  function icone(nome, cls = '') {
    if (nome === 'whatsapp') {
      return `<svg class="icon ${cls}" viewBox="0 0 24 24" style="fill:currentColor;stroke:none" aria-hidden="true"><path d="${WA_PATH}"/></svg>`;
    }
    return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[nome] || ''}</svg>`;
  }

  /* ---------- Utilidades ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (n) => n == null ? '' : 'R$ ' + Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  const brlCurto = (n) => {
    if (n >= 1e6) return 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi';
    if (n >= 1e3) return 'R$ ' + Math.round(n / 1e3) + ' mil';
    return brl(n);
  };
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const DIAS_NOVO = 14;
  const ehNovo = (i) => (Date.now() - new Date(i.criadoEm).getTime()) / 864e5 <= DIAS_NOVO;
  const iniciais = (nome) => String(nome || '?').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const avatarPadrao = (nome) =>
    'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#13284a"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-weight="700" font-size="15" fill="#fff">${iniciais(nome)}</text></svg>`,
    );

  /** Preço principal conforme a finalidade em foco. */
  function precoDe(i, fin) {
    if (i.ocultarPreco) return { valor: null, texto: 'Consulte' };
    const querLoc = fin === 'locacao' || (!fin && !i.precoVenda);
    if (querLoc && i.precoLocacao) return { valor: i.precoLocacao, texto: brl(i.precoLocacao), sufixo: '/mês' };
    if (i.precoVenda) return { valor: i.precoVenda, texto: brl(i.precoVenda) };
    if (i.precoLocacao) return { valor: i.precoLocacao, texto: brl(i.precoLocacao), sufixo: '/mês' };
    return { valor: null, texto: 'Consulte' };
  }

  function enderecoCurto(i) {
    const e = i.endereco || {};
    const rua = !i.ocultarEndereco && e.rua ? `${e.rua}${e.numero ? ', ' + e.numero : ''} · ` : '';
    return `${rua}${e.bairro}, ${e.cidade}/${e.uf}`;
  }

  const urlImovel = (i) => `/imovel/${i.slug}`;

  /* ---------- Configuração da unidade ---------- */
  let CFG = CFG_PADRAO;
  const cfgPronta = fetch('/api/config').then((r) => r.ok ? r.json() : CFG_PADRAO).catch(() => CFG_PADRAO).then((c) => (CFG = c));

  /* ---------- Carrinho (localStorage) ---------- */
  const CHAVE = 'remaxagape:carrinho';
  const CHAVE_NOME = 'remaxagape:nome';
  const ouvintes = new Set();

  function lerLS(k, padrao) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch { return padrao; }
  }
  function gravarLS(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* navegação privada */ }
  }

  let itens = lerLS(CHAVE, []);

  function instantaneo(i) {
    const p = precoDe(i);
    return {
      id: i.id, slug: i.slug, codigo: i.codigo, titulo: i.titulo, tipo: i.tipo,
      bairro: i.endereco.bairro, cidade: i.endereco.cidade,
      preco: p.texto + (p.sufixo || ''), foto: (i.fotos || [])[0] || '',
      corretor: i.corretor || {},
      adicionadoEm: Date.now(),
    };
  }

  const carrinho = {
    itens: () => itens.slice(),
    tem: (id) => itens.some((x) => x.id === id),
    total: () => itens.length,
    adicionar(i) {
      if (this.tem(i.id)) return;
      itens.push(instantaneo(i));
      this._salvar('add', i);
    },
    remover(id) {
      const rem = itens.find((x) => x.id === id);
      itens = itens.filter((x) => x.id !== id);
      this._salvar('rem', rem);
      return rem;
    },
    alternar(i) {
      if (this.tem(i.id)) { this.remover(i.id); return false; }
      this.adicionar(i); return true;
    },
    limpar() { itens = []; this._salvar('limpar'); },
    /** Atualiza dados (preço/corretor) e remove itens que saíram do ar. */
    sincronizar(lista) {
      const mapa = new Map(lista.map((i) => [i.id, i]));
      const antes = itens.length;
      itens = itens.filter((x) => mapa.has(x.id)).map((x) => ({ ...instantaneo(mapa.get(x.id)), adicionadoEm: x.adicionadoEm }));
      this._salvar('sync');
      return antes - itens.length;
    },
    ouvir: (fn) => ouvintes.add(fn),
    _salvar(acao, item) {
      gravarLS(CHAVE, itens);
      ouvintes.forEach((fn) => fn(acao, item));
    },
  };

  // Mantém o carrinho em sincronia entre abas
  window.addEventListener('storage', (e) => {
    if (e.key === CHAVE) { itens = lerLS(CHAVE, []); ouvintes.forEach((fn) => fn('sync')); }
  });

  /* ---------- WhatsApp ---------- */
  function linkWhats(numero, texto) {
    return `https://wa.me/${String(numero).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
  }

  function mensagemCarrinho(lista, nomeCorretor, nomeCliente) {
    const prim = nomeCorretor ? nomeCorretor.split(' ')[0] : null;
    const linhas = [
      `Olá${prim ? ', ' + prim : ''}! ${nomeCliente ? `Meu nome é ${nomeCliente}. ` : ''}Vi no site da ${CFG.nome} e tenho interesse ${lista.length > 1 ? `nestes ${lista.length} imóveis` : 'neste imóvel'}:`,
      '',
    ];
    lista.forEach((x, n) => {
      linhas.push(`${n + 1}. ${x.tipo} em ${x.bairro} — ${x.preco} (cód. ${x.codigo})`);
      linhas.push(`   ${location.origin}/imovel/${x.slug}`);
    });
    linhas.push('', lista.length > 1 ? 'Podemos agendar visitas?' : 'Podemos agendar uma visita?');
    return linhas.join('\n');
  }

  function mensagemImovel(i) {
    const p = precoDe(i);
    const prim = i.corretor && i.corretor.nome ? i.corretor.nome.split(' ')[0] : null;
    return `Olá${prim ? ', ' + prim : ''}! Vi no site da ${CFG.nome} e tenho interesse neste imóvel:\n\n` +
      `${i.tipo} em ${i.endereco.bairro} — ${p.texto}${p.sufixo || ''} (cód. ${i.codigo})\n${location.origin}${urlImovel(i)}\n\n` +
      'Ainda está disponível? Gostaria de mais informações.';
  }

  /** Agrupa itens do carrinho por corretor (cada um recebe sua lista). */
  function agruparPorCorretor(lista) {
    const grupos = new Map();
    for (const x of lista) {
      const c = x.corretor || {};
      const chave = c.whatsapp || CFG.whatsapp;
      if (!grupos.has(chave)) grupos.set(chave, { whatsapp: chave, nome: c.whatsapp ? c.nome : CFG.nome, foto: c.whatsapp ? c.foto : '/img/favicon.webp', itens: [] });
      grupos.get(chave).itens.push(x);
    }
    return [...grupos.values()];
  }

  /* ---------- Toast ---------- */
  let toastEl, toastTimer;
  function toast(msg, acao) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = `<span>${esc(msg)}</span>` + (acao ? `<button type="button">${esc(acao.rotulo)}</button>` : '');
    if (acao) toastEl.querySelector('button').onclick = () => { acao.fn(); toastEl.classList.remove('on'); };
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 3800);
  }

  /* ---------- Cabeçalho, rodapé e drawer do carrinho ---------- */
  function montarLayout(ativo) {
    const header = document.createElement('header');
    header.className = 'header';
    header.innerHTML = `
      <div class="container">
        <a class="logo" href="/" aria-label="${esc(CFG_PADRAO.nome)} — início"><img src="/img/logo-agape.webp" alt="RE/MAX Agapê" width="168" height="101"></a>
        <nav class="nav" aria-label="Principal">
          <a href="/?fin=venda#imoveis" class="${ativo === 'venda' ? 'ativo' : ''}">Comprar</a>
          <a href="/?fin=locacao#imoveis" class="${ativo === 'locacao' ? 'ativo' : ''}">Alugar</a>
          <a href="/#equipe">Corretores</a>
          <a href="/#sobre">Sobre</a>
          <a href="#contato">Contato</a>
        </nav>
        <div class="header-acoes">
          <a class="btn btn-wa btn-sm" id="wa-header" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${icone('whatsapp', 'icon-sm')}<span>Fale conosco</span></a>
          <button class="btn btn-outline cart-btn" id="abrir-carrinho" type="button" aria-label="Abrir carrinho">
            ${icone('sacola')}<span>Carrinho</span><b class="cart-badge" id="cart-badge" hidden>0</b>
          </button>
        </div>
      </div>`;
    document.body.prepend(header);

    const footer = document.createElement('footer');
    footer.className = 'footer';
    footer.id = 'contato';
    document.body.appendChild(footer);

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'overlay';
    document.body.appendChild(overlay);

    const drawer = document.createElement('aside');
    drawer.className = 'carrinho';
    drawer.id = 'carrinho';
    drawer.setAttribute('aria-label', 'Carrinho de imóveis');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(drawer);

    const flut = document.createElement('a');
    flut.className = 'wa-flutuante';
    flut.target = '_blank';
    flut.rel = 'noopener';
    flut.setAttribute('aria-label', 'Conversar no WhatsApp');
    flut.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${WA_PATH}"/></svg>`;
    document.body.appendChild(flut);

    const spanCarrinho = header.querySelector('#abrir-carrinho span');
    const ajustarRotulo = () => { spanCarrinho.style.display = window.innerWidth < 520 ? 'none' : ''; };
    ajustarRotulo();
    window.addEventListener('resize', ajustarRotulo);

    header.querySelector('#abrir-carrinho').onclick = abrirCarrinho;
    overlay.addEventListener('click', () => { fecharCarrinho(); document.dispatchEvent(new CustomEvent('overlay-click')); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharCarrinho(); });

    cfgPronta.then(() => {
      const msg = `Olá! Vim pelo site da ${CFG.nome} e gostaria de ajuda para encontrar um imóvel.`;
      header.querySelector('#wa-header').href = linkWhats(CFG.whatsapp, msg);
      flut.href = linkWhats(CFG.whatsapp, msg);
      renderRodape(footer);
    });

    renderCarrinho();
    carrinho.ouvir((acao) => {
      renderCarrinho();
      if (acao === 'add') {
        const b = document.getElementById('cart-badge');
        b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
      }
    });
  }

  function renderRodape(el) {
    const e = CFG.endereco;
    el.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <a class="logo-branco" href="/"><img src="/img/logo-agape.webp" alt="RE/MAX Agapê" width="168" height="101"></a>
            <p style="max-width:360px;margin:0">Há mais de 30 anos realizando sonhos no Parque São Lucas e região. Nosso negócio é com pessoas, e não com propriedades.</p>
          </div>
          <div>
            <h4>Contato</h4>
            <ul>
              <li>${icone('whatsapp', 'icon-sm')}<a href="${linkWhats(CFG.whatsapp, 'Olá! Vim pelo site.')}" target="_blank" rel="noopener">${esc(CFG.telefone)}</a></li>
              <li>${icone('email', 'icon-sm')}<a href="mailto:${esc(CFG.email)}">${esc(CFG.email)}</a></li>
              <li>${icone('pin', 'icon-sm')}<span>${esc(e.rua)} — ${esc(e.bairro)}<br>${esc(e.cidade)}/${esc(e.uf)} · CEP ${esc(e.cep)}</span></li>
            </ul>
          </div>
          <div>
            <h4>Navegue</h4>
            <ul>
              <li><a href="/?fin=venda#imoveis">Imóveis à venda</a></li>
              <li><a href="/?fin=locacao#imoveis">Imóveis para alugar</a></li>
              <li><a href="${linkWhats(CFG.whatsapp, 'Olá! Gostaria de anunciar meu imóvel com a RE/MAX Agapê.')}" target="_blank" rel="noopener">Anuncie seu imóvel</a></li>
              <li><a href="/#equipe">Nossos corretores</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-base">
          <span>© ${new Date().getFullYear()} ${esc(CFG.nome)} · CRECI ${esc(CFG.creci)}</span>
          <span>Cada escritório RE/MAX é independente e operado de forma autônoma.</span>
        </div>
      </div>`;
  }

  function abrirCarrinho() {
    const d = document.getElementById('carrinho');
    d.classList.add('aberto');
    d.setAttribute('aria-hidden', 'false');
    document.getElementById('overlay').classList.add('on');
    document.body.style.overflow = 'hidden';
    setTimeout(() => d.querySelector('.icone-btn')?.focus(), 50);
  }
  function fecharCarrinho() {
    const d = document.getElementById('carrinho');
    if (!d || !d.classList.contains('aberto')) return;
    d.classList.remove('aberto');
    d.setAttribute('aria-hidden', 'true');
    document.getElementById('overlay').classList.remove('on');
    document.body.style.overflow = '';
  }

  function renderCarrinho() {
    const d = document.getElementById('carrinho');
    if (!d) return;
    const lista = carrinho.itens();
    const badge = document.getElementById('cart-badge');
    badge.textContent = lista.length;
    badge.hidden = !lista.length;

    const topo = `
      <div class="carrinho-topo">
        <div><h2>Meu carrinho</h2><p>${lista.length ? plural(lista.length, 'imóvel selecionado', 'imóveis selecionados') : 'Imóveis que você quer conhecer'}</p></div>
        <button class="icone-btn" type="button" data-fechar aria-label="Fechar carrinho">${icone('x')}</button>
      </div>`;

    if (!lista.length) {
      d.innerHTML = topo + `
        <div class="carrinho-corpo"><div class="carrinho-vazio">
          ${icone('sacola')}
          <h3>Seu carrinho está vazio</h3>
          <p>Adicione os imóveis que você gostou e envie todos de uma vez para o corretor pelo WhatsApp.</p>
          <a class="btn btn-navy" href="/#imoveis" data-fechar>Ver imóveis</a>
        </div></div>`;
    } else {
      const grupos = agruparPorCorretor(lista);
      const nome = lerLS(CHAVE_NOME, '');
      d.innerHTML = topo + `
        <div class="carrinho-corpo">
          ${grupos.map((g, gi) => `
            <section class="grupo-corretor">
              <div class="grupo-cab">
                <img src="${esc(g.foto || avatarPadrao(g.nome))}" alt="" loading="lazy" onerror="this.src='${avatarPadrao(g.nome)}'">
                <div><strong>${esc(g.nome)}</strong><small>${grupos.length > 1 ? 'Corretor responsável por ' + plural(g.itens.length, 'imóvel', 'imóveis') : 'Corretor responsável'}</small></div>
              </div>
              ${g.itens.map((x) => `
                <div class="item">
                  <a href="/imovel/${esc(x.slug)}"><img src="${esc(x.foto)}" alt="" loading="lazy"></a>
                  <div class="item-info">
                    <a href="/imovel/${esc(x.slug)}">${esc(x.tipo)} em ${esc(x.bairro)}</a>
                    <div class="preco">${esc(x.preco)}</div>
                    <small>Cód. ${esc(x.codigo)} · ${esc(x.cidade)}</small>
                  </div>
                  <button class="remover" type="button" data-remover="${esc(x.id)}" aria-label="Remover do carrinho">${icone('lixo', 'icon-sm')}</button>
                </div>`).join('')}
              <button class="btn btn-wa btn-block" type="button" data-enviar="${gi}">
                ${icone('whatsapp', 'icon-sm')} ${grupos.length > 1 ? 'Enviar para ' + esc(g.nome.split(' ')[0]) : 'Enviar pelo WhatsApp'}
              </button>
            </section>`).join('')}
        </div>
        <div class="carrinho-rodape">
          <label for="nome-cliente">Seu nome (opcional)</label>
          <input class="input" id="nome-cliente" autocomplete="name" placeholder="Como o corretor pode te chamar?" value="${esc(nome)}">
          ${grupos.length > 1
            ? `<button class="btn btn-navy btn-block" type="button" data-enviar-todos>${icone('whatsapp', 'icon-sm')} Enviar tudo para a imobiliária</button>`
            : ''}
          <button class="btn btn-ghost btn-block btn-sm" type="button" data-limpar style="margin-top:6px">Esvaziar carrinho</button>
          <p class="nota">${grupos.length > 1 ? 'Seus imóveis são atendidos por corretores diferentes — envie para cada um ou para a imobiliária.' : 'Você será direcionado ao WhatsApp com a lista pronta.'}</p>
        </div>`;

      const nomeInput = d.querySelector('#nome-cliente');
      nomeInput.addEventListener('input', () => gravarLS(CHAVE_NOME, nomeInput.value.trim()));
      d.querySelectorAll('[data-enviar]').forEach((b) => b.addEventListener('click', () => {
        const g = grupos[+b.dataset.enviar];
        window.open(linkWhats(g.whatsapp, mensagemCarrinho(g.itens, g.whatsapp === CFG.whatsapp ? null : g.nome, nomeInput.value.trim())), '_blank', 'noopener');
      }));
      d.querySelector('[data-enviar-todos]')?.addEventListener('click', () => {
        window.open(linkWhats(CFG.whatsapp, mensagemCarrinho(lista, null, nomeInput.value.trim())), '_blank', 'noopener');
      });
      d.querySelector('[data-limpar]').addEventListener('click', () => {
        const backup = carrinho.itens();
        carrinho.limpar();
        toast('Carrinho esvaziado', { rotulo: 'Desfazer', fn: () => { itens = backup; carrinho._salvar('sync'); } });
      });
      d.querySelectorAll('[data-remover]').forEach((b) => b.addEventListener('click', () => {
        const rem = carrinho.remover(b.dataset.remover);
        if (rem) toast('Imóvel removido', { rotulo: 'Desfazer', fn: () => { itens.push(rem); carrinho._salvar('add'); } });
      }));
    }
    d.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', fecharCarrinho));
  }

  /* ---------- Card de imóvel ---------- */
  function specsHtml(i) {
    const s = [];
    if (i.areaUtil) s.push(`<span class="spec" title="Área útil">${icone('area')}${i.areaUtil.toLocaleString('pt-BR')} m²</span>`);
    if (i.quartos) s.push(`<span class="spec" title="Quartos">${icone('cama')}${i.quartos}</span>`);
    if (i.banheiros) s.push(`<span class="spec" title="Banheiros">${icone('banho')}${i.banheiros}</span>`);
    if (i.vagas) s.push(`<span class="spec" title="Vagas">${icone('carro')}${i.vagas}</span>`);
    return s.join('');
  }

  function cardHtml(i, fin) {
    const p = precoDe(i, fin);
    const fotos = i.fotos || [];
    const taxas = [];
    if (i.condominio) taxas.push(`Cond. ${brl(i.condominio)}`);
    if (i.iptu) taxas.push(`IPTU ${brl(i.iptu)}`);
    const noCarrinho = carrinho.tem(i.id);
    const selos = [];
    if (ehNovo(i)) selos.push('<span class="selo novo">Novo</span>');
    if (i.finalidade.includes('locacao') && fin !== 'locacao') selos.push('<span class="selo loc">Aluguel</span>');
    selos.push(`<span class="selo">${esc(i.tipo)}</span>`);
    const c = i.corretor || {};
    return `
      <article class="card" data-id="${esc(i.id)}">
        <div class="card-midia" data-fotos='${esc(JSON.stringify(fotos))}' data-idx="0">
          <a href="${urlImovel(i)}" aria-label="${esc(i.titulo)}">
            <img src="${esc(fotos[0] || '')}" alt="${esc(i.titulo)}" loading="lazy" decoding="async">
          </a>
          ${fotos.length > 1 ? `
            <button class="seta ant" type="button" aria-label="Foto anterior">${icone('esq', 'icon-sm')}</button>
            <button class="seta prox" type="button" aria-label="Próxima foto">${icone('dir', 'icon-sm')}</button>
            <div class="pontos">${fotos.slice(0, 5).map((_, n) => `<i class="${n === 0 ? 'on' : ''}"></i>`).join('')}</div>` : ''}
          <div class="selos">${selos.join('')}</div>
          <button class="card-add" type="button" aria-pressed="${noCarrinho}" aria-label="${noCarrinho ? 'Remover do carrinho' : 'Adicionar ao carrinho'}" title="${noCarrinho ? 'No carrinho' : 'Adicionar ao carrinho'}">
            ${icone(noCarrinho ? 'check' : 'sacolaMais')}
          </button>
        </div>
        <div class="card-corpo">
          <div class="card-preco">${p.texto}${p.sufixo ? `<small>${p.sufixo}</small>` : ''}</div>
          ${taxas.length ? `<div class="card-taxas">${taxas.join(' · ')}</div>` : ''}
          <a class="card-titulo" href="${urlImovel(i)}">${esc(i.tipo)}${i.quartos ? ` com ${plural(i.quartos, 'quarto', 'quartos')}` : ''} em ${esc(i.endereco.bairro)}</a>
          <div class="card-end">${icone('pin', 'icon-sm')}<span>${esc(enderecoCurto(i))}</span></div>
          <div class="specs">${specsHtml(i)}</div>
          <div class="card-rodape">
            <div class="corretor-mini">
              <img src="${esc(c.foto || avatarPadrao(c.nome))}" alt="" loading="lazy" onerror="this.src='${avatarPadrao(c.nome)}'">
              <span>${esc(c.nome || '')}</span>
            </div>
            <span class="cod">Cód. ${esc(i.codigo)}</span>
          </div>
        </div>
      </article>`;
  }

  /** Liga eventos de carrossel e botão de carrinho em um contêiner de cards. */
  function ligarCards(container, obterImovel) {
    container.addEventListener('click', (e) => {
      const seta = e.target.closest('.seta');
      if (seta) {
        e.preventDefault();
        const midia = seta.closest('.card-midia');
        const fotos = JSON.parse(midia.dataset.fotos);
        let idx = (+midia.dataset.idx + (seta.classList.contains('prox') ? 1 : -1) + fotos.length) % fotos.length;
        midia.dataset.idx = idx;
        midia.querySelector('img').src = fotos[idx];
        const pts = midia.querySelectorAll('.pontos i');
        const ativo = Math.min(idx, pts.length - 1);
        pts.forEach((p, n) => p.classList.toggle('on', n === ativo));
        // pré-carrega a próxima
        if (fotos[idx + 1]) { const im = new Image(); im.src = fotos[idx + 1]; }
        return;
      }
      const add = e.target.closest('.card-add');
      if (add) {
        e.preventDefault();
        const card = add.closest('.card');
        const i = obterImovel(card.dataset.id);
        if (!i) return;
        const agora = carrinho.alternar(i);
        atualizarBotaoCard(add, agora);
        if (agora) toast('Adicionado ao carrinho', { rotulo: 'Ver carrinho', fn: abrirCarrinho });
        else toast('Removido do carrinho');
      }
    });
    // swipe no celular
    let x0 = null;
    container.addEventListener('touchstart', (e) => { if (e.target.closest('.card-midia')) x0 = e.touches[0].clientX; }, { passive: true });
    container.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const midia = e.target.closest('.card-midia');
      x0 = null;
      if (!midia || Math.abs(dx) < 40) return;
      midia.querySelector(dx < 0 ? '.seta.prox' : '.seta.ant')?.click();
    });
    // reflete mudanças do carrinho (ex.: remoção pelo drawer)
    carrinho.ouvir(() => {
      container.querySelectorAll('.card').forEach((card) => {
        const b = card.querySelector('.card-add');
        if (b) atualizarBotaoCard(b, carrinho.tem(card.dataset.id));
      });
    });
  }

  function atualizarBotaoCard(b, no) {
    b.setAttribute('aria-pressed', no);
    b.setAttribute('aria-label', no ? 'Remover do carrinho' : 'Adicionar ao carrinho');
    b.title = no ? 'No carrinho' : 'Adicionar ao carrinho';
    b.innerHTML = icone(no ? 'check' : 'sacolaMais');
  }

  window.App = {
    icone, esc, brl, brlCurto, plural, ehNovo, precoDe, enderecoCurto, urlImovel, avatarPadrao,
    carrinho, linkWhats, mensagemImovel, toast,
    montarLayout, abrirCarrinho, fecharCarrinho,
    cardHtml, specsHtml, ligarCards,
    cfg: () => CFG, cfgPronta,
  };
})();
