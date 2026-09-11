/* Terminal Mesa v3 — tudo desenhado a partir de data/dados.json.
   Regra: nada é estimado aqui. O que não veio no dado não aparece na tela.
   MM8, MM20 e ADX 8,8 do gráfico são calculados aqui a partir dos candles. */

(function () {
  "use strict";

  var LS = "tmesa2:";
  var D = null, ativoSel = "ibov", tfSel = "min60";

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

  function ativo(id) { return D.ativos.filter(function (x) { return x.id === (id || ativoSel); })[0]; }

  /* ---------- 1. cartões de decisão ---------- */

  function cartoes() {
    var box = $("#decisao"); box.innerHTML = "";
    D.ativos.forEach(function (a) {
      var c = el("div", "cartao" + (a.manda ? " manda" : ""));
      var topo = el("div", "cartao-topo");
      var esq = el("div");
      var nome = el("div", "cartao-nome");
      nome.appendChild(document.createTextNode(a.nome));
      if (a.manda) nome.appendChild(el("span", "tag-manda", "quem manda"));
      esq.appendChild(nome);
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

      if (a.vencimento) {
        var vc = el("div", "venc");
        var l1 = el("div", "venc-l");
        l1.appendChild(el("b", null, a.vencimento.atual));
        l1.appendChild(el("span", null, "vence " + a.vencimento.ultimo_pregao));
        var quantos = a.vencimento.pregoes;
        l1.appendChild(el("span", "venc-conta" + (quantos <= 5 ? " perto" : ""),
          quantos + (quantos === 1 ? " pregão" : " pregões")));
        vc.appendChild(l1);
        vc.appendChild(el("div", "venc-l2", "depois: " + a.vencimento.proximo + " (até " + a.vencimento.proximo_ultimo_pregao + ")"));
        vc.title = a.vencimento.regra + " " + a.vencimento.rolagem;
        c.appendChild(vc);
      }

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

  /* ---------- 2. o plano ---------- */

  var ICONE = { esperar: "⏳", entrar: "▶", sair: "✕", alvo: "◎" };

  function planos() {
    var box = $("#plano"); if (!box) return;
    box.innerHTML = "";
    D.ativos.forEach(function (a) {
      var p = a.plano; if (!p) return;
      var c = el("div", "plano" + (p.opera ? " opera " + (p.lado || "") : " referencia"));

      var cab = el("div", "plano-cab");
      var esq = el("div");
      var h = el("h3");
      h.appendChild(document.createTextNode(a.nome));
      h.appendChild(el("span", "plano-contrato", a.contrato));
      esq.appendChild(h);
      esq.appendChild(el("p", "plano-frase", p.frase));
      cab.appendChild(esq);
      cab.appendChild(el("span", "selo " + a.veredito.toLowerCase(), a.veredito));
      c.appendChild(cab);

      if (p.passos && p.passos.length) {
        var lista = el("ol", "passos");
        p.passos.forEach(function (s, i) {
          var li = el("li", "passo " + s.tag);
          var top = el("div", "passo-top");
          var num = el("span", "passo-n");
          num.appendChild(el("i", null, ICONE[s.tag] || "•"));
          num.appendChild(document.createTextNode(String(i + 1)));
          top.appendChild(num);
          var mid = el("div", "passo-mid");
          mid.appendChild(el("span", "passo-rot", s.rot));
          mid.appendChild(el("div", "passo-titulo", s.titulo));
          top.appendChild(mid);
          if (s.numero) top.appendChild(el("span", "passo-num num", s.numero));
          li.appendChild(top);
          if (s.porque) {
            var d = el("details", "passo-pq");
            d.appendChild(el("summary", null, "por que esse número"));
            d.appendChild(el("p", null, s.porque));
            li.appendChild(d);
          }
          lista.appendChild(li);
        });
        c.appendChild(lista);
      }

      if (p.checagem && p.checagem.length) {
        var ck = el("ul", "checagem");
        p.checagem.forEach(function (t) { ck.appendChild(el("li", null, t)); });
        c.appendChild(ck);
      }

      if (p.nao_faca && p.nao_faca.length) {
        var nf = el("div", "naofaca");
        nf.appendChild(el("h4", null, "Não faça"));
        var ul = el("ul");
        p.nao_faca.forEach(function (t) { ul.appendChild(el("li", null, t)); });
        nf.appendChild(ul);
        c.appendChild(nf);
      }
      box.appendChild(c);
    });
    glossario();
  }

  /* ---------- glossário ---------- */

  var TERMOS = [
    ["Fechamento, não toque", "Um nível só vale quando o candle <b>fecha</b> além dele. Encostar e voltar não conta. É a diferença entre sair do trade e ficar nele — em 10/09 o preço furou a invalidação no pavio e depois subiu 2.900 pontos."],
    ["Candle de 15 min / 60 min", "Cada candle resume um período. O de 15 minutos fecha a cada quinze minutos; o de 60, de hora em hora. Use o de 15 para decidir <b>a hora</b> de entrar e o de 60 para decidir <b>o lado</b>."],
    ["Média de 8 e média de 20", "Duas linhas que acompanham o preço. Acima das duas é força compradora, abaixo das duas é força vendedora, entre elas é indecisão. Fechar além das duas no mesmo candle é o Duplo Rompimento."],
    ["Pernada", "O trecho de subida (ou de queda) que está mandando agora, medido de um fundo até um topo. Todos os níveis de Fibonacci saem dela."],
    ["23, 50, 78", "Onde o preço costuma parar quando volta atrás dentro de uma pernada. O 23 é a parada rasa, o 50 é a metade, o 78 é o último suporte antes de a pernada ser desfeita."],
    ["111, 127, 141, 161", "Projeções além do fim da pernada — os alvos quando o movimento continua."],
    ["ADX e aceleração", "Mede força, não direção. Tem aceleração quando está acima de 32 ou abaixo de 20; entre os dois o movimento não anda. Sem aceleração, posição menor."],
    ["IFR", "Termômetro de esticado. Acima de 70 a alta já correu muito; abaixo de 30, a queda. Não é sinal de entrada sozinho."],
    ["Player curto e player longo", "Quem opera o dia (5 e 15 min) e quem carrega posição (60 min, diário, semanal). Quando discordam é correção; quando concordam é tendência — e o risco passa a ser entrar esticado."],
    ["Invalidação", "O preço que apaga a leitura. Não é o seu stop de dinheiro: é o número que, se acontecer, faz o plano deixar de existir."]
  ];

  function glossario() {
    var box = $("#glossario"); if (!box) return;
    if (box.dataset.pronto === "1") return;
    box.dataset.pronto = "1";
    var det = el("details", "leg glos");
    det.open = get("glos_aberto", "") === "1";
    det.addEventListener("toggle", function () { set("glos_aberto", det.open ? "1" : "0"); });
    det.appendChild(el("summary", null, "Traduzindo os termos que aparecem acima"));
    var corpo = el("div", "leg-in");
    var gl = el("div", "leg-niveis");
    TERMOS.forEach(function (t) {
      var it = el("div", "leg-nivel");
      it.appendChild(el("h5", null, t[0]));
      var p = el("p"); p.innerHTML = t[1];
      it.appendChild(p);
      gl.appendChild(it);
    });
    corpo.appendChild(gl);
    det.appendChild(corpo);
    box.appendChild(det);
  }

  /* ---------- 3. players ---------- */

  function linhaPlayer(rot, p, sub) {
    var l = el("div", "pl-linha " + p.lado);
    var s = p.lado === "comprado" ? "▲" : (p.lado === "vendido" ? "▼" : "■");
    l.appendChild(el("span", "pl-seta", s));
    var m = el("div", "pl-meio");
    var t = el("div", "pl-rot");
    t.appendChild(el("b", null, rot));
    t.appendChild(el("span", null, sub));
    m.appendChild(t);
    m.appendChild(el("div", "pl-det", p.detalhe));
    l.appendChild(m);
    l.appendChild(el("span", "pl-lado", p.lado));
    return l;
  }

  function players() {
    var box = $("#players"); if (!box) return;
    box.innerHTML = "";
    D.ativos.forEach(function (a) {
      if (!a.players) return;
      var p = a.players;
      var c = el("div", "pl-cartao" + (a.manda ? " manda" : ""));
      var cab = el("div", "pl-cab");
      var nm = el("div", "pl-nome");
      nm.appendChild(document.createTextNode(a.nome));
      if (a.manda) nm.appendChild(el("span", "tag-manda", "quem manda"));
      cab.appendChild(nm);
      cab.appendChild(el("span", "pl-rel " + p.relacao,
        p.relacao === "juntos" ? "os dois do mesmo lado" :
        (p.relacao === "brigando" ? "brigando" : "sem consenso")));
      c.appendChild(cab);
      c.appendChild(linhaPlayer("Curto", p.curto, p.curto.tfs + " · até " + p.curto.ate));
      c.appendChild(linhaPlayer("Longo", p.longo, p.longo.tfs + " · até " + p.longo.ate));
      c.appendChild(el("p", "pl-texto", p.texto));
      box.appendChild(c);
    });
  }

  /* ---------- 3. hierarquia ---------- */

  var COLS = [["min5", "5 min", "curto"], ["min15", "15 min", "curto"],
              ["min60", "60 min", "longo"], ["diario", "Diário", "longo"],
              ["semanal", "Semanal", "longo"]];

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
    var a = ativo();
    var box = $("#hierarquia"); box.innerHTML = "";
    if (!a) return;
    var tabela = el("table", "grade");
    var cols = COLS.filter(function (t) { return a.tfs[t[0]]; });

    var thead = el("thead");
    var trg = el("tr", "grupo");
    trg.appendChild(el("th", null, ""));
    var nc = cols.filter(function (t) { return t[2] === "curto"; }).length;
    var nl = cols.length - nc;
    if (nc) { var t1 = el("th", "gr curto", "player curto"); t1.colSpan = nc; trg.appendChild(t1); }
    if (nl) { var t2 = el("th", "gr longo", "player longo"); t2.colSpan = nl; trg.appendChild(t2); }
    thead.appendChild(trg);
    var tr = el("tr");
    tr.appendChild(el("th", null, "Nível"));
    cols.forEach(function (t) { tr.appendChild(el("th", t[2], t[1])); });
    thead.appendChild(tr); tabela.appendChild(thead);

    var tb = el("tbody");
    NIVEIS.forEach(function (nv) {
      var linha = el("tr", nv.manda ? "manda" : null);
      var th = el("th");
      th.appendChild(el("span", "nv", String(nv.n)));
      th.appendChild(document.createTextNode(nv.nome));
      linha.appendChild(th);
      cols.forEach(function (t) {
        var td = el("td", t[2]);
        if (nv.campo === "fibo") {
          var f = a.fibo && a.fibo[0];
          td.appendChild(f ? chip("neutro", fmt(f.base, a.casas) + " → " + fmt(f.topo, a.casas), f.rotulo)
            : el("span", "chip n", "—"));
        } else if (nv.campo === "contexto") {
          var mx = a.tfs.semanal || a.tfs.diario;
          td.appendChild(mx ? chip(mx.posicao === "acima das duas" ? "compra" : "venda",
            t[2] === "curto" ? "manda o diário/semanal" : mx.posicao, "") : el("span", "chip n", "—"));
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
      "<b>As colunas estão divididas em dois players.</b> 5 e 15 min são o player curto — quem está operando o dia. 60 min, diário e semanal são o player longo — quem carrega posição. Divergência entre eles é a informação principal: curto contra longo é correção dentro de tendência, não reversão.",
      "<b>A linha cinza menor embaixo de cada chip</b> é o número cru que gerou o veredito. É ele que você confere no Profit — se não bater, o dado está velho.",
      "<b>As duas primeiras linhas ficam destacadas</b> porque mandam nas outras seis. Fibonacci e contexto decidem o lado; os indicadores só dizem a hora.",
      "<b>Acima de tudo isso está o Ibovespa.</b> A direção se lê no índice à vista; o WIN é só o instrumento. Quando os dois discordam, quem está certo é o índice.",
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

  /* ---------- 4. indicadores do gráfico (calculados aqui) ---------- */

  function emaJS(v, n) {
    var k = 2 / (n + 1), out = [], e = null;
    for (var i = 0; i < v.length; i++) { e = (e === null) ? v[i] : v[i] * k + e * (1 - k); out.push(e); }
    return out;
  }
  function smaJS(v, n) {
    var out = [], s = 0;
    for (var i = 0; i < v.length; i++) { s += v[i]; if (i >= n) s -= v[i - n]; out.push(s / Math.min(i + 1, n)); }
    return out;
  }
  function adxJS(C, n, media) {
    var tr = [0], pdm = [0], ndm = [0], i;
    for (i = 1; i < C.length; i++) {
      var h = C[i][2], l = C[i][3], cp = C[i - 1][4];
      tr.push(Math.max(h - l, Math.abs(h - cp), Math.abs(l - cp)));
      var up = h - C[i - 1][2], dn = C[i - 1][3] - l;
      pdm.push((up > dn && up > 0) ? up : 0);
      ndm.push((dn > up && dn > 0) ? dn : 0);
    }
    var atr = emaJS(tr, n), ap = emaJS(pdm, n), an = emaJS(ndm, n), dx = [];
    for (i = 0; i < C.length; i++) {
      var dip = atr[i] ? 100 * ap[i] / atr[i] : 0, dim = atr[i] ? 100 * an[i] / atr[i] : 0;
      var s = dip + dim;
      dx.push(s ? 100 * Math.abs(dip - dim) / s : 0);
    }
    return emaJS(dx, media);
  }
  function indicadores(g) {
    if (g.__ind) return g.__ind;
    var c = g.candles.map(function (x) { return x[4]; });
    g.__ind = { mm8: emaJS(c, 8), mm20: smaJS(c, 20), adx: adxJS(g.candles, 8, 8) };
    return g.__ind;
  }

  /* ---------- 5. gráfico interativo ---------- */

  var NS = "http://www.w3.org/2000/svg";
  function svgEl(t, at) {
    var n = document.createElementNS(NS, t);
    for (var k in at) if (at.hasOwnProperty(k)) n.setAttribute(k, at[k]);
    return n;
  }

  var MINJAN = 6;
  var vis = null;          // {chave, n, i0, i1, escY}
  var arrasto = null;      // arrasto horizontal (tempo)
  var arrastoY = null;     // arrasto vertical (escala de preço)

  function chaveSerie() { return ativoSel + ":" + tfSel; }

  function serie() {
    var a = ativo(); if (!a) return null;
    var g = a.grafico[tfSel] || a.grafico.diario;
    if (!g) return null;
    return { a: a, g: g };
  }

  function janela(n, reset) {
    if (reset || !vis || vis.chave !== chaveSerie() || vis.n !== n) {
      var inicial = Math.min(n, 60);           // abre mostrando os últimos 60 candles
      vis = { chave: chaveSerie(), n: n, i0: n - inicial, i1: n - 1, escY: 1 };
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
    if (ancora === undefined) ancora = vis.i1;
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

  function escala(f) {
    if (!vis) return;
    var e = Math.max(0.25, Math.min(6, (vis.escY || 1) * f));
    if (Math.abs(e - vis.escY) < 0.0005) return;
    vis.escY = e; desenhar();
  }

  function aoMover(ev) {
    if (arrastoY) {
      var dy = (ev.clientY - arrastoY.y) * arrastoY.esc;
      var f = Math.pow(1.006, -dy);                       // arrastar para cima estica
      var e = Math.max(0.25, Math.min(6, arrastoY.escY * f));
      if (vis && Math.abs(e - vis.escY) > 0.002) { vis.escY = e; desenhar(); }
      return;
    }
    if (!arrasto) return;
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
    if (!arrasto && !arrastoY) return;
    arrasto = null; arrastoY = null;
    document.body.classList.remove("arrastando");
    document.body.classList.remove("esticando");
  }
  window.addEventListener("pointermove", aoMover);
  window.addEventListener("pointerup", aoSoltar);
  window.addEventListener("pointercancel", aoSoltar);

  function grafico() {
    var S = serie();
    var box = $("#grafico"); box.innerHTML = "";
    if (!S) { box.appendChild(el("p", "vazio", "Sem série para este timeframe.")); return; }
    var a = S.a, g = S.g, C = g.candles, n = C.length, ind = indicadores(g);

    var v = janela(n), i0 = v.i0, i1 = v.i1, m = i1 - i0 + 1;

    var W = 1200, HP = 330, HA = 92, GAP = 26, PADL = 30, PADR = 74, PADT = 12;
    var H = PADT + HP + GAP + HA + 26;
    var AT = PADT + HP + GAP;

    var lo = Infinity, hi = -Infinity, i;
    for (i = i0; i <= i1; i++) {
      lo = Math.min(lo, C[i][3]); hi = Math.max(hi, C[i][2]);
      if (ind.mm8[i] != null) { lo = Math.min(lo, ind.mm8[i]); hi = Math.max(hi, ind.mm8[i]); }
      if (ind.mm20[i] != null) { lo = Math.min(lo, ind.mm20[i]); hi = Math.max(hi, ind.mm20[i]); }
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
    var centro = (lo + hi) / 2, meio = (hi - lo) / 2 / (v.escY || 1);
    lo = centro - meio; hi = centro + meio;

    var LW = W - PADL - PADR;
    var passo = LW / m;
    var larg = Math.max(1.2, Math.min(26, passo * 0.62));
    function X(k) { return PADL + passo * (k - i0 + 0.5); }
    function Y(p) { return PADT + HP - (p - lo) / (hi - lo) * HP; }

    var amax = 45;
    for (i = i0; i <= i1; i++) if (ind.adx[i] != null) amax = Math.max(amax, ind.adx[i] * 1.1);
    function YA(p) { return AT + HA - (p / amax) * HA; }

    var svg = svgEl("svg", {
      viewBox: "0 0 " + W + " " + H, tabindex: "0", role: "img",
      "aria-label": "Gráfico de " + a.nome + " — candles com médias 8 e 20, níveis de Fibonacci e painel de ADX. " +
        "Roda do mouse aproxima, arrastar anda no tempo, arrastar na faixa da direita estica a escala de preço."
    });

    // tudo que é do painel de preço fica recortado nele, para não vazar quando a escala estica
    var idc = "clip-preco";
    var defs = svgEl("defs");
    var cp = svgEl("clipPath", { id: idc });
    cp.appendChild(svgEl("rect", { x: PADL, y: PADT, width: LW, height: HP }));
    defs.appendChild(cp);
    svg.appendChild(defs);
    var gp = svgEl("g", { "clip-path": "url(#" + idc + ")" });

    // grade + eixo de preço
    var passos = 6;
    for (var k = 0; k <= passos; k++) {
      var pv = lo + (hi - lo) * k / passos, y = Y(pv);
      gp.appendChild(svgEl("line", { x1: PADL, y1: y, x2: PADL + LW, y2: y,
        stroke: "var(--linha)", "stroke-width": 1 }));
      var tx = svgEl("text", { x: PADL + LW + 8, y: y + 4, fill: "var(--mudo)",
        "font-size": 11, "font-family": "var(--mono)" });
      tx.textContent = fmt(pv, a.casas);
      svg.appendChild(tx);
    }

    // fibos
    fib.forEach(function (nv) {
      var y2 = Y(nv.preco);
      if (y2 < PADT || y2 > PADT + HP) return;
      var cor = nv.estado === "perdido" ? "var(--baixa)" : "var(--acento)";
      gp.appendChild(svgEl("line", { x1: PADL, y1: y2, x2: PADL + LW, y2: y2,
        stroke: cor, "stroke-width": 1.5, "stroke-dasharray": "5 4", opacity: .6 }));
      var t = svgEl("text", { x: PADL + 6, y: y2 - 5, fill: cor, "font-size": 10.5,
        "font-weight": 700, "font-family": "var(--mono)" });
      t.textContent = "Fibo " + nv.n + " · " + fmt(nv.preco, a.casas);
      gp.appendChild(t);
    });

    // candles
    for (i = i0; i <= i1; i++) {
      var c = C[i], o = c[1], h2 = c[2], l2 = c[3], cl = c[4];
      var cor2 = cl >= o ? "var(--alta)" : "var(--baixa)";
      gp.appendChild(svgEl("line", { x1: X(i), y1: Y(h2), x2: X(i), y2: Y(l2),
        stroke: cor2, "stroke-width": Math.max(1.1, larg * 0.16) }));
      var ya = Y(Math.max(o, cl)), yb = Y(Math.min(o, cl));
      gp.appendChild(svgEl("rect", { x: X(i) - larg / 2, y: ya, width: larg,
        height: Math.max(1.1, yb - ya), fill: cor2, rx: 1 }));
    }

    function linha(arr, cor, lt, fy, dest) {
      var d = "", primeiro = true;
      for (var j = i0; j <= i1; j++) {
        if (arr[j] == null) continue;
        d += (primeiro ? "M" : "L") + X(j).toFixed(1) + " " + fy(arr[j]).toFixed(1) + " ";
        primeiro = false;
      }
      if (d) (dest || svg).appendChild(svgEl("path", { d: d, fill: "none", stroke: cor,
        "stroke-width": lt, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    }
    linha(ind.mm20, "var(--mudo)", 2, Y, gp);
    linha(ind.mm8, "var(--atencao)", 2, Y, gp);
    svg.appendChild(gp);

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
    var cpa = svgEl("clipPath", { id: "clip-adx" });
    cpa.appendChild(svgEl("rect", { x: PADL, y: AT, width: LW, height: HA }));
    defs.appendChild(cpa);
    var ga = svgEl("g", { "clip-path": "url(#clip-adx)" });
    linha(ind.adx, "var(--acento)", 2, YA, ga);
    svg.appendChild(ga);
    var rot = svgEl("text", { x: PADL + 8, y: AT + 15, fill: "var(--mudo)", "font-size": 10.5,
      "font-weight": 700, "letter-spacing": ".06em" });
    rot.textContent = "ADX 8,8";
    svg.appendChild(rot);

    // datas
    var marcas = Math.max(2, Math.min(8, m));
    for (var j2 = 0; j2 < marcas; j2++) {
      var idx = i0 + Math.round(j2 * (m - 1) / (marcas - 1 || 1));
      var td = svgEl("text", { x: X(idx), y: H - 6, fill: "var(--mudo)", "font-size": 10.5,
        "text-anchor": "middle", "font-family": "var(--mono)" });
      td.textContent = C[idx][0];
      svg.appendChild(td);
    }

    // faixa da direita: arrastar para esticar a escala de preço
    var faixaY = svgEl("rect", { x: PADL + LW, y: PADT, width: PADR, height: HP,
      fill: "transparent", style: "cursor:ns-resize" });
    svg.appendChild(faixaY);

    /* --- cruz + leitura do candle --- */
    var cruz = svgEl("g", { visibility: "hidden", "pointer-events": "none" });
    var faixa = svgEl("rect", { y: PADT, height: HP + GAP + HA, fill: "var(--acento)", opacity: .09, rx: 2 });
    var vlin = svgEl("line", { y1: PADT, y2: AT + HA, stroke: "var(--tinta2)", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: .7 });
    var hlin = svgEl("line", { x1: PADL, x2: PADL + LW, stroke: "var(--tinta2)", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: .7 });
    var tagBg = svgEl("rect", { width: 66, height: 17, rx: 4, fill: "var(--tinta2)" });
    var tagTx = svgEl("text", { fill: "var(--plano)", "font-size": 10.5, "font-family": "var(--mono)", "text-anchor": "middle" });
    cruz.appendChild(faixa); cruz.appendChild(vlin); cruz.appendChild(hlin);
    cruz.appendChild(tagBg); cruz.appendChild(tagTx);
    svg.appendChild(cruz);

    var dica = el("div", "dica"); dica.hidden = true;

    function coord(ev) {
      var r = svg.getBoundingClientRect();
      var e = W / r.width;
      return { esc: e, x: (ev.clientX - r.left) * e, y: (ev.clientY - r.top) * e,
        rx: ev.clientX - r.left, rw: r.width };
    }
    function idxDe(p) {
      return Math.max(i0, Math.min(i1, i0 + Math.floor((p.x - PADL) / passo)));
    }
    function noEixo(p) { return p.x > PADL + LW; }

    svg.addEventListener("pointermove", function (ev) {
      if (arrasto || arrastoY) { cruz.setAttribute("visibility", "hidden"); dica.hidden = true; return; }
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
        tagTx.setAttribute("x", PADL + LW + 37); tagTx.setAttribute("y", p.y + 3.5);
        tagTx.textContent = fmt(pv2, a.casas);
      }
      dica.hidden = false;
      dica.innerHTML =
        "<b>" + esc(cd[0]) + "</b>" +
        "<span><i>abre</i>" + fmt(cd[1], a.casas) + "</span>" +
        "<span><i>máx</i>" + fmt(cd[2], a.casas) + "</span>" +
        "<span><i>mín</i>" + fmt(cd[3], a.casas) + "</span>" +
        "<span><i>fecha</i>" + fmt(cd[4], a.casas) + "</span>" +
        "<span class='m8'><i>MM8</i>" + fmt(ind.mm8[i3], a.casas) + "</span>" +
        "<span class='m20'><i>MM20</i>" + fmt(ind.mm20[i3], a.casas) + "</span>" +
        "<span class='adx'><i>ADX</i>" + fmt(ind.adx[i3], 1) + "</span>";
      var larguraDica = 170;
      var esq = p.rx + 18;
      if (esq + larguraDica > p.rw - 6) esq = p.rx - larguraDica - 18;
      dica.style.left = Math.max(4, esq) + "px";
      dica.style.top = Math.max(4, (p.y / p.esc) - 10) + "px";
    });
    svg.addEventListener("pointerleave", function () {
      cruz.setAttribute("visibility", "hidden"); dica.hidden = true;
    });

    svg.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      var p = coord(ev);
      if (noEixo(p)) { escala(ev.deltaY > 0 ? 1 / 1.15 : 1.15); return; }
      zoom(ev.deltaY > 0 ? 1.25 : 1 / 1.25, idxDe(p));
    }, { passive: false });

    svg.addEventListener("pointerdown", function (ev) {
      if (ev.button) return;
      ev.preventDefault();
      var r = svg.getBoundingClientRect(), e = W / r.width;
      var p = coord(ev);
      if (noEixo(p)) {
        arrastoY = { y: ev.clientY, escY: v.escY || 1, esc: e };
        document.body.classList.add("esticando");
      } else {
        arrasto = { x: ev.clientX, i0: i0, i1: i1, n: n, passo: passo, esc: e };
        document.body.classList.add("arrastando");
      }
      cruz.setAttribute("visibility", "hidden"); dica.hidden = true;
    });
    svg.addEventListener("dblclick", function (ev) {
      var p = coord(ev);
      if (noEixo(p)) { vis.escY = 1; desenhar(); return; }
      janela(n, true); desenhar();
    });

    svg.addEventListener("keydown", function (ev) {
      var pt = Math.max(1, Math.round((i1 - i0 + 1) * 0.2));
      if (ev.key === "ArrowLeft") { pan(-pt); ev.preventDefault(); }
      else if (ev.key === "ArrowRight") { pan(pt); ev.preventDefault(); }
      else if (ev.key === "ArrowUp") { escala(1.15); ev.preventDefault(); }
      else if (ev.key === "ArrowDown") { escala(1 / 1.15); ev.preventDefault(); }
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

    function bt(txt, rot, fn, desab, cls) {
      var b = el("button", "ctrl-bt" + (cls ? " " + cls : ""), txt); b.type = "button";
      b.setAttribute("aria-label", rot); b.title = rot;
      if (desab) b.disabled = true;
      b.addEventListener("click", fn);
      return b;
    }
    var g1 = el("div", "ctrl-g");
    g1.appendChild(bt("−", "Afastar — mostra mais candles", function () { zoom(1.6); }, m >= n, "gr"));
    g1.appendChild(bt("+", "Aproximar", function () { zoom(1 / 1.6); }, m <= MINJAN, "gr"));
    g1.appendChild(bt("‹", "Voltar no tempo", function () { pan(-Math.max(1, Math.round(m * 0.3))); }, !vis || vis.i0 === 0));
    g1.appendChild(bt("›", "Avançar no tempo", function () { pan(Math.max(1, Math.round(m * 0.3))); }, !vis || vis.i1 === n - 1));
    g1.appendChild(bt("Tudo", "Ver a série inteira", function () { vis.i0 = 0; vis.i1 = n - 1; desenhar(); }, m >= n));
    box.appendChild(g1);

    var g2 = el("div", "ctrl-g");
    g2.appendChild(el("span", "ctrl-rot", "altura"));
    g2.appendChild(bt("↕", "Esticar a escala de preço", function () { escala(1.3); }, false, "gr"));
    g2.appendChild(bt("↔", "Achatar a escala de preço", function () { escala(1 / 1.3); }, false, "gr"));
    g2.appendChild(bt("⟲", "Voltar a escala automática", function () { if (vis) { vis.escY = 1; desenhar(); } },
      !vis || Math.abs((vis.escY || 1) - 1) < 0.01));
    box.appendChild(g2);

    box.appendChild(el("span", "ctrl-cont", m + " de " + n + " candles"));
  }

  function extras() {
    var a = ativo(); if (!a) return;
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

  /* ---------- 6. balões ---------- */

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

  /* ---------- 7. calendário ---------- */

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

  /* ---------- 8. folha (sempre fechada por padrão) ---------- */

  function folha() {
    var btn = $("#btn-folha"), art = $("#folha");
    function abre(v) {
      art.hidden = !v;
      btn.textContent = v ? "Fechar" : "Abrir";
      btn.setAttribute("aria-expanded", v ? "true" : "false");
    }
    abre(false);
    btn.addEventListener("click", function () { abre(art.hidden); });

    fetch("data/folhas/index.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (idx) {
      var lista = (idx.folhas || []).slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; });
      if (!lista.length) { art.innerHTML = "<p class='vazio'>Nenhuma folha publicada.</p>"; return; }
      function carrega(f, mostrar) {
        fetch("data/folhas/" + f.arquivo, { cache: "no-store" }).then(function (r) { return r.text(); })
          .then(function (t) { art.innerHTML = md(t); if (mostrar) abre(true); });
      }
      carrega(lista[0], false);            // carrega mas NÃO abre
      var h = $("#historico"); h.innerHTML = "";
      lista.forEach(function (f) {
        var b = el("button", "hist"); b.type = "button";
        b.innerHTML = "<b>" + esc(f.data) + "</b>" + esc(f.titulo || "folha");
        b.addEventListener("click", function () {
          carrega(f, true);
          window.scrollTo({ top: art.offsetTop - 80, behavior: "smooth" });
        });
        h.appendChild(b);
      });
    }).catch(function () { art.innerHTML = "<p class='vazio'>Sem índice de folhas.</p>"; });
  }

  /* ---------- abas ---------- */

  var TFS = [["min5", "5 min"], ["min15", "15 min"], ["min60", "60 min"], ["diario", "Diário"]];

  function abas() {
    var wa = $("#abas-ativo"); wa.innerHTML = "";
    D.ativos.forEach(function (a) {
      var b = el("button", "aba", a.nome); b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", a.id === ativoSel ? "true" : "false");
      b.addEventListener("click", function () { ativoSel = a.id; abas(); hierarquia(); desenhar(); });
      wa.appendChild(b);
    });
    var a0 = ativo();
    if (a0 && !a0.grafico[tfSel]) tfSel = "diario";
    var wt = $("#abas-tf"); wt.innerHTML = "";
    TFS.forEach(function (t) {
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
    if (!ativo()) ativoSel = D.ativos[0].id;
    $("#carimbo").textContent = "dados de " + d.gerado_em;
    $("#fonte").textContent = d.fonte + (d.aviso ? " · " + d.aviso : "");
    cartoes(); planos(); players(); abas(); hierarquia(); desenhar(); baloes(); calendario(); folha();
    window.addEventListener("resize", function () { clearTimeout(window.__t); window.__t = setTimeout(desenhar, 200); });
  }).catch(function (e) {
    $("#decisao").innerHTML = "<p class='vazio'>Não consegui carregar <code>data/dados.json</code>.</p>";
  });

})();
