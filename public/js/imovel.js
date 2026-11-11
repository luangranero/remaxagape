/* ==========================================================================
   Página do imóvel: galeria, ficha, carrinho, WhatsApp, semelhantes
   ========================================================================== */
(function () {
  'use strict';
  const { icone, esc, brl, plural, ehNovo, precoDe, enderecoCurto, cardHtml, ligarCards, carrinho, linkWhats, mensagemImovel, avatarPadrao, toast, abrirCarrinho } = window.App;
  const $ = (s) => document.querySelector(s);

  let I = null;
  let fotoAtual = 0;

  function ficha(i) {
    const itens = [
      i.areaUtil && ['area', `${i.areaUtil.toLocaleString('pt-BR')} m²`, 'Área útil'],
      i.areaTotal && i.areaTotal !== i.areaUtil && ['area', `${i.areaTotal.toLocaleString('pt-BR')} m²`, 'Área total'],
      i.quartos && ['cama', i.quartos, plural(i.quartos, 'Quarto', 'Quartos').replace(/^\d+ /, '')],
      i.suites && ['suite', i.suites, i.suites === 1 ? 'Suíte' : 'Suítes'],
      i.banheiros && ['banho', i.banheiros, i.banheiros === 1 ? 'Banheiro' : 'Banheiros'],
      i.vagas != null && ['carro', i.vagas || '—', i.vagas === 1 ? 'Vaga' : 'Vagas'],
      i.andar && ['predio', `${i.andar}º`, 'Andar'],
      i.anoConstrucao && ['calendario', i.anoConstrucao, 'Construção'],
    ].filter(Boolean);
    return itens.map(([ic, v, r]) => `<div>${icone(ic)}<strong>${esc(v)}</strong><small>${esc(r)}</small></div>`).join('');
  }

  function mapa(i) {
    const e = i.endereco;
    if (i.ocultarEndereco || e.lat == null || e.lng == null) return '';
    const d = 0.006;
    const bbox = [e.lng - d, e.lat - d * 0.7, e.lng + d, e.lat + d * 0.7].join(',');
    return `
      <div class="bloco">
        <h2>Localização</h2>
        <iframe class="mapa" loading="lazy" title="Mapa da localização do imóvel"
          src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${e.lat},${e.lng}"></iframe>
        <p style="margin:10px 0 0;font-size:13.5px;color:var(--muted)">
          ${esc(enderecoCurto(i))} ·
          <a style="color:var(--blue);font-weight:600" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}">Abrir no Google Maps</a>
        </p>
      </div>`;
  }

  function botaoCarrinho(no, extraCls = '') {
    return `<button class="btn ${no ? 'btn-navy' : 'btn-outline'} btn-block btn-cart ${extraCls}" type="button" data-carrinho aria-pressed="${no}">
      ${icone(no ? 'check' : 'sacolaMais')} ${no ? 'No carrinho' : 'Adicionar ao carrinho'}</button>`;
  }

  function render(i) {
    const p = precoDe(i);
    const fotos = i.fotos || [];
    const no = carrinho.tem(i.id);
    const c = i.corretor || {};
    const wa = linkWhats(c.whatsapp || window.App.cfg().whatsapp, mensagemImovel(i));
    const fin = i.finalidade.includes('venda') ? 'venda' : 'locacao';
    const selos = [
      ehNovo(i) && '<span class="selo novo">Novo</span>',
      i.finalidade.includes('venda') && '<span class="selo">Venda</span>',
      i.finalidade.includes('locacao') && '<span class="selo loc">Aluguel</span>',
      `<span class="selo">${esc(i.tipo)}</span>`,
    ].filter(Boolean).join('');

    const outrosPrecos = [];
    if (i.precoVenda && i.precoLocacao) outrosPrecos.push(['Aluguel', brl(i.precoLocacao) + '/mês']);
    if (i.condominio) outrosPrecos.push(['Condomínio', brl(i.condominio) + '/mês']);
    if (i.iptu) outrosPrecos.push(['IPTU', brl(i.iptu)]);
    if (i.precoVenda && i.areaUtil && !i.ocultarPreco) outrosPrecos.push(['Valor do m²', brl(i.precoVenda / i.areaUtil)]);

    document.title = `${i.titulo} | RE/MAX Agapê`;

    $('#conteudo').innerHTML = `
      <nav class="migalhas" aria-label="Você está em">
        <a href="/">Início</a>${icone('dir', 'icon-sm')}
        <a href="/?fin=${fin}#imoveis">${fin === 'venda' ? 'Comprar' : 'Alugar'}</a>${icone('dir', 'icon-sm')}
        <a href="/?fin=${fin}&tipo=${encodeURIComponent(i.tipo)}#imoveis">${esc(i.tipo)}</a>${icone('dir', 'icon-sm')}
        <a href="/?fin=${fin}&bairro=${encodeURIComponent(i.endereco.bairro)}#imoveis">${esc(i.endereco.bairro)}</a>
      </nav>

      <div class="galeria">
        ${fotos.slice(0, 5).map((f, n) => `<button type="button" data-foto="${n}" aria-label="Ampliar foto ${n + 1}"><img src="${esc(f)}" alt="${esc(i.titulo)} — foto ${n + 1}" ${n ? 'loading="lazy"' : 'fetchpriority="high"'}></button>`).join('')}
        ${fotos.length ? `<button class="ver-todas" type="button" data-foto="0">${icone('fotos', 'icon-sm')} Ver ${plural(fotos.length, 'foto', 'fotos')}</button>` : ''}
      </div>

      <div class="imovel-layout">
        <div>
          <div class="imovel-cab">
            <div class="selos">${selos}</div>
            <h1>${esc(i.titulo)}</h1>
            <div class="end">${icone('pin', 'icon-sm')}<span>${esc(enderecoCurto(i))}</span></div>
            ${i.condominioNome ? `<div class="end" style="margin-top:4px">${icone('predio', 'icon-sm')}<span>${esc(i.condominioNome)}</span></div>` : ''}
          </div>

          <div class="ficha">${ficha(i)}</div>

          <div class="bloco">
            <h2>Sobre o imóvel</h2>
            <div class="descricao" id="descricao">${esc(i.descricao || 'Fale com o corretor para mais informações sobre este imóvel.')}</div>
            <button class="ver-mais" type="button" id="desc-mais" hidden>Ler descrição completa</button>
          </div>

          ${i.caracteristicas.length ? `
          <div class="bloco">
            <h2>Características</h2>
            <ul class="carac">${i.caracteristicas.map((x) => `<li>${icone('checkCirc')}${esc(x)}</li>`).join('')}</ul>
          </div>` : ''}

          ${mapa(i)}

          <div class="bloco">
            <h2>Detalhes</h2>
            <dl class="dl">
              <div><dt>Código</dt><dd>${esc(i.codigo)}</dd></div>
              <div><dt>Tipo</dt><dd>${esc(i.tipo)}</dd></div>
              ${i.uso ? `<div><dt>Uso</dt><dd>${esc(i.uso.charAt(0) + i.uso.slice(1).toLowerCase())}</dd></div>` : ''}
              <div><dt>Bairro</dt><dd>${esc(i.endereco.bairro)}</dd></div>
              <div><dt>Cidade</dt><dd>${esc(i.endereco.cidade)}/${esc(i.endereco.uf)}</dd></div>
              <div><dt>Atualizado em</dt><dd>${new Date(i.atualizadoEm).toLocaleDateString('pt-BR')}</dd></div>
            </dl>
          </div>
        </div>

        <aside>
          <div class="caixa-preco">
            <div class="rot">${i.finalidade.includes('venda') ? 'Valor de venda' : 'Valor do aluguel'}</div>
            <div class="valor">${p.texto}${p.sufixo ? `<small style="font-size:16px;color:var(--muted)">${p.sufixo}</small>` : ''}</div>
            ${outrosPrecos.length ? `<div class="taxas">${outrosPrecos.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>` : ''}
            <a class="btn btn-wa btn-block" href="${wa}" target="_blank" rel="noopener">${icone('whatsapp', 'icon-sm')} Falar com o corretor</a>
            <div id="slot-carrinho">${botaoCarrinho(no)}</div>
            <div class="acoes-sec">
              <button class="btn btn-ghost btn-sm" type="button" id="compartilhar">${icone('compartilhar', 'icon-sm')} Compartilhar</button>
              <button class="btn btn-ghost btn-sm" type="button" id="copiar">${icone('link', 'icon-sm')} Copiar link</button>
            </div>
            <div class="corretor-card">
              <img src="${esc(c.foto || avatarPadrao(c.nome))}" alt="Foto de ${esc(c.nome)}" onerror="this.src='${avatarPadrao(c.nome)}'">
              <div><small>Corretor responsável</small><strong>${esc(c.nome || 'RE/MAX Agapê')}</strong></div>
            </div>
          </div>
        </aside>
      </div>`;

    // barra fixa no celular
    let barra = document.querySelector('.barra-mobile');
    if (!barra) { barra = document.createElement('div'); barra.className = 'barra-mobile'; document.body.appendChild(barra); }
    barra.innerHTML = `<div id="slot-carrinho-m" style="flex:1">${botaoCarrinho(no)}</div><a class="btn btn-wa" href="${wa}" target="_blank" rel="noopener">${icone('whatsapp', 'icon-sm')} WhatsApp</a>`;
    document.body.classList.add('tem-barra');

    // descrição longa recolhida
    const desc = $('#descricao');
    if (desc.scrollHeight > 300) {
      desc.classList.add('recolhida');
      const b = $('#desc-mais');
      b.hidden = false;
      b.onclick = () => { const r = desc.classList.toggle('recolhida'); b.textContent = r ? 'Ler descrição completa' : 'Mostrar menos'; };
    }

    ligar();
  }

  function atualizarBotoesCarrinho() {
    const no = carrinho.tem(I.id);
    $('#slot-carrinho').innerHTML = botaoCarrinho(no);
    const m = $('#slot-carrinho-m');
    if (m) m.innerHTML = botaoCarrinho(no);
  }

  function ligar() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-carrinho]')) return;
      const agora = carrinho.alternar(I);
      atualizarBotoesCarrinho();
      if (agora) toast('Adicionado ao carrinho', { rotulo: 'Ver carrinho', fn: abrirCarrinho });
      else toast('Removido do carrinho');
    });
    carrinho.ouvir(atualizarBotoesCarrinho);

    document.querySelectorAll('[data-foto]').forEach((b) => b.addEventListener('click', () => abrirLightbox(+b.dataset.foto)));

    const url = location.origin + location.pathname;
    $('#copiar').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); toast('Link copiado'); }
      catch { prompt('Copie o link:', url); }
    });
    const comp = $('#compartilhar');
    if (navigator.share) {
      comp.addEventListener('click', () => navigator.share({ title: I.titulo, text: `${I.tipo} em ${I.endereco.bairro}`, url }).catch(() => {}));
    } else {
      // sem Web Share API (desktop): compartilha pelo WhatsApp escolhendo o contato
      comp.addEventListener('click', () => window.open(`https://wa.me/?text=${encodeURIComponent(`${I.titulo}\n${url}`)}`, '_blank', 'noopener'));
    }
  }

  /* ---------- Lightbox ---------- */
  function abrirLightbox(n) {
    const lb = $('#lightbox');
    lb.classList.add('on');
    document.body.style.overflow = 'hidden';
    $('#lb-tiras').innerHTML = I.fotos.map((f, k) => `<button type="button" data-k="${k}" aria-label="Foto ${k + 1}"><img src="${esc(f)}" alt="" loading="lazy"></button>`).join('');
    $('#lb-tiras').onclick = (e) => { const b = e.target.closest('[data-k]'); if (b) irPara(+b.dataset.k); };
    irPara(n);
    $('#lb-fechar').focus();
  }
  function fecharLightbox() {
    $('#lightbox').classList.remove('on');
    document.body.style.overflow = '';
  }
  function irPara(n) {
    const total = I.fotos.length;
    fotoAtual = (n + total) % total;
    $('#lb-img').src = I.fotos[fotoAtual];
    $('#lb-img').alt = `${I.titulo} — foto ${fotoAtual + 1}`;
    $('#lb-contador').textContent = `${fotoAtual + 1} / ${total}`;
    document.querySelectorAll('#lb-tiras button').forEach((b, k) => b.classList.toggle('on', k === fotoAtual));
    document.querySelector('#lb-tiras button.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    [fotoAtual + 1, fotoAtual - 1].forEach((k) => { if (I.fotos[(k + total) % total]) new Image().src = I.fotos[(k + total) % total]; });
  }
  $('#lb-fechar').addEventListener('click', fecharLightbox);
  $('#lb-ant').addEventListener('click', () => irPara(fotoAtual - 1));
  $('#lb-prox').addEventListener('click', () => irPara(fotoAtual + 1));
  document.addEventListener('keydown', (e) => {
    if (!$('#lightbox').classList.contains('on')) return;
    if (e.key === 'Escape') fecharLightbox();
    if (e.key === 'ArrowLeft') irPara(fotoAtual - 1);
    if (e.key === 'ArrowRight') irPara(fotoAtual + 1);
  });
  let x0 = null;
  $('#lightbox').addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true });
  $('#lightbox').addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) irPara(fotoAtual + (dx < 0 ? 1 : -1));
  });

  /* ---------- Semelhantes ---------- */
  async function semelhantes(i) {
    try {
      const r = await fetch('/api/imoveis');
      const { imoveis } = await r.json();
      const fin = i.finalidade[0];
      const ref = i.precoVenda || i.precoLocacao || 0;
      const nota = (x) =>
        (x.tipo === i.tipo ? 3 : 0) + (x.endereco.bairro === i.endereco.bairro ? 3 : 0) +
        (x.endereco.cidade === i.endereco.cidade ? 1 : 0) +
        (ref ? Math.max(0, 2 - Math.abs((x.precoVenda || x.precoLocacao || 0) - ref) / ref * 4) : 0);
      const lista = imoveis
        .filter((x) => x.id !== i.id && x.finalidade.includes(fin))
        .sort((a, b) => nota(b) - nota(a))
        .slice(0, 4);
      if (!lista.length) return;
      const sec = document.createElement('section');
      sec.className = 'container semelhantes';
      sec.innerHTML = `<h2>Imóveis semelhantes</h2><div class="grid" id="grid-sem">${lista.map((x) => cardHtml(x, fin)).join('')}</div>`;
      document.querySelector('main').after(sec);
      const mapa = new Map(lista.map((x) => [x.id, x]));
      ligarCards(sec.querySelector('#grid-sem'), (id) => mapa.get(id));
    } catch { /* opcional */ }
  }

  function naoEncontrado() {
    $('#conteudo').innerHTML = `
      <div class="vazio" style="margin:48px 0">
        ${icone('casa')}
        <h3>Este imóvel não está mais disponível</h3>
        <p>Ele pode ter sido vendido ou alugado. Veja outras opções parecidas no nosso catálogo.</p>
        <a class="btn btn-navy" href="/#imoveis">Ver imóveis disponíveis</a>
      </div>`;
  }

  async function iniciar() {
    window.App.montarLayout();
    const slug = decodeURIComponent(location.pathname.replace(/^\/imovel\//, '').replace(/\/$/, ''));
    try {
      let r = await fetch('/api/imoveis/' + encodeURIComponent(slug));
      if (r.status === 404) r = await fetch('/api/imoveis/' + encodeURIComponent(slug.split('-').pop()));
      if (!r.ok) return naoEncontrado();
      I = await r.json();
    } catch {
      return naoEncontrado();
    }
    await window.App.cfgPronta;
    render(I);
    semelhantes(I);
  }

  iniciar();
})();
