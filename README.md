# Terminal Mesa — site

Site estático da folha da sessão seguinte. Sem build, sem framework, sem servidor.
Abre em qualquer navegador e é publicado pelo GitHub Pages.

```
index.html
assets/style.css
assets/app.js
data/config.json          quais cartões aparecem e de qual fonte vem cada um
data/calendar.json        agenda
data/alerts.json          alertas abertos
data/folhas/index.json    índice das folhas
data/folhas/*.md          as folhas
```

## Atualizar a folha do dia

1. Grave o markdown em `data/folhas/AAAA-MM-DD.md`.
2. Acrescente a entrada no topo de `data/folhas/index.json`.
3. Commit. O Pages republica sozinho em ~1 min.

Mesma coisa para `data/calendar.json` e `data/alerts.json`.

## Rodar local

```
python -m http.server 8080
```

Abra http://localhost:8080. Precisa ser por servidor — abrir o index.html com duplo clique quebra o carregamento dos JSON.

## Preços

Tudo é buscado pelo navegador, direto da fonte. Não existe servidor no meio.

| Fonte | Cobre | Token |
|---|---|---|
| brapi | ações B3 e Ibovespa | sim, grátis em brapi.dev |
| awesome | câmbio (USD-BRL) | não |
| coingecko | cripto | não |
| stooq | fechamento de ativos globais | não |
| manual | WIN e WDO | você digita |

O token da brapi fica no localStorage do seu navegador. Não vai para o repo nem para lugar nenhum.

**Fonte que falha não vira número.** O cartão fica cinza escrito "sem fonte". Isso é de propósito: a regra do terminal é não inventar preço. Se o stooq estiver bloqueado por CORS no seu navegador, os cartões de Global ficam cinza e o resto continua funcionando.

## Por que WIN e WDO são manuais

Não existe fonte pública e gratuita de cotação intradiária de futuro da B3. Ibovespa e USD/BRL entram como proxy, e o valor de referência do WIN e do WDO você digita em **Ajustes** — fica salvo no navegador.

Se um dia quiser puxar do Profit por RTD, é um pedaço local e separado: o Profit publica cotação para o Excel, leitura pura, sem ordem e sem tocar na conta. Só lembre que dado de mercado B3 em tempo real é licenciado — publicar em repo público é redistribuição.

## Aviso

Este repositório é público. Qualquer pessoa com a URL lê as folhas.

---

Material de estudo pessoal. Não é recomendação de investimento.
