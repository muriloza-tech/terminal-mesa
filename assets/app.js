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
  }

  /* ---------- 3. gráfico ---------- */

  var NS = "http://www.w3.org/2000/svg";
  function svgEl(t, at) {
    var n = document.createElementNS(NS, t);
    for (var k in at) if (at.hasOwnProperty(k)) n.setAttribute(k, at[k]);
    return n;
  }

  function grafico() {
    var a = D.ativos.filter(function (x) { return x.id === ativoSel; })[0];
    var box = $("#grafico"); box.innerHTML = "";
    if (!a) return;
    var g = a.grafico[tfSel] || a.grafico.diario;
    if (!g) { box.appendChild(el("p", "vazio", "Sem série para este timeframe.")); return; }

    var C = g.candles, n = C.length;
    var W = 1200, HP = 300, HA = 90, GAP = 26, PADL = 30, PADR = 68, PADT = 12;
    var H = PADT + HP + GAP + HA + 26;

    var lo = Infinity, hi = -Infinity;
    C.forEach(function (c) { lo = Math.min(lo, c[3]); hi = Math.max(hi, c[2]); });
    g.mm8.concat(g.mm20).forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });

    var fib = [];
    if (a.fibo && a.fibo[0]) {
      a.fibo[0].niveis.forEach(function (nv) {
        if (nv.tipo === "retração" && nv.preco > lo * 0.97 && nv.preco < hi * 1.03) fib.push(nv);
      });
    }
    fib.forEach(function (nv) { lo = Math.min(lo, nv.preco); hi = Math.max(hi, nv.preco); });

    var pad = (hi - lo) * 0.06 || 1;
    lo -= pad; hi += pad;
    var LW = W - PADL - PADR;
    var passo = LW / n;
    var larg = Math.max(1.5, Math.min(9, passo * 0.62));
    function X(i) { return PADL + passo * (i + 0.5); }
    function Y(v) { return PADT + HP - (v - lo) / (hi - lo) * HP; }

    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "Gráfico de " + a.nome + " com médias 8 e 20 e níveis de Fibonacci" });

    var passos = 5;
    for (var k = 0; k <= passos; k++) {
      var v = lo + (hi - lo) * k / passos, y = Y(v);
      svg.appendChild(svgEl("line", { x1: PADL, y1: y, x2: PADL + LW, y2: y,
        stroke: "var(--linha)", "stroke-width": 1 }));
      var tx = svgEl("text", { x: PADL + LW + 8, y: y + 4, fill: "var(--mudo)",
        "font-size": 11, "font-family": "var(--mono)" });
      tx.textContent = fmt(v, a.casas);
      svg.appendChild(tx);
    }

    fib.forEach(function (nv) {
      var y = Y(nv.preco);
      var cor = nv.estado === "perdido" ? "var(--baixa)" : "var(--acento)";
      svg.appendChild(svgEl("line", { x1: PADL, y1: y, x2: PADL + LW, y2: y,
        stroke: cor, "stroke-width": 1.5, "stroke-dasharray": "5 4", opacity: .6 }));
      var t = svgEl("text", { x: PADL + 6, y: y - 5, fill: cor, "font-size": 10.5,
        "font-weight": 700, "font-family": "var(--mono)" });
      t.textContent = "Fibo " + nv.n + " · " + fmt(nv.preco, a.casas);
      svg.appendChild(t);
    });

    C.forEach(function (c, i) {
      var o = c[1], h = c[2], l = c[3], cl = c[4];
      var sobe = cl >= o;
      var cor = sobe ? "var(--alta)" : "var(--baixa)";
      svg.appendChild(svgEl("line", { x1: X(i), y1: Y(h), x2: X(i), y2: Y(l),
        stroke: cor, "stroke-width": 1.2 }));
      var y1 = Y(Math.max(o, cl)), y2 = Y(Math.min(o, cl));
      svg.appendChild(svgEl("rect", { x: X(i) - larg / 2, y: y1, width: larg,
        height: Math.max(1.2, y2 - y1), fill: cor, rx: 1 }));
    });

    function linha(arr, cor, larguraTraco) {
      var d = arr.map(function (v, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1); }).join(" ");
      svg.appendChild(svgEl("path", { d: d, fill: "none", stroke: cor,
        "stroke-width": larguraTraco, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    }
    linha(g.mm20, "var(--mudo)", 2);
    linha(g.mm8, "var(--atencao)", 2);

    var AT = PADT + HP + GAP;
    var amax = Math.max(45, Math.max.apply(null, g.adx) * 1.1);
    function YA(v) { return AT + HA - (v / amax) * HA; }
    svg.appendChild(svgEl("rect", { x: PADL, y: AT, width: LW, height: HA,
      fill: "var(--sup2)", rx: 6 }));
    [20, 32].forEach(function (nivel) {
      if (nivel > amax) return;
      var y = YA(nivel);
      svg.appendChild(svgEl("line", { x1: PADL, y1: y, x2: PADL + LW, y2: y,
        stroke: nivel === 32 ? "var(--atencao)" : "var(--mudo)", "stroke-width": 1,
        "stroke-dasharray": "4 4", opacity: .8 }));
      var t2 = svgEl("text", { x: PADL + LW + 8, y: y + 4, fill: "var(--mudo)", "font-size": 10.5,
        "font-family": "var(--mono)" });
      t2.textContent = String(nivel);
      svg.appendChild(t2);
    });
    var dadx = g.adx.map(function (v, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + YA(v).toFixed(1); }).join(" ");
    svg.appendChild(svgEl("path", { d: dadx, fill: "none", stroke: "var(--acento)", "stroke-width": 2,
      "stroke-linejoin": "round" }));
    var rot = svgEl("text", { x: PADL + 8, y: AT + 15, fill: "var(--mudo)", "font-size": 10.5,
      "font-weight": 700, "letter-spacing": ".06em" });
    rot.textContent = "ADX 8,8";
    svg.appendChild(rot);

    var marcas = Math.min(7, n);
    for (var j = 0; j < marcas; j++) {
      var idx = Math.round(j * (n - 1) / (marcas - 1 || 1));
      var td = svgEl("text", { x: X(idx), y: H - 6, fill: "var(--mudo)", "font-size": 10.5,
        "text-anchor": "middle", "font-family": "var(--mono)" });
      td.textContent = C[idx][0];
      svg.appendChild(td);
    }

    box.appendChild(svg);
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

  function desenhar() { grafico(); extras(); }

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
    if (a0 && !a0.grafico[tfSel]) tfSel = "diario";
    var wt = $("#abas-tf"); wt.innerHTML = "";
    [["min60", "60 minutos"], ["diario", "Diário"]].forEach(function (t) {
      if (!a0 || !a0.grafico[t[0]]) return;
      var b = el("button", "aba", t[1]); b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", t[0] === tfSel ? "true" : "false");
      b.addEventListener("click", function () { tfSel = t[0]; abas(); desenhar(); });
      wt.appendChild(b);
    });
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
