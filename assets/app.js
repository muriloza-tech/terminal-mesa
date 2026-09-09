/* Terminal Mesa — front-end estático.
   Regra number one deste arquivo: nunca inventar preço.
   Fonte que falha vira cartão cinza com "sem fonte", nunca um número plausível. */

(function () {
  "use strict";

  var LS = "tmesa:";

  function get(k, d) {
    try { var v = localStorage.getItem(LS + k); return v === null ? d : v; }
    catch (e) { return d; }
  }
  function set(k, v) {
    try { localStorage.setItem(LS + k, v); } catch (e) { /* modo privado */ }
  }
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined) n.textContent = txt;
    return n;
  }

  /* ---------------- tema ---------------- */

  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  applyTheme(get("theme", "auto"));

  $("#btn-theme").addEventListener("click", function () {
    var order = ["auto", "light", "dark"];
    var next = order[(order.indexOf(get("theme", "auto")) + 1) % 3];
    set("theme", next);
    applyTheme(next);
    this.title = "Tema: " + next;
  });

  /* ---------------- relógio ---------------- */

  function fmtHora(d) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  function tick() {
    var d = new Date();
    $("#clock").textContent = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + "  " + fmtHora(d);
  }
  tick();
  setInterval(tick, 20000);

  /* ---------------- abas ---------------- */

  var tabs = document.querySelectorAll(".tab");
  Array.prototype.forEach.call(tabs, function (t) {
    t.addEventListener("click", function () {
      Array.prototype.forEach.call(tabs, function (o) {
        var on = o === t;
        o.setAttribute("aria-selected", on ? "true" : "false");
        $("#panel-" + o.dataset.tab).hidden = !on;
      });
      set("tab", t.dataset.tab);
    });
  });
  (function () {
    var saved = get("tab", "folha");
    var t = document.querySelector('.tab[data-tab="' + saved + '"]');
    if (t) t.click();
  })();

  /* ---------------- ajustes ---------------- */

  var settings = $("#settings"), btnSettings = $("#btn-settings");
  btnSettings.addEventListener("click", function () {
    var open = settings.hidden;
    settings.hidden = !open;
    btnSettings.setAttribute("aria-expanded", open ? "true" : "false");
  });

  var inToken = $("#in-token"), inInterval = $("#in-interval"), inWin = $("#in-win"), inWdo = $("#in-wdo");
  inToken.value = get("brapi", "");
  inInterval.value = get("interval", "60");
  inWin.value = get("win", "");
  inWdo.value = get("wdo", "");

  inToken.addEventListener("change", function () { set("brapi", this.value.trim()); carregarPrecos(); });
  inInterval.addEventListener("change", function () { set("interval", this.value); agendar(); });
  inWin.addEventListener("input", function () { set("win", this.value.trim()); renderManuais(); });
  inWdo.addEventListener("input", function () { set("wdo", this.value.trim()); renderManuais(); });

  /* ---------------- markdown mínimo ---------------- */

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function linhaTabela(l) {
    var c = l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
    return c.map(function (x) { return x.trim(); });
  }
  function md(src) {
    var linhas = String(src).replace(/\r\n/g, "\n").split("\n");
    var out = [], i = 0;

    function flushLista(tag, itens) {
      out.push("<" + tag + ">" + itens.map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("") + "</" + tag + ">");
    }

    while (i < linhas.length) {
      var l = linhas[i];

      if (/^\s*$/.test(l)) { i++; continue; }

      if (/^---+\s*$/.test(l)) { out.push("<hr>"); i++; continue; }

      var h = l.match(/^(#{1,4})\s+(.*)$/);
      if (h) { var n = h[1].length; out.push("<h" + n + ">" + inline(h[2]) + "</h" + n + ">"); i++; continue; }

      if (/^>\s?/.test(l)) {
        var q = [];
        while (i < linhas.length && /^>\s?/.test(linhas[i])) { q.push(linhas[i].replace(/^>\s?/, "")); i++; }
        out.push("<blockquote>" + inline(q.join(" ")) + "</blockquote>");
        continue;
      }

      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < linhas.length && /^\s*\|[\s:|-]+\|\s*$/.test(linhas[i + 1])) {
        var head = linhaTabela(l);
        i += 2;
        var corpo = [];
        while (i < linhas.length && /^\s*\|.*\|\s*$/.test(linhas[i])) { corpo.push(linhaTabela(linhas[i])); i++; }
        var t = "<div class='table-wrap'><table><thead><tr>" +
          head.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") +
          "</tr></thead><tbody>" +
          corpo.map(function (r) {
            return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>";
          }).join("") + "</tbody></table></div>";
        out.push(t);
        continue;
      }

      if (/^\s*[-*]\s+/.test(l)) {
        var ul = [];
        while (i < linhas.length && /^\s*[-*]\s+/.test(linhas[i])) { ul.push(linhas[i].replace(/^\s*[-*]\s+/, "")); i++; }
        flushLista("ul", ul);
        continue;
      }

      if (/^\s*\d+[.)]\s+/.test(l)) {
        var ol = [];
        while (i < linhas.length && /^\s*\d+[.)]\s+/.test(linhas[i])) { ol.push(linhas[i].replace(/^\s*\d+[.)]\s+/, "")); i++; }
        flushLista("ol", ol);
        continue;
      }

      var p = [];
      while (i < linhas.length && !/^\s*$/.test(linhas[i]) && !/^(#{1,4}\s|>|\s*[-*]\s|\s*\d+[.)]\s|---+\s*$)/.test(linhas[i]) && !/^\s*\|/.test(linhas[i])) {
        p.push(linhas[i]); i++;
      }
      if (p.length) out.push("<p>" + inline(p.join(" ")) + "</p>");
      else i++;
    }
    return out.join("\n");
  }

  /* ---------------- carregamento de dados locais ---------------- */

  /* Modo embutido: se a página trouxer os dados dentro dela (build de preview,
     um arquivo só), servimos daí em vez de buscar do disco. No site normal
     esses objetos não existem e cai no fetch de sempre. */

  function json(url) {
    if (window.__TM_DATA && Object.prototype.hasOwnProperty.call(window.__TM_DATA, url)) {
      return Promise.resolve(JSON.parse(JSON.stringify(window.__TM_DATA[url])));
    }
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    });
  }
  function texto(url) {
    if (window.__TM_TEXT && Object.prototype.hasOwnProperty.call(window.__TM_TEXT, url)) {
      return Promise.resolve(window.__TM_TEXT[url]);
    }
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.text();
    });
  }

  if (window.__TM_PREVIEW) {
    var aviso = el("p", "disclaimer aviso");
    aviso.innerHTML = "<strong>Prévia.</strong> Este ambiente bloqueia chamada a servidor externo, " +
      "então nenhum cartão consegue buscar preço e todos aparecem como “sem fonte”. " +
      "É exatamente o comportamento correto quando a fonte cai. No GitHub Pages ou rodando local, os preços entram.";
    var alvo = document.querySelector("#panel-precos .disclaimer");
    if (alvo && alvo.parentNode) alvo.parentNode.insertBefore(aviso, alvo);
  }

  /* ---------------- folha e histórico ---------------- */

  var indiceFolhas = [];

  function abrirFolha(entrada) {
    $("#folha-meta").textContent = entrada.data + (entrada.titulo ? " · " + entrada.titulo : "");
    $("#folha-body").innerHTML = "<p class='loading'>Carregando…</p>";
    texto("data/folhas/" + entrada.arquivo)
      .then(function (t) { $("#folha-body").innerHTML = md(t); })
      .catch(function () {
        $("#folha-body").innerHTML = "<p class='empty'>Não consegui abrir <code>data/folhas/" +
          esc(entrada.arquivo) + "</code>. O arquivo está listado no índice mas não existe no repo.</p>";
      });
  }

  json("data/folhas/index.json").then(function (idx) {
    indiceFolhas = (idx.folhas || []).slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; });

    if (!indiceFolhas.length) {
      $("#folha-body").innerHTML = "<p class='empty'>Nenhuma folha publicada ainda.</p>";
      $("#historico").innerHTML = "<p class='empty'>Vazio.</p>";
      return;
    }

    abrirFolha(indiceFolhas[0]);

    var h = $("#historico");
    h.innerHTML = "";
    indiceFolhas.forEach(function (f) {
      var b = el("button", "hist-link");
      b.type = "button";
      b.appendChild(el("span", "d", f.data));
      b.appendChild(el("span", "t", f.titulo || "folha"));
      b.addEventListener("click", function () {
        abrirFolha(f);
        document.querySelector('.tab[data-tab="folha"]').click();
        window.scrollTo(0, 0);
      });
      h.appendChild(b);
    });
  }).catch(function () {
    $("#folha-body").innerHTML = "<p class='empty'>Sem <code>data/folhas/index.json</code>.</p>";
  });

  /* ---------------- alertas e agenda ---------------- */

  json("data/alerts.json").then(function (d) {
    var box = $("#alertas"), lista = (d.alertas || d.alerts || []);
    box.innerHTML = "";
    if (!lista.length) { box.innerHTML = "<p class='empty'>Fila limpa. Nada HIGH/EXTREME agora.</p>"; return; }
    lista.forEach(function (a) {
      var nivel = String(a.nivel || a.level || "watch").toLowerCase();
      var it = el("div", "item " + nivel);
      var row = el("div", "row");
      row.appendChild(el("span", "badge" + (nivel === "high" || nivel === "extreme" ? " warn" : ""), nivel.toUpperCase()));
      if (a.ativo) row.appendChild(el("span", "tile-sym", a.ativo));
      if (a.hora) { var t = el("time", null, a.hora); row.appendChild(t); }
      it.appendChild(row);
      it.appendChild(el("h4", null, a.fato || a.titulo || "—"));
      if (a.porque) it.appendChild(el("p", null, a.porque));
      box.appendChild(it);
    });
  }).catch(function () { $("#alertas").innerHTML = "<p class='empty'>Sem <code>data/alerts.json</code>.</p>"; });

  json("data/calendar.json").then(function (d) {
    var box = $("#agenda"), lista = (d.eventos || []);
    box.innerHTML = "";
    if (!lista.length) { box.innerHTML = "<p class='empty'>Calendário vazio.</p>"; return; }
    lista.sort(function (a, b) { return a.data < b.data ? -1 : 1; }).forEach(function (e) {
      var it = el("div", "item");
      var row = el("div", "row");
      row.appendChild(el("span", "badge", e.data));
      if (e.ativos) row.appendChild(el("span", "tile-sym", e.ativos));
      it.appendChild(row);
      it.appendChild(el("h4", null, e.evento));
      if (e.porque) it.appendChild(el("p", null, e.porque));
      box.appendChild(it);
    });
  }).catch(function () { $("#agenda").innerHTML = "<p class='empty'>Sem <code>data/calendar.json</code>.</p>"; });

  /* ---------------- preços ---------------- */

  var config = null;
  var estado = {};   /* sym -> {valor, pct, hist, fonte, hora, erro} */

  function fmtNum(v, casas) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
  }
  function casasPara(v) {
    var a = Math.abs(v);
    if (a >= 1000) return 0;
    if (a >= 10) return 2;
    if (a >= 1) return 3;
    return 4;
  }

  function sparkline(hist) {
    if (!hist || hist.length < 3) return null;
    var w = 200, h = 36, pad = 3;
    var min = Math.min.apply(null, hist), max = Math.max.apply(null, hist);
    var span = (max - min) || 1;
    var pts = hist.map(function (v, i) {
      var x = pad + (i / (hist.length - 1)) * (w - pad * 2);
      var y = h - pad - ((v - min) / span) * (h - pad * 2);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", h);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "tile-spark");
    var pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    pl.setAttribute("points", pts);
    pl.setAttribute("fill", "none");
    pl.setAttribute("stroke", "var(--series-1)");
    pl.setAttribute("stroke-width", "2");
    pl.setAttribute("stroke-linecap", "round");
    pl.setAttribute("stroke-linejoin", "round");
    pl.setAttribute("vector-effect", "non-scaling-stroke");
    svg.appendChild(pl);
    return svg;
  }

  function cartao(item) {
    var st = estado[item.sym] || {};
    var t = el("div", "tile");
    if (item.fonte === "manual") t.classList.add("manual");

    var lab = el("div", "tile-label", item.label);
    t.appendChild(lab);

    var vivo = st.valor !== undefined && st.valor !== null && !isNaN(st.valor);

    if (!vivo) {
      t.classList.add("dead");
      t.appendChild(el("div", "tile-value", item.fonte === "manual" ? "não informado" : "sem fonte"));
      var f0 = el("div", "tile-foot");
      f0.appendChild(el("span", null, st.erro || (item.fonte === "manual" ? "preencha em Ajustes" : "fonte indisponível")));
      t.appendChild(f0);
      return t;
    }

    var row = el("div", "tile-row");
    var casas = item.casas !== undefined ? item.casas : casasPara(st.valor);
    row.appendChild(el("div", "tile-value", fmtNum(st.valor, casas)));

    if (st.pct !== undefined && st.pct !== null && !isNaN(st.pct)) {
      var dir = st.pct > 0.0001 ? "up" : (st.pct < -0.0001 ? "down" : "flat");
      var seta = dir === "up" ? "▲" : (dir === "down" ? "▼" : "■");
      var d = el("span", "delta " + dir, seta + " " + (st.pct > 0 ? "+" : "") + fmtNum(st.pct, 2) + "%");
      row.appendChild(d);
    }
    t.appendChild(row);

    var sp = sparkline(st.hist);
    if (sp) t.appendChild(sp);

    var f = el("div", "tile-foot");
    f.appendChild(el("span", null, st.fonte || "—"));
    f.appendChild(el("span", null, st.hora || ""));
    t.appendChild(f);
    return t;
  }

  function renderPrecos() {
    if (!config) return;
    var grid = $("#grid-precos");
    grid.innerHTML = "";
    config.grupos.forEach(function (g) {
      grid.appendChild(el("h3", "group-title", g.nome));
      var wrap = el("div", "tiles");
      g.itens.forEach(function (it) { wrap.appendChild(cartao(it)); });
      grid.appendChild(wrap);
    });
  }

  function renderManuais() {
    ["win", "wdo"].forEach(function (k) {
      var raw = get(k, "").replace(/\./g, "").replace(",", ".");
      var v = parseFloat(raw);
      estado[k.toUpperCase()] = isNaN(v)
        ? { erro: "preencha em Ajustes" }
        : { valor: v, fonte: "manual", hora: fmtHora(new Date()) };
    });
    renderPrecos();
  }

  /* --- provedores --- */

  function alvos(fonte) {
    var out = [];
    if (!config) return out;
    config.grupos.forEach(function (g) {
      g.itens.forEach(function (it) { if (it.fonte === fonte) out.push(it); });
    });
    return out;
  }

  function marcarErro(itens, msg) {
    itens.forEach(function (it) {
      if (!estado[it.sym] || estado[it.sym].valor === undefined) estado[it.sym] = { erro: msg };
    });
  }

  function fetchBrapi() {
    var itens = alvos("brapi");
    if (!itens.length) return Promise.resolve();
    var token = get("brapi", "");
    if (!token) { marcarErro(itens, "token não configurado"); return Promise.resolve(); }
    var syms = itens.map(function (i) { return i.sym; }).join(",");
    var url = "https://brapi.dev/api/quote/" + encodeURIComponent(syms) +
      "?range=3mo&interval=1d&token=" + encodeURIComponent(token);
    return json(url).then(function (d) {
      var hora = fmtHora(new Date());
      (d.results || []).forEach(function (r) {
        var hist = (r.historicalDataPrice || []).map(function (p) { return p.close; })
          .filter(function (x) { return typeof x === "number"; }).slice(-40);
        estado[r.symbol] = {
          valor: r.regularMarketPrice,
          pct: r.regularMarketChangePercent,
          hist: hist,
          fonte: "brapi",
          hora: hora
        };
      });
      marcarErro(itens, "não retornado pela brapi");
    }).catch(function () { marcarErro(itens, "brapi indisponível"); });
  }

  function fetchAwesome() {
    var itens = alvos("awesome");
    if (!itens.length) return Promise.resolve();
    var syms = itens.map(function (i) { return i.sym; }).join(",");
    var hora = fmtHora(new Date());
    var p = json("https://economia.awesomeapi.com.br/json/last/" + syms).then(function (d) {
      itens.forEach(function (it) {
        var k = it.sym.replace("-", "");
        var r = d[k];
        if (!r) return;
        estado[it.sym] = {
          valor: parseFloat(r.bid),
          pct: parseFloat(r.pctChange),
          hist: (estado[it.sym] || {}).hist,
          fonte: "awesomeapi",
          hora: hora
        };
      });
    });
    var hs = itens.map(function (it) {
      return json("https://economia.awesomeapi.com.br/json/daily/" + it.sym + "/30").then(function (arr) {
        var h = arr.map(function (x) { return parseFloat(x.bid); }).reverse();
        if (estado[it.sym]) estado[it.sym].hist = h;
      }).catch(function () { });
    });
    return Promise.all([p].concat(hs))
      .then(function () { marcarErro(itens, "não retornado"); })
      .catch(function () { marcarErro(itens, "awesomeapi indisponível"); });
  }

  function fetchCripto() {
    var itens = alvos("coingecko");
    if (!itens.length) return Promise.resolve();
    var ids = itens.map(function (i) { return i.id; }).join(",");
    var url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" +
      encodeURIComponent(ids) + "&sparkline=true&price_change_percentage=24h";
    return json(url).then(function (arr) {
      var hora = fmtHora(new Date());
      itens.forEach(function (it) {
        var r = arr.filter(function (x) { return x.id === it.id; })[0];
        if (!r) return;
        var sp = (r.sparkline_in_7d && r.sparkline_in_7d.price) || [];
        var passo = Math.max(1, Math.floor(sp.length / 40));
        estado[it.sym] = {
          valor: r.current_price,
          pct: r.price_change_percentage_24h,
          hist: sp.filter(function (_, i) { return i % passo === 0; }),
          fonte: "coingecko",
          hora: hora
        };
      });
      marcarErro(itens, "não retornado");
    }).catch(function () { marcarErro(itens, "coingecko indisponível"); });
  }

  function fetchStooq() {
    var itens = alvos("stooq");
    if (!itens.length) return Promise.resolve();
    var hora = fmtHora(new Date());
    return Promise.all(itens.map(function (it) {
      return fetch("https://stooq.com/q/d/l/?s=" + encodeURIComponent(it.sym) + "&i=d", { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("http"); return r.text(); })
        .then(function (csv) {
          var linhas = csv.trim().split("\n").slice(1);
          var closes = linhas.map(function (l) { return parseFloat(l.split(",")[4]); })
            .filter(function (x) { return !isNaN(x); });
          if (closes.length < 2) throw new Error("vazio");
          var hist = closes.slice(-40);
          var ult = closes[closes.length - 1], ant = closes[closes.length - 2];
          estado[it.sym] = {
            valor: ult,
            pct: ((ult - ant) / ant) * 100,
            hist: hist,
            fonte: "stooq (fechamento)",
            hora: hora
          };
        })
        .catch(function () {
          if (!estado[it.sym] || estado[it.sym].valor === undefined) estado[it.sym] = { erro: "stooq bloqueado ou fora" };
        });
    }));
  }

  var carregando = false;

  function carregarPrecos() {
    if (!config || carregando) return;
    carregando = true;
    $("#precos-meta").textContent = "buscando…";
    renderManuais();
    Promise.all([fetchBrapi(), fetchAwesome(), fetchCripto(), fetchStooq()]).then(function () {
      carregando = false;
      renderPrecos();
      var vivos = 0, total = 0;
      config.grupos.forEach(function (g) {
        g.itens.forEach(function (i) {
          total++;
          var s = estado[i.sym];
          if (s && s.valor !== undefined && s.valor !== null && !isNaN(s.valor)) vivos++;
        });
      });
      $("#precos-meta").textContent = vivos + " de " + total + " com fonte · " + fmtHora(new Date());
    });
  }

  var timer = null;
  function agendar() {
    if (timer) clearInterval(timer);
    var s = parseInt(get("interval", "60"), 10);
    if (s > 0) timer = setInterval(carregarPrecos, s * 1000);
  }

  $("#btn-refresh").addEventListener("click", carregarPrecos);

  json("data/config.json").then(function (c) {
    config = c;
    renderManuais();
    carregarPrecos();
    agendar();
  }).catch(function () {
    $("#grid-precos").innerHTML = "<p class='empty'>Sem <code>data/config.json</code>.</p>";
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) carregarPrecos();
  });

})();
