/* Terminal Mesa v2 — tudo desenhado a partir de data/dados.json.
   Regra: nada é estimado aqui. O que não veio no dado não aparece na tela. */

(function () {
  "use strict";

  var LS = "tmesa2:";
  var D = null, ativoSel = "win", tfSel = "min60";

  function get(k, d) { try { var v = localStorage.getItem(LS + k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(LS + k, v); } catch (e) {} }
  function $(s) { return document.querySelector(s); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function fmt(v, casas) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 });
  }

  /* ---------- tema ---------- */

  function tema(t) {
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  tema(get("tema", "auto"));
  $("#btn-tema").addEventListener("click", function () {
    var o = ["auto", "light", "dark"], n = o[(o.indexOf(get("tema", "auto")) + 1) % 3];
    set("tema", n); tema(n); this.title = "Tema: " + n;
  });

  /* ---------- guia ---------- */

  var guia = $("#guia");
  if (get("guia_visto", "") !== "1") guia.hidden = false;
  $("#btn-guia").addEventListener("click", function () { guia.hidden = !guia.hidden; });
  $("#guia-ok").addEventListener("click", function () { guia.hidden = true; set("guia_visto", "1"); });

  /* ---------- markdown mínimo (folha) ---------- */

  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  }
  function cels(l) { return l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (x) { return x.trim(); }); }
  function md(src) {
    var L = String(src).replace(/\r\n/g, "\n").split("\n"), out = [], i = 0;
    while (i < L.length) {
      var l = L[i];
      if (/^\s*$/.test(l)) { i++; continue; }
      if (/^---+\s*$/.test(l)) { out.push("<hr>"); i++; continue; }
      var h = l.match(/^(#{1,4})\s+(.*)$/);
      if (h) { out.push("<h" + h[1].length + ">" + inline(h[2]) + "</h" + h[1].length + ">"); i++; continue; }
      if (/^>\s?/.test(l)) {
        var q = [];
        while (i < L.length && /^>\s?/.test(L[i])) { q.push(L[i].replace(/^>\s?/, "")); i++; }
        out.push("<blockquote>" + inline(q.join(" ")) + "</blockquote>"); continue;
      }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < L.length && /^\s*\|[\s:|-]+\|\s*$/.test(L[i + 1])) {
        var cab = cels(l); i += 2; var corpo = [];
        while (i < L.length && /^\s*\|.*\|\s*$/.test(L[i])) { corpo.push(cels(L[i])); i++; }
        out.push("<div class='tab-wrap'><table><thead><tr>" +
          cab.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          corpo.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>"; }).join("") +
          "</tbody></table></div>"); continue;
      }
      if (/^\s*[-*]\s+/.test(l)) {
        var ul = [];
        while (i < L.length && /^\s*[-*]\s+/.test(L[i])) { ul.push(L[i].replace(/^\s*[-*]\s+/, "")); i++; }
        out.push("<ul>" + ul.map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("") + "</ul>"); continue;
      }
      if (/^\s*\d+[.)]\s+/.test(l)) {
        var ol = [];
        while (i < L.length && /^\s*\d+[.)]\s+/.test(L[i])) { ol.push(L[i].replace(/^\s*\d+[.)]\s+/, "")); i++; }
        out.push("<ol>" + ol.map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("") + "</ol>"); continue;
      }
      var p = [];
      while (i < L.length && !/^\s*$/.test(L[i]) && !/^(#{1,4}\s|>|\s*[-*]\s|\s*\d+[.)]\s|---+\s*$)/.test(L[i]) && !/^\s*\|/.test(L[i])) { p.push(L[i]); i++; }
      if (p.length) out.push("<p>" + inline(p.join(" ")) + "</p>"); else i++;
    }
    return out.join("\n");
  }

  /* ---------- 1. cartões de decisão ---------- */

  function cartoes() {
    var box = $("#decisao"); box.innerHTML = "";
    D.ativos.forEach(function (a) {
      var c = el("div", "cartao");
      var topo = el("div", "cartao-topo");
      var esq = el("div");
      esq.appendChild(el("div", "cartao-nome", a.nome));
      esq.appendChild(el("div", "cartao-contrato", a.contrato));
      esq.appendChild(el("div", "cartao-preco num", fmt(a.ultimo, a.casas)));
      var dir = a.var_pct > 0.005 ? "sobe" : (a.var_pct < -0.005 ? "desce" : "parado");
      var seta = dir === "sobe" ? "▲" : (dir === "desce" ? "▼" : "■");
      esq.appendChild(el("div", "cartao-var num " + dir,
        seta + " " + (a.var_pct > 0 ? "+" : "") + fmt(a.var_pct, 2) + "%"));
      topo.appendChild(esq);
      topo.appendChild(el("span", "selo " + a.veredito.toLowerCase(), a.veredito));
      c.appendChild(topo);
      c.appendChild(el("p", "cartao-resumo", a.resumo));

      if (a.gatilhos && (a.gatilhos.compra || a.gatilhos.venda)) {
        var g = el("div", "gatilhos");
        [["compra", "c", "COMPRA"], ["venda", "v", "VENDA"]].forEach(function (par) {
          var it = a.gatilhos[par[0]]; if (!it) return;
          var linha = el("div", "gat");
          linha.appendChild(el("span", "gat-tag " + par[1], par[2]));
          var t = el("div", "gat-txt");
          t.appendChild(document.createTextNode(it.gatilho));
          var inv = el("em", null, "invalida: " + it.invalida + (it.alvo ? " · alvo " + it.alvo : ""));
          t.appendChild(inv);
          linha.appendChild(t);
          g.appendChild(linha);
        });
        c.appendChild(g);
      }
      box.appendChild(c);
    });
  }

  /* ---------- 2. hierarquia ---------- */

  var NIVEIS = [
    { n: 1, nome: "Fibonacci / dinâmica", campo: "fibo", manda: true },
    { n: 2, nome: "Contexto maior", campo: "contexto", manda: true },
    { n: 3, nome: "Médias 8 e 20", campo: "medias" },
    { n: 4, nome: "Estocástico 8,3,3", campo: "stoch" },
    { n: 5, nome: "TRIX sinal 4", campo: "trix" },
    { n: 6, nome: "ADX 8,8 + DI 8", campo: "adx" },
    { n: 7, nome: "IFR 14", campo: "ifr" },
    { n: 8, nome: "CCI 50 e PVT", campo: "ccipvt" }
  ];

  function chip(lado, txt, det) {
    var cls = lado === "compra" ? "c" : (lado === "venda" ? "v" : "n");
    var s = lado === "compra" ? "▲" : (lado === "venda" ? "▼" : "■");
    var w = el("div");
    var ch = el("span", "chip " + cls);
    ch.appendChild(el("span", "seta", s));
    ch.appendChild(document.createTextNode(txt));
    w.appendChild(ch);
    if (det) w.appendChild(el("div", "det", det));
    return w;
  }

  function celula(m, campo, casas) {
    if (!m) return el("span", "chip n", "—");
    if (campo === "medias") {
      var lado = m.posicao === "acima das duas" ? "compra" : (m.posicao === "abaixo das duas" ? "venda" : "neutro");
      return chip(lado, m.posicao, "8: " + fmt(m.mm8, casas) + " · 20: " + fmt(m.mm20, casas));
    }
    if (campo === "stoch") return chip(m.stoch_lado, m.stoch_lado, "K " + m.stoch_k + " / D " + m.stoch_d);
    if (campo === "trix") return chip(m.trix_lado, m.trix_lado, m.trix + " / " + m.trix_sinal);
    if (campo === "adx") {
      var det = "ADX " + m.adx + " · " + (m.aceleracao ? "acelera" : "sem aceleração") +
        (m.kick !== "nenhum" ? " · kick de " + m.kick : "");
      return chip(m.aceleracao ? m.di_lado : "neutro", m.di_lado === "compra" ? "DI+ por cima" : "DI− por cima", det);
    }
    if (campo === "ifr") {
      var l = m.ifr > 55 ? "compra" : (m.ifr < 45 ? "venda" : "neutro");
      return chip(l, String(m.ifr), m.ifr < 20 ? "sub-20 — alerta" : (m.ifr > 70 ? "esticado" : ""));
    }
    if (campo === "ccipvt") {
      var l2 = (m.cci > 0 && m.pvt_lado === "compra") ? "compra" : ((m.cci < 0 && m.pvt_lado === "venda") ? "venda" : "neutro");
      return chip(l2, "CCI " + m.cci, "PVT " + m.pvt_lado);
    }
    return el("span", "chip n", "—");
  }

  function hierarquia() {
    var a = D.ativos.filter(function (x) { return x.id === ativoSel; })[0];
    var box = $("#hierarquia"); box.innerHTML = "";
    if (!a) return;
    var tabela = el("table", "grade");
    var tfs = [["min60", "60 min"], ["diario", "Diário"], ["semanal", "Semanal"]]
      .filter(function (t) { return a.tfs[t[0]]; });

    var thead = el("thead"), tr = el("tr");
    tr.appendChild(el("th", null, "Nível"));
    tfs.forEach(function (t) { tr.appendChild(el("th", null, t[1])); });
    thead.appendChild(tr); tabela.appendChild(thead);

    var tb = el("tbody");
    NIVEIS.forEach(function (nv) {
      var linha = el("tr", nv.manda ? "manda" : null);
      var th = el("th");
      th.appendChild(el("span", "nv", String(nv.n)));
      th.appendChild(document.createTextNode(nv.nome));
      linha.appendChild(th);
      tfs.forEach(function (t) {
        var td = el("td");
        if (nv.campo === "fibo") {
          var f = a.fibo && a.fibo[0];
          td.appendChild(f ? chip("neutro", "pernada " + fmt(f.base, a.casas) + " → " + fmt(f.topo, a.casas), f.rotulo)
            : el("span", "chip n", "—"));
        } else if (nv.campo === "contexto") {
          var mx = a.tfs.semanal || a.tfs.diario;
          td.appendChild(mx ? chip(mx.posicao === "acima das duas" ? "compra" : "venda",
            t[0] === "min60" ? "manda o diário/semanal" : mx.posicao, "") : el("span", "chip n", "—"));
        } else {
          td.appendChild(celula(a.tfs[t[0]], nv.campo, a.casas));
        }
        linha.appendChild(td);
      });
      tb.appendChild(linha);
    });
    tabela.appendChild(tb);
    box.appendChild(tabela);
    legendaGrade();
  }

  /* ---------- legenda da hierarquia ---------- */

  var GLOSSARIO = [
    ["1", "Fibonacci / dinâmica",
      "A pernada de referência: do fundo ao topo (ou do topo ao fundo) que está mandando agora. As retrações 23, 50 e 78 são onde o preço pode parar na volta; as extensões 111, 127, 141 e 161 são alvo. Perder o 23 é o primeiro aviso de que a pernada acabou."],
    ["2", "Contexto maior",
      "Onde o preço está no timeframe acima do que você opera. Se o semanal e o diário estão comprados, venda estrutural não é autorizada — no máximo correção."],
    ["3", "Médias 8 e 20",
      "O chip diz se o fechamento está acima das duas, abaixo das duas, ou entre elas. Os números embaixo são o valor exato de cada média. Duplo Rompimento é fechar além das duas no mesmo candle."],
    ["4", "Estocástico 8,3,3",
      "Quem está no comando dentro do range. K acima de D é compra, K abaixo é venda. Os números embaixo são K e D."],
    ["5", "TRIX sinal 4",
      "Confirmação de virada. TRIX acima da própria média (o sinal) é compra, abaixo é venda. Os dois números são TRIX e sinal — quanto mais perto, mais perto do cruzamento."],
    ["6", "ADX 8,8 + DI 8",
      "Força, não direção. Tem aceleração se o ADX está acima de 32 ou abaixo de 20; entre os dois, o movimento não anda. Kick é o V (ou xis invertido) no próprio ADX. Quem dá a direção é o DI: azul por cima marca topo, por baixo marca fundo."],
    ["7", "IFR 14",
      "Termômetro de esticado. Acima de 70 é compra esticada, abaixo de 30 é venda esticada, sub-20 é alerta. Não é sinal de entrada sozinho."],
    ["8", "CCI 50 e PVT",
      "Última confirmação. CCI positivo com PVT subindo fecha o lado comprado; CCI negativo com PVT caindo fecha o vendido. Divergência entre os dois é motivo para ficar de fora."]
  ];

  function legendaGrade() {
    var box = $("#hier-legenda"); if (!box) return;
    if (box.dataset.pronto === "1") return;
    box.dataset.pronto = "1";

    var det = el("details", "leg");
    det.open = get("leg_aberta", "1") === "1";
    det.addEventListener("toggle", function () { set("leg_aberta", det.open ? "1" : "0"); });
    var sum = el("summary", null, "O que cada coisa da grade quer dizer");
    det.appendChild(sum);
    var corpo = el("div", "leg-in");

    var chaves = el("div", "leg-chaves");
    [["c", "▲", "compra", "o nível está a favor da compra"],
     ["v", "▼", "venda", "o nível está a favor da venda"],
     ["n", "■", "neutro", "o nível não autoriza nada — dado sem lado"]].forEach(function (p) {
      var it = el("div", "leg-chave");
      var ch = el("span", "chip " + p[0]);
      ch.appendChild(el("span", "seta", p[1]));
      ch.appendChild(document.createTextNode(p[2]));
      it.appendChild(ch);
      it.appendChild(el("span", "leg-txt", p[3]));
      chaves.appendChild(it);
    });
    corpo.appendChild(chaves);

    var notas = el("ul", "leg-notas");
    [
      "<b>A linha cinza menor embaixo de cada chip</b> é o número cru que gerou o veredito. É ele que você confere no Profit — se não bater, o dado está velho.",
      "<b>As duas primeiras linhas ficam destacadas</b> porque mandam nas outras seis. Fibonacci e contexto decidem o lado; os indicadores só dizem a hora. Indicador alinhado com os níveis 1 e 2 contra não autoriza entrada nenhuma.",
      "<b>As três colunas são os mesmos oito níveis em timeframes diferentes.</b> Divergência entre elas é normal e é justamente a informação: 60 min contra o diário é correção dentro de tendência, não reversão.",
      "<b>Um traço (—)</b> quer dizer que a série daquele timeframe não foi exportada. Nada é estimado para preencher buraco."
    ].forEach(function (t) { var li = el("li"); li.innerHTML = t; notas.appendChild(li); });
    corpo.appendChild(notas);

    var gl = el("div", "leg-niveis");
    GLOSSARIO.forEach(function (p) {
      var it = el("div", "leg-nivel" + (p[0] === "1" || p[0] === "2" ? " manda" : ""));
      var h = el("h5");
      h.appendChild(el("span", "nv", p[0]));
      h.appendChild(document.createTextNode(p[1]));
      it.appendChild(h);
      it.appendChild(el("p", null, p[2]));
      gl.appendChild(it);
    });
    corpo.appendChild(gl);

    det.appendChild(corpo);
    box.appendChild(det);
  }

  /* ---------- 3. gráfico interativo ---------- */

  var NS = "http://www.w3.org/2000/svg";
  function svgEl(t, at) {
    var n = document.createElementNS(NS, t);
    for (var k in at) if (at.hasOwnProperty(k)) n.setAttribute(k, at[k]);
    return n;
  }

  var MINJAN = 8;          // mínimo de candles na tela
  var vis = null;          // janela visível: {chave, n, i0, i1}
  var GEO = null;          // geometria do último desenho, usada pelo arrasto
  var arrasto = null;

  function chaveSerie() { return ativoSel + ":" + tfSel; }

  function serie() {
    var a = D.ativos.filter(function (x) { return x.id === ativoSel; })[0];
    if (!a) return null;
    var g = a.grafico[tfSel] || a.grafico.diario;
    if (!g) return null;
    return { a: a, g: g };
  }

  function janela(n, reset) {
    if (reset || !vis || vis.chave !== chaveSerie() || vis.n !== n) {
      vis = { chave: chaveSerie(), n: n, i0: 0, i1: n - 1 };
      return vis;
    }
    if (vis.i1 - vis.i0 + 1 < MINJAN) vis.i1 = vis.i0 + MINJAN - 1;
    if (vis.i1 > n - 1) { vis.i0 -= vis.i1 - (n - 1); vis.i1 = n - 1; }
    if (vis.i0 < 0) vis.i0 = 0;
    if (vis.i1 > n - 1) vis.i1 = n - 1;
    return vis;
  }

  function zoom(fator, ancora) {
    if (!vis) return;
    var m = vis.i1 - vis.i0 + 1, n = vis.n;
    var novo = Math.max(MINJAN, Math.min(n, Math.round(m * fator)));
    if (novo === m) return;
    if (ancora === undefined) ancora = vis.i1;                 // sem cursor, ancora no candle mais recente
    var frac = m > 1 ? (ancora - vis.i0) / (m - 1) : 0;
    vis.i0 = Math.round(ancora - frac * (novo - 1));
    vis.i1 = vis.i0 + novo - 1;
    janela(n); desenhar();
  }

  function pan(delta) {
    if (!vis) return;
    var n = vis.n, i0 = vis.i0 + delta, i1 = vis.i1 + delta;
    if (i0 < 0) { i1 -= i0; i0 = 0; }
    if (i1 > n - 1) { i0 -= i1 - (n - 1); i1 = n - 1; }
    if (i0 < 0) i0 = 0;
    if (i0 === vis.i0 && i1 === vis.i1) return;
    vis.i0 = i0; vis.i1 = i1; desenhar();
  }

  function aoMover(ev) {
    if (!arrasto || !GEO) return;
    var dx = (ev.clientX - arrasto.x) * arrasto.esc;
    var d = Math.round(dx / arrasto.passo);
    var n = arrasto.n, i0 = arrasto.i0 - d, i1 = arrasto.i1 - d;
    if (i0 < 0) { i1 -= i0; i0 = 0; }
    if (i1 > n - 1) { i0 -= i1 - (n - 1); i1 = n - 1; }
    if (i0 < 0) i0 = 0;
    if (!vis || (i0 === vis.i0 && i1 === vis.i1)) return;
    vis.i0 = i0; vis.i1 = i1; desenhar();
  }
  function aoSoltar() {
    if (!arrasto) return;
    arrasto = null;
    document.body.classList.remove("arrastando");
  }
  window.addEventListener("pointermove", aoMover);
  window.addEventListener("pointerup", aoSoltar);
  window.addEventListener("pointercancel", aoSoltar);

  function grafico() {
    var S = serie();
    var box = $("#grafico"); box.innerHTML = "";
    if (!S) { box.appendChild(el("p", "vazio", "Sem série para este timeframe.")); return; }
    var a = S.a, g = S.g, C = g.candles, n = C.length;

    var v = janela(n), i0 = v.i0, i1 = v.i1, m = i1 - i0 + 1;

    var W = 1200, HP = 300, HA = 90, GAP = 26, PADL = 30, PADR = 68, PADT = 12;
    var H = PADT + HP + GAP + HA + 26;
    var AT = PADT + HP + GAP;

    var lo = Infinity, hi = -Infinity, i;
    for (i = i0; i <= i1; i++) {
      lo = Math.min(lo, C[i][3]); hi = Math.max(hi, C[i][2]);
      if (g.mm8[i] != null) { lo = Math.min(lo, g.mm8[i]); hi = Math.max(hi, g.mm8[i]); }
      if (g.mm20[i] != null) { lo = Math.min(lo, g.mm20[i]); hi = Math.max(hi, g.mm20[i]); }
    }

    var fib = [];
    if (a.fibo && a.fibo[0]) {
      a.fibo[0].niveis.forEach(function (nv) {
        if (nv.tipo === "retração" && nv.preco > lo - (hi - lo) * 0.25 && nv.preco < hi + (hi - lo) * 0.25) fib.push(nv);
      });
    }
    fib.forEach(function (nv) { lo = Math.min(lo, nv.preco); hi = Math.max(hi, nv.preco); });

    var pad = (hi - lo) * 0.06 || 1;
    lo -= pad; hi += pad;
    var LW = W - PADL - PADR;
    var passo = LW / m;
    var larg = Math.max(1.2, Math.min(22, passo * 0.62));
    function X(i) { return PADL + passo * (i - i0 + 0.5); }
    function Y(v2) { return PADT + HP - (v2 - lo) / (hi - lo) * HP; }

    var amax = 45;
    for (i = i0; i <= i1; i++) if (g.adx[i] != null) amax = Math.max(amax, g.adx[i] * 1.1);
    function YA(v2) { return AT + HA - (v2 / amax) * HA; }

    GEO = { W: W, PADL: PADL, LW: LW, passo: passo, i0: i0, i1: i1, n: n, HP: HP, PADT: PADT, AT: AT, HA: HA };

    var svg = svgEl("svg", {
      viewBox: "0 0 " + W + " " + H, tabindex: "0", role: "img",
      "aria-label": "Gráfico de " + a.nome + " — candles com médias 8 e 20, níveis de Fibonacci e painel de ADX. " +
        "Use a roda do mouse para aproximar, arraste para deslocar."
    });

    // grade horizontal + eixo de preço
    var passos = 5;
    for (var k = 0; k <= passos; k++) {
      var pv = lo + (hi - lo) * k / passos, y = Y(pv);
      svg.appendChild(svgEl("line", { x1: PADL, y1: y, x2: PADL + LW, y2: y,
        stroke: "var(--linha)", "stroke-width": 1 }));
      var tx = svgEl("text", { x: PADL + LW + 8, y: y + 4, fill: "var(--mudo)",
        "font-size": 11, "font-family": "var(--mono)" });
      tx.textContent = fmt(pv, a.casas);
      svg.appendChild(tx);
    }

    // fibos
    fib.forEach(function (nv) {
      var y2 = Y(nv.preco);
      var cor = nv.estado === "perdido" ? "var(--baixa)" : "var(--acento)";
      svg.appendChild(svgEl("line", { x1: PADL, y1: y2, x2: PADL + LW, y2: y2,
        stroke: cor, "stroke-width": 1.5, "stroke-dasharray": "5 4", opacity: .6 }));
      var t = svgEl("text", { x: PADL + 6, y: y2 - 5, fill: cor, "font-size": 10.5,
        "font-weight": 700, "font-family": "var(--mono)" });
      t.textContent = "Fibo " + nv.n + " · " + fmt(nv.preco, a.casas);
      svg.appendChild(t);
    });

    // candles
    for (i = i0; i <= i1; i++) {
      var c = C[i], o = c[1], h = c[2], l = c[3], cl = c[4];
      var cor2 = cl >= o ? "var(--alta)" : "var(--baixa)";
      svg.appendChild(svgEl("line", { x1: X(i), y1: Y(h), x2: X(i), y2: Y(l),
        stroke: cor2, "stroke-width": Math.max(1.2, larg * 0.16) }));
      var ya = Y(Math.max(o, cl)), yb = Y(Math.min(o, cl));
      svg.appendChild(svgEl("rect", { x: X(i) - larg / 2, y: ya, width: larg,
        height: Math.max(1.2, yb - ya), fill: cor2, rx: 1 }));
    }

    // médias
    function linha(arr, cor, lt, fy) {
      var d = "", primeiro = true;
      for (var j = i0; j <= i1; j++) {
        if (arr[j] == null) continue;
        d += (primeiro ? "M" : "L") + X(j).toFixed(1) + " " + fy(arr[j]).toFixed(1) + " ";
        primeiro = false;
      }
      if (d) svg.appendChild(svgEl("path", { d: d, fill: "none", stroke: cor,
        "stroke-width": lt, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    }
    linha(g.mm20, "var(--mudo)", 2, Y);
    linha(g.mm8, "var(--atencao)", 2, Y);

    // painel ADX
    svg.appendChild(svgEl("rect", { x: PADL, y: AT, width: LW, height: HA, fill: "var(--sup2)", rx: 6 }));
    [20, 32].forEach(function (nivel) {
      if (nivel > amax) return;
      var y3 = YA(nivel);
      svg.appendChild(svgEl("line", { x1: PADL, y1: y3, x2: PADL + LW, y2: y3,
        stroke: nivel === 32 ? "var(--atencao)" : "var(--mudo)", "stroke-width": 1,
        "stroke-dasharray": "4 4", opacity: .8 }));
      var t2 = svgEl("text", { x: PADL + LW + 8, y: y3 + 4, fill: "var(--mudo)",
        "font-size": 10.5, "font-family": "var(--mono)" });
      t2.textContent = String(nivel);
      svg.appendChild(t2);
    });
    linha(g.adx, "var(--acento)", 2, YA);
    var rot = svgEl("text", { x: PADL + 8, y: AT + 15, fill: "var(--mudo)", "font-size": 10.5,
      "font-weight": 700, "letter-spacing": ".06em" });
    rot.textContent = "ADX 8,8";
    svg.appendChild(rot);

    // datas
    var marcas = Math.max(2, Math.min(7, m));
    for (var j2 = 0; j2 < marcas; j2++) {
      var idx = i0 + Math.round(j2 * (m - 1) / (marcas - 1 || 1));
      var td = svgEl("text", { x: X(idx), y: H - 6, fill: "var(--mudo)", "font-size": 10.5,
        "text-anchor": "middle", "font-family": "var(--mono)" });
      td.textContent = C[idx][0];
      svg.appendChild(td);
    }

    /* --- cruz + leitura do candle --- */
    var cruz = svgEl("g", { visibility: "hidden", "pointer-events": "none" });
    var faixa = svgEl("rect", { y: PADT, height: HP + GAP + HA, fill: "var(--acento)", opacity: .09, rx: 2 });
    var vlin = svgEl("line", { y1: PADT, y2: AT + HA, stroke: "var(--tinta2)", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: .7 });
    var hlin = svgEl("line", { x1: PADL, x2: PADL + LW, stroke: "var(--tinta2)", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: .7 });
    var tagBg = svgEl("rect", { width: 62, height: 17, rx: 4, fill: "var(--tinta2)" });
    var tagTx = svgEl("text", { fill: "var(--plano)", "font-size": 10.5, "font-family": "var(--mono)", "text-anchor": "middle" });
    cruz.appendChild(faixa); cruz.appendChild(vlin); cruz.appendChild(hlin);
    cruz.appendChild(tagBg); cruz.appendChild(tagTx);
    svg.appendChild(cruz);

    var dica = el("div", "dica"); dica.hidden = true;

    function coord(ev) {
      var r = svg.getBoundingClientRect();
      return { esc: W / r.width, x: (ev.clientX - r.left) * (W / r.width),
        y: (ev.clientY - r.top) * (W / r.width), rx: ev.clientX - r.left, rw: r.width };
    }
    function idxDe(p) {
      return Math.max(i0, Math.min(i1, i0 + Math.floor((p.x - PADL) / passo)));
    }

    svg.addEventListener("pointermove", function (ev) {
      if (arrasto) { cruz.setAttribute("visibility", "hidden"); dica.hidden = true; return; }
      var p = coord(ev);
      if (p.x < PADL || p.x > PADL + LW || p.y < PADT || p.y > AT + HA) {
        cruz.setAttribute("visibility", "hidden"); dica.hidden = true; return;
      }
      var i3 = idxDe(p), cd = C[i3], x = X(i3);
      cruz.setAttribute("visibility", "visible");
      faixa.setAttribute("x", (x - passo / 2).toFixed(1));
      faixa.setAttribute("width", passo.toFixed(1));
      vlin.setAttribute("x1", x.toFixed(1)); vlin.setAttribute("x2", x.toFixed(1));
      var noPreco = p.y <= PADT + HP;
      hlin.setAttribute("y1", p.y.toFixed(1)); hlin.setAttribute("y2", p.y.toFixed(1));
      hlin.setAttribute("visibility", noPreco ? "visible" : "hidden");
      tagBg.setAttribute("visibility", noPreco ? "visible" : "hidden");
      tagTx.setAttribute("visibility", noPreco ? "visible" : "hidden");
      if (noPreco) {
        var pv2 = lo + (PADT + HP - p.y) / HP * (hi - lo);
        tagBg.setAttribute("x", PADL + LW + 4); tagBg.setAttribute("y", p.y - 8.5);
        tagTx.setAttribute("x", PADL + LW + 35); tagTx.setAttribute("y", p.y + 3.5);
        tagTx.textContent = fmt(pv2, a.casas);
      }
      dica.hidden = false;
      dica.innerHTML =
        "<b>" + esc(cd[0]) + "</b>" +
        "<span><i>abre</i>" + fmt(cd[1], a.casas) + "</span>" +
        "<span><i>máx</i>" + fmt(cd[2], a.casas) + "</span>" +
        "<span><i>mín</i>" + fmt(cd[3], a.casas) + "</span>" +
        "<span><i>fecha</i>" + fmt(cd[4], a.casas) + "</span>" +
        "<span class='m8'><i>MM8</i>" + fmt(g.mm8[i3], a.casas) + "</span>" +
        "<span class='m20'><i>MM20</i>" + fmt(g.mm20[i3], a.casas) + "</span>" +
        "<span class='adx'><i>ADX</i>" + fmt(g.adx[i3], 1) + "</span>";
      var larguraDica = 168;
      var esq = p.rx + 18;
      if (esq + larguraDica > p.rw - 6) esq = p.rx - larguraDica - 18;
      dica.style.left = Math.max(4, esq) + "px";
      dica.style.top = Math.max(4, (p.y / p.esc) - 10) + "px";
    });
    svg.addEventListener("pointerleave", function () {
      cruz.setAttribute("visibility", "hidden"); dica.hidden = true;
    });

    /* --- zoom pela roda --- */
    svg.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      var p = coord(ev);
      zoom(ev.deltaY > 0 ? 1.2 : 1 / 1.2, idxDe(p));
    }, { passive: false });

    /* --- arrasto --- */
    svg.addEventListener("pointerdown", function (ev) {
      if (ev.button) return;
      ev.preventDefault();
      var r = svg.getBoundingClientRect();
      arrasto = { x: ev.clientX, i0: i0, i1: i1, n: n, passo: passo, esc: W / r.width };
      document.body.classList.add("arrastando");
      cruz.setAttribute("visibility", "hidden"); dica.hidden = true;
    });
    svg.addEventListener("dblclick", function () { janela(n, true); desenhar(); });

    /* --- teclado --- */
    svg.addEventListener("keydown", function (ev) {
      var passoTecla = Math.max(1, Math.round((i1 - i0 + 1) * 0.2));
      if (ev.key === "ArrowLeft") { pan(-passoTecla); ev.preventDefault(); }
      else if (ev.key === "ArrowRight") { pan(passoTecla); ev.preventDefault(); }
      else if (ev.key === "+" || ev.key === "=") { zoom(1 / 1.3); ev.preventDefault(); }
      else if (ev.key === "-" || ev.key === "_") { zoom(1.3); ev.preventDefault(); }
      else if (ev.key === "Home" || ev.key === "0") { janela(n, true); desenhar(); ev.preventDefault(); }
    });

    box.appendChild(svg);
    box.appendChild(dica);
  }

  /* --- controles do gráfico --- */

  function controles() {
    var box = $("#grafico-ctrl"); if (!box) return;
    box.innerHTML = "";
    var S = serie(); if (!S) return;
    var n = S.g.candles.length, m = vis ? vis.i1 - vis.i0 + 1 : n;

    function bt(txt, rot, fn, desab) {
      var b = el("button", "ctrl-bt", txt); b.type = "button";
      b.setAttribute("aria-label", rot); b.title = rot;
      if (desab) b.disabled = true;
      b.addEventListener("click", fn);
      return b;
    }
    box.appendChild(bt("−", "Afastar", function () { zoom(1.35); }, m >= n));
    box.appendChild(bt("+", "Aproximar", function () { zoom(1 / 1.35); }, m <= MINJAN));
    box.appendChild(bt("‹", "Voltar no tempo", function () { pan(-Math.max(1, Math.round(m * 0.25))); }, !vis || vis.i0 === 0));
    box.appendChild(bt("›", "Avançar no tempo", function () { pan(Math.max(1, Math.round(m * 0.25))); }, !vis || vis.i1 === n - 1));
    box.appendChild(bt("Tudo", "Ver a série inteira", function () { janela(n, true); desenhar(); }, m >= n));
    box.appendChild(el("span", "ctrl-cont", m + " de " + n + " candles"));
  }

  function extras() {
    var a = D.ativos.filter(function (x) { return x.id === ativoSel; })[0];
    if (!a) return;
    $("#grafico-legenda").innerHTML =
      '<i><span class="amostra" style="background:var(--atencao)"></span>média 8</i>' +
      '<i><span class="amostra" style="background:var(--mudo)"></span>média 20</i>' +
      '<i><span class="amostra" style="background:var(--acento)"></span>ADX</i>' +
      '<i><span class="amostra" style="height:0;border-top:2px dashed var(--acento)"></span>Fibo</i>';

    var fl = $("#fibo-lista"); fl.innerHTML = "";
    (a.fibo || []).forEach(function (f) {
      var gr = el("div", "fibo-grupo");
      gr.appendChild(el("h4", null, f.rotulo));
      gr.appendChild(el("p", "sub", "base " + fmt(f.base, a.casas) + " · topo " + fmt(f.topo, a.casas) + " · " + fmt(f.range, a.casas) + " pts"));
      var linhas = el("div", "fibo-linhas");
      f.niveis.forEach(function (nv) {
        var it = el("span", "fibo-item " + (nv.estado === "alvo" ? "" : nv.estado));
        it.innerHTML = "<b>" + nv.n + "</b> " + fmt(nv.preco, a.casas) +
          (nv.estado === "perdido" ? " · perdido" : (nv.estado === "segurando" ? " · segura" : ""));
        linhas.appendChild(it);
      });
      gr.appendChild(linhas);
      fl.appendChild(gr);
    });
  }

  function desenhar() { grafico(); controles(); extras(); }

  /* ---------- 4. balões ---------- */

  function baloes() {
    var box = $("#baloes"); box.innerHTML = "";
    (D.drivers || []).forEach(function (d) {
      var b = el("div", "balao p" + (d.peso || 1));
      var topo = el("div", "balao-topo");
      var s = d.direcao === "alta" ? "▲" : (d.direcao === "baixa" ? "▼" : "■");
      topo.appendChild(el("span", "dir " + d.direcao, s));
      topo.appendChild(el("h3", null, d.titulo));
      b.appendChild(topo);
      b.appendChild(el("p", null, d.texto));
      if (d.ativos) b.appendChild(el("div", "ativos", d.ativos));
      box.appendChild(b);
    });
  }

  /* ---------- 5. calendário ---------- */

  var SEM = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  var MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  function calendario() {
    var box = $("#calendario"); box.innerHTML = "";
    var porDia = {};
    (D.agenda || []).forEach(function (e) { (porDia[e.data] = porDia[e.data] || []).push(e); });
    var dias = Object.keys(porDia).sort();
    var amanha = dias[0];
    dias.forEach(function (dt) {
      var p = dt.split("-");
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      var cx = el("div", "dia" + (dt === amanha ? " amanha" : ""));
      var cab = el("div", "dia-cab");
      var nd = el("div");
      nd.appendChild(el("span", "dia-num num", p[2] + "/" + MES[+p[1] - 1]));
      cab.appendChild(nd);
      cab.appendChild(el("span", "dia-sem", dt === amanha ? "amanhã · " + SEM[d.getDay()] : SEM[d.getDay()]));
      cx.appendChild(cab);
      porDia[dt].sort(function (a, b) { return a.hora < b.hora ? -1 : 1; }).forEach(function (e) {
        var ev = el("div", "evt " + (e.impacto || ""));
        ev.appendChild(el("span", "evt-hora", e.hora));
        ev.appendChild(el("span", "pais " + e.pais, e.pais));
        ev.appendChild(el("span", "evt-nome", e.evento));
        cx.appendChild(ev);
      });
      box.appendChild(cx);
    });
    if (D.janela) {
      var j = el("div", "janela");
      j.innerHTML = "<b>" + esc(D.janela.inicio) + " – " + esc(D.janela.fim) + "</b> · " + esc(D.janela.nota);
      box.appendChild(j);
    }
  }

  /* ---------- 6. folha ---------- */

  function folha() {
    var btn = $("#btn-folha"), art = $("#folha");
    btn.addEventListener("click", function () {
      var abrir = art.hidden;
      art.hidden = !abrir;
      btn.textContent = abrir ? "Fechar" : "Abrir";
      btn.setAttribute("aria-expanded", abrir ? "true" : "false");
    });

    fetch("data/folhas/index.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (idx) {
      var lista = (idx.folhas || []).slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; });
      if (!lista.length) { art.innerHTML = "<p class='vazio'>Nenhuma folha publicada.</p>"; return; }
      function abrir(f) {
        fetch("data/folhas/" + f.arquivo, { cache: "no-store" }).then(function (r) { return r.text(); })
          .then(function (t) { art.innerHTML = md(t); art.hidden = false; btn.textContent = "Fechar"; });
      }
      abrir(lista[0]);
      art.hidden = true;
      var h = $("#historico"); h.innerHTML = "";
      lista.forEach(function (f) {
        var b = el("button", "hist"); b.type = "button";
        b.innerHTML = "<b>" + esc(f.data) + "</b>" + esc(f.titulo || "folha");
        b.addEventListener("click", function () { abrir(f); window.scrollTo({ top: art.offsetTop - 80, behavior: "smooth" }); });
        h.appendChild(b);
      });
    }).catch(function () { art.innerHTML = "<p class='vazio'>Sem índice de folhas.</p>"; });
  }

  /* ---------- abas ---------- */

  function abas() {
    var wa = $("#abas-ativo"); wa.innerHTML = "";
    D.ativos.forEach(function (a) {
      var b = el("button", "aba", a.nome); b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", a.id === ativoSel ? "true" : "false");
      b.addEventListener("click", function () { ativoSel = a.id; abas(); hierarquia(); desenhar(); });
      wa.appendChild(b);
    });
    var a0 = D.ativos.filter(function (x) { return x.id === ativoSel; })[0];
    var wt = $("#abas-tf"); wt.innerHTML = "";
    [["min60", "60 minutos"], ["diario", "Diário"]].forEach(function (t) {
      if (!a0 || !a0.grafico[t[0]]) return;
      var b = el("button", "aba", t[1]); b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", t[0] === tfSel ? "true" : "false");
      b.addEventListener("click", function () { tfSel = t[0]; abas(); desenhar(); });
      wt.appendChild(b);
    });
    if (a0 && !a0.grafico[tfSel]) { tfSel = "diario"; }
  }

  /* ---------- início ---------- */

  fetch("data/dados.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
    D = d;
    $("#carimbo").textContent = "dados de " + d.gerado_em;
    $("#fonte").textContent = d.fonte + (d.aviso ? " · " + d.aviso : "");
    cartoes(); abas(); hierarquia(); desenhar(); baloes(); calendario(); folha();
    window.addEventListener("resize", function () { clearTimeout(window.__t); window.__t = setTimeout(desenhar, 200); });
  }).catch(function (e) {
    $("#decisao").innerHTML = "<p class='vazio'>Não consegui carregar <code>data/dados.json</code>.</p>";
  });

})();
