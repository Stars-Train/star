/* ═══════════════════════════════════════════════════════════
   Classes automáticas — Path of Stars
   Usado em: index.html (fichas), npcs.html, segredos.html
   Depende de: classes_data.js (CLASSES_DATA / MULTICLASSES_DATA)

   Ao escolher Classe / Classe 2 (pela lista ou digitando o nome exato):
   • atributos entram somando/subtraindo nos campos da ficha
   • perícias entram no campo "Perícia" (não mexe em Especiais/Supremas)
   • habilidades entram na aba Habilidades
   • se houver duas classes, a Multiclasse é preenchida sozinha e
     substitui os atributos/perícias das duas classes (a multiclasse
     já é a soma só dos bônus positivos das duas)
   Fichas antigas não mudam: nada é aplicado até a classe ser
   escolhida/alterada de novo.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.SALA && window.SALA.classes === false) return;
  if (sessionStorage.getItem('tipo') !== 'mestre') return;
  if (!window.CLASSES_DATA) return;

  var CLASSES = window.CLASSES_DATA;
  var MC = window.MULTICLASSES_DATA || {};

  var CAMPOS = {
    forca: 'f_forca', resist: 'f_resist', agilidade: 'f_agilidade',
    velocidade: 'f_velocidade', qi: 'f_qi', stamina: 'f_stamina',
    combate: 'f_combate', vida: 'f_vida_num'
  };
  var ROTULOS = {
    forca: 'Força', resist: 'Resistência', agilidade: 'Agilidade',
    velocidade: 'Velocidade', qi: 'QI', stamina: 'Stamina',
    combate: 'Combate', vida: 'HP', energia: 'Energia Criada'
  };
  var ORDEM = ['forca', 'resist', 'agilidade', 'velocidade', 'qi', 'stamina', 'combate', 'vida', 'energia'];

  function vazio() { return { c1: '', c2: '', bonus: {}, pericia: '', mc: '', habs: [] }; }
  var S = vazio();

  function $(id) { return document.getElementById(id); }
  function semAcento(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function achar(nome) {
    var n = semAcento(nome);
    if (!n) return null;
    for (var i = 0; i < CLASSES.length; i++) if (semAcento(CLASSES[i].n) === n) return CLASSES[i];
    return null;
  }
  function fmtAttrs(a) {
    return ORDEM.filter(function (k) { return a[k]; })
      .map(function (k) { return (a[k] > 0 ? '+' : '') + a[k] + ' ' + ROTULOS[k]; }).join(' | ');
  }
  function mergePericias(listas) {
    var mapa = {}, ordem = [];
    listas.forEach(function (l) {
      l.forEach(function (p) {
        var nome = p[0], v = p[1] || 0;
        if (!(nome in mapa)) { mapa[nome] = 0; ordem.push(nome); }
        mapa[nome] += v;
      });
    });
    return ordem.map(function (n) { return (mapa[n] > 0 ? '+' + mapa[n] + ' ' : '') + n; }).join(' | ');
  }

  /* ── calcula o que as classes escolhidas dão ── */
  function calcular() {
    var k1 = achar(S.c1), k2 = achar(S.c2);
    var res = { attrs: {}, pericia: '', habs: [], mcTexto: '', mcNome: '', modo: '' };
    var conhecidas = [k1, k2].filter(Boolean);
    if (!conhecidas.length) return res;

    var mc = (k1 && k2) ? (MC[k1.n + '|' + k2.n] || MC[k2.n + '|' + k1.n]) : null;
    conhecidas.forEach(function (k) {
      res.habs.push({ nome: k.hn, tipo: 'Classe', efeito: k.h });
    });

    if (mc) {
      res.modo = 'mc';
      res.attrs = Object.assign({}, mc.a);
      res.pericia = mergePericias([mc.p]);
      res.mcNome = mc.n;
      res.habs.push({ nome: mc.n, tipo: 'Multiclasse', efeito: mc.h });
      res.mcTexto = mc.n + ' — ' + k1.n + ' + ' + k2.n + '\n' +
        'Atributos: ' + fmtAttrs(mc.a) + '\n' +
        'Perícias: ' + res.pericia + '\n' +
        'Habilidade — ' + mc.n + ': ' + mc.h;
    } else {
      res.modo = 'classe';
      conhecidas.forEach(function (k) {
        Object.keys(k.a).forEach(function (key) { res.attrs[key] = (res.attrs[key] || 0) + k.a[key]; });
      });
      res.pericia = mergePericias(conhecidas.map(function (k) { return k.p; }));
    }
    return res;
  }

  /* ── escrita nos campos ── */
  function somarCampo(id, delta) {
    var el = $(id);
    if (!el || !delta) return;
    el.value = (parseFloat(el.value) || 0) + delta;
  }
  function acharEnergia() {
    var rows = document.querySelectorAll('#extraFields .extra-row');
    for (var i = 0; i < rows.length; i++) {
      var ins = rows[i].querySelectorAll('input');
      if (ins[0] && semAcento(ins[0].value) === 'energia criada') return ins[1];
    }
    return null;
  }
  function somarEnergia(delta) {
    if (!delta) return;
    var inp = acharEnergia();
    if (inp) {
      var txt = String(inp.value).trim();
      var n = txt === '' ? 0 : parseFloat(txt);
      if (isNaN(n)) { aviso('O campo "Energia Criada" não é um número — ajuste manualmente (' + (delta > 0 ? '+' : '') + delta + ').'); return false; }
      inp.value = n + delta;
    } else if (typeof window.addExtraField === 'function') {
      window.addExtraField(['Energia Criada', String(delta)]);
    }
    return true;
  }
  function aviso(msg) {
    var t = $('toast');
    if (t) { t.textContent = msg; t.style.opacity = '1'; clearTimeout(t._t); t._t = setTimeout(function () { t.style.opacity = '0'; }, 3500); }
  }

  function limparPericiaAuto(cur) {
    if (S.pericia && cur.indexOf(S.pericia) >= 0) cur = cur.replace(S.pericia, '');
    return cur.replace(/\s*\|\s*(\|\s*)+/g, ' | ').replace(/^\s*\|\s*/, '').replace(/\s*\|\s*$/, '').trim();
  }

  function removerHabs() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('#habilidadesBody .hab-card'));
    S.habs.forEach(function (h) {
      for (var i = 0; i < cards.length; i++) {
        var n = cards[i].querySelector('.hab-nome'), t = cards[i].querySelector('.hab-tipo');
        if (n && t && n.value === h.nome && t.value === h.tipo) { cards[i].remove(); cards.splice(i, 1); break; }
      }
    });
  }
  function adicionarHabs(habs) {
    if (typeof window.addHabilidade !== 'function') return;
    habs.forEach(function (h) {
      window.addHabilidade();
      var cards = document.querySelectorAll('#habilidadesBody .hab-card');
      var c = cards[cards.length - 1];
      if (!c) return;
      c.querySelector('.hab-nome').value = h.nome;
      c.querySelector('.hab-tipo').value = h.tipo;
      c.querySelector('.hab-efeito').value = h.efeito;
    });
  }

  /* ── aplica: desfaz o que a classe anterior deu e aplica o novo ── */
  function aplicar() {
    var novo = calcular();

    // atributos: tira o bônus antigo, põe o novo
    Object.keys(CAMPOS).forEach(function (k) {
      var delta = (novo.attrs[k] || 0) - (S.bonus[k] || 0);
      somarCampo(CAMPOS[k], delta);
    });
    var dEn = (novo.attrs.energia || 0) - (S.bonus.energia || 0);
    var okEn = dEn ? somarEnergia(dEn) : true;

    // perícias (campo "Perícia")
    var campoP = $('f_pericia');
    if (campoP) {
      var manual = limparPericiaAuto(campoP.value);
      campoP.value = [manual, novo.pericia].filter(Boolean).join(' | ');
    }

    // habilidades
    removerHabs();
    adicionarHabs(novo.habs);

    // multiclasse
    var ta = $('f_mc_classe');
    if (ta) {
      var atual = ta.value.trim();
      if (atual === '' || atual === (S.mc || '').trim()) { ta.value = novo.mcTexto; if (novo.mcTexto) ta.rows = Math.max(ta.rows || 2, 6); }
    }

    S.bonus = {};
    Object.keys(novo.attrs).forEach(function (k) {
      if (k === 'energia' && !okEn) return;
      if (novo.attrs[k]) S.bonus[k] = novo.attrs[k];
    });
    S.pericia = novo.pericia;
    S.mc = novo.mcTexto;
    S.habs = novo.habs.map(function (h) { return { nome: h.nome, tipo: h.tipo }; });

    atualizarInfo(novo);
    if (typeof window.salvarAtual === 'function') window.salvarAtual();
  }

  function atualizarInfo(calc) {
    var box = $('autoInfo');
    if (!box) return;
    calc = calc || calcular();
    if (!calc.modo) { box.style.display = 'none'; box.textContent = ''; return; }
    var t = calc.modo === 'mc'
      ? '⚙ Multiclasse automática: ' + calc.mcNome + ' (' + S.c1 + ' + ' + S.c2 + ')'
      : '⚙ Classe automática: ' + [S.c1, S.c2].filter(achar).join(' + ');
    box.innerHTML = '';
    var a = document.createElement('div'); a.style.fontWeight = '600'; a.textContent = t;
    var b = document.createElement('div'); b.textContent = 'Atributos: ' + fmtAttrs(calc.attrs);
    var c = document.createElement('div'); c.textContent = 'Perícias: ' + calc.pericia;
    box.appendChild(a); box.appendChild(b); box.appendChild(c);
    box.style.display = 'block';
  }

  /* ── escolher classe ── */
  function definirClasse(slot, valor) {
    var campo = $(slot === 1 ? 'f_classe' : 'f_classe2');
    var k = achar(valor);
    if (k) { campo.value = k.n; S['c' + slot] = k.n; }
    else { if (valor !== undefined && valor !== null) campo.value = valor; S['c' + slot] = ''; }
    aplicar();
  }

  /* ── picker ── */
  var slotAtual = 1;
  function montarPicker() {
    var css = document.createElement('style');
    css.textContent =
      '.cl-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:6000;align-items:center;justify-content:center;padding:14px}' +
      '.cl-ov.open{display:flex}' +
      '.cl-box{background:var(--bg2,#111);border:1px solid var(--border2,#604808);border-radius:8px;width:100%;max-width:560px;max-height:88vh;display:flex;flex-direction:column}' +
      '.cl-head{padding:12px 16px;border-bottom:1px solid var(--border,#302808);font-family:Cinzel,serif;color:var(--gold,#c9a84c);font-size:14px;letter-spacing:.6px}' +
      '.cl-search{padding:10px 16px}' +
      '.cl-list{overflow-y:auto;padding:0 16px 10px;display:flex;flex-direction:column;gap:6px;flex:1}' +
      '.cl-item{text-align:left;display:block;width:100%;padding:8px 12px;background:var(--bg3,#161616);border:1px solid var(--border,#302808);border-radius:6px;color:var(--text,#fff);cursor:pointer}' +
      '.cl-item:hover{border-color:var(--gold-dim,#dba844)}' +
      '.cl-item.sel{border-color:var(--gold,#c9a84c);background:rgba(255,255,255,.05)}' +
      '.cl-n{font-family:Cinzel,serif;color:var(--gold,#c9a84c);font-size:14px}' +
      '.cl-h{font-size:12px;opacity:.7;font-style:italic;margin-left:6px}' +
      '.cl-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}' +
      '.cl-chip{font-size:11px;padding:1px 7px;border-radius:10px;border:1px solid}' +
      '.cl-pos{color:#7fd18b;border-color:#2f6a38}.cl-neg{color:#e08a7a;border-color:#7a3a2e}' +
      '.cl-foot{display:flex;justify-content:space-between;gap:8px;padding:10px 16px;border-top:1px solid var(--border,#302808)}' +
      '.cl-pick-btn{margin-top:6px;font-size:12px;padding:4px 10px}' +
      '#autoInfo{display:none;margin:0 0 12px;padding:9px 12px;border:1px dashed var(--gold-dim,#dba844);border-radius:6px;font-size:13px;line-height:1.5;background:rgba(255,255,255,.03)}';
    document.head.appendChild(css);

    var ov = document.createElement('div');
    ov.className = 'cl-ov'; ov.id = 'clOverlay';
    ov.innerHTML =
      '<div class="cl-box"><div class="cl-head" id="clTitulo">Escolher classe</div>' +
      '<div class="cl-search"><input type="text" id="clBusca" placeholder="🔍 Buscar classe..." autocomplete="off"></div>' +
      '<div class="cl-list" id="clLista"></div>' +
      '<div class="cl-foot"><button type="button" id="clLimpar">Limpar classe</button><button type="button" id="clFechar">Fechar</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) fecharPicker(); });
    $('clFechar').onclick = fecharPicker;
    $('clLimpar').onclick = function () { definirClasse(slotAtual, ''); fecharPicker(); };
    $('clBusca').oninput = renderLista;
  }
  function renderLista() {
    var q = semAcento($('clBusca').value), sel = S['c' + slotAtual];
    var lista = $('clLista'); lista.innerHTML = '';
    CLASSES.filter(function (c) { return !q || semAcento(c.n).indexOf(q) >= 0 || semAcento(c.hn).indexOf(q) >= 0; })
      .forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'cl-item' + (c.n === sel ? ' sel' : '');
        var nome = document.createElement('div');
        nome.innerHTML = '<span class="cl-n"></span><span class="cl-h"></span>';
        nome.querySelector('.cl-n').textContent = c.n;
        nome.querySelector('.cl-h').textContent = c.hn;
        var chips = document.createElement('div'); chips.className = 'cl-chips';
        ORDEM.filter(function (k) { return c.a[k]; }).forEach(function (k) {
          var s = document.createElement('span');
          s.className = 'cl-chip ' + (c.a[k] > 0 ? 'cl-pos' : 'cl-neg');
          s.textContent = (c.a[k] > 0 ? '+' : '') + c.a[k] + ' ' + ROTULOS[k];
          chips.appendChild(s);
        });
        b.appendChild(nome); b.appendChild(chips);
        b.onclick = function () { definirClasse(slotAtual, c.n); fecharPicker(); };
        lista.appendChild(b);
      });
  }
  function abrirPicker(slot) {
    slotAtual = slot;
    $('clTitulo').textContent = slot === 1 ? 'Escolher Classe' : 'Escolher Classe 2';
    $('clBusca').value = '';
    renderLista();
    $('clOverlay').classList.add('open');
  }
  function fecharPicker() { $('clOverlay').classList.remove('open'); }

  /* ── init ── */
  function init() {
    var c1 = $('f_classe'), c2 = $('f_classe2');
    if (!c1 || !c2) return;
    montarPicker();

    [[c1, 1], [c2, 2]].forEach(function (par) {
      var campo = par[0], slot = par[1];
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'cl-pick-btn';
      btn.textContent = '📋 Escolher da lista';
      btn.onclick = function () { abrirPicker(slot); };
      campo.parentNode.appendChild(btn);
      campo.addEventListener('change', function () { definirClasse(slot, campo.value.trim()); });
    });

    var secao = c1.closest('.card-section');
    var info = document.createElement('div');
    info.id = 'autoInfo';
    if (secao && secao.parentNode) secao.parentNode.insertBefore(info, secao.nextSibling);
  }

  /* ── API usada pelas páginas ── */
  window.ClasseAuto = {
    carregar: function (ficha) {
      S = Object.assign(vazio(), (ficha && ficha.auto_classe) || {});
      S.bonus = S.bonus || {}; S.habs = S.habs || [];
      atualizarInfo();
    },
    estado: function () {
      var temAlgo = S.c1 || S.c2 || Object.keys(S.bonus).length || S.habs.length;
      return temAlgo ? JSON.parse(JSON.stringify(S)) : null;
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
