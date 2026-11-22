# Inventário das telas (Fase 0)

Origem: `telas-html/` (cópia somente leitura de `../telas em html/`). Conferido em 22/11/2026.

## Resultado

**As 44 telas da seção 4 do prompt existem.** Nenhuma tela faltando.

### Arquivos a mais
| Arquivo | O que é | Decisão |
|---|---|---|
| `26-nutri-home.html` | Versão "completa" do dashboard da nutri | **Não usar.** A oficial é `26-nutri-home (com menos infos).html` |
| `cleaneats-interactions.js` | Rascunho de integração (Supabase Auth + `/api/profiles/me`) — não é referenciado por nenhum HTML | Só referência do fluxo de cadastro |
| `runtime-config.js` | Config de URLs locais para o script acima | Ignorado (usamos `.env`) |

### Arquivos esperados que não existem
| Esperado | Situação |
|---|---|
| `telas-html/index.html` (página-índice citada no prompt) | **Não existe.** O inventário foi feito pela listagem da pasta |

### Links internos quebrados nas telas
`26-nutri-dashboard.html`, `33-nutri-mensagens.html`, `35-nutri-perfil.html`, `36-rest-dashboard.html` — apontam para nomes antigos. Na SPA as rotas da seção 4 substituem esses links.

### Outros achados
- **33 telas** carregam `https://mcp.figma.com/mcp/html-to-design/capture.js` (script da captura para o Figma) — não vai para o app.
- **40 telas** usam fotos do Unsplash por hotlink. As 6 fotos de prato do marketplace já foram baixadas para `frontend/public/img/pratos/`; as demais (restaurantes, avatares, capas) entram por tela nas próximas fases.
- **Ícones:** SVG inline de traço com os mesmos desenhos do **Feather** (sprite `#i-*` nas telas 26–44) → usamos **lucide-react** (fork do Feather, mesmo traço).
- **Largura:** todas fixam `body { width: 1440px }` — a referência de desktop é 1440px, não 1920px.
- **Dados inconsistentes** (unificados no seed: 2026, Recife, "Sabor Natural"):
  - Ano 2025: telas 34, 36, 40, 42, 43, 44.
  - "Sabor & Saúde": telas 36 a 44 (painel do restaurante).
  - "São Paulo": telas 07 e 44.
  - Preços "Pro Mensal R$ 189,90" e "Premium R$ 249,90" na tela 34 (valem os da tela 09).
  - Tela 13 mostra Açaí Club e Rota Proteica, mas nenhuma tela mostra pratos deles → pela regra CE-5 eles só aparecem quando tiverem prato aprovado (seed da Fase 1 adiciona os pratos da tela 14).

## Mapa tela → rota → fase

| # | Arquivo | Rota | Fase |
|---|---|---|---|
| 01 | 01-splash.html | `/` | 1 |
| 02 | 02-login.html | `/login` | 1 |
| 03 | 03-cadastro-etapa1.html | `/cadastro` | 1 |
| 04 | 04-cadastro-perfil.html | `/cadastro/perfil` | 1 |
| 05 | 05-cadastro-cliente.html | `/cadastro/cliente` | 1 |
| 06 | 06-cadastro-nutricionista.html | `/cadastro/nutricionista` | 3 |
| 07 | 07-cadastro-restaurante.html | `/cadastro/restaurante` | 2 |
| 08 | 08-recuperar-senha.html | `/recuperar-senha` | 1 |
| 09 | 09-selecao-plano.html | `/planos` | 1 (visual) / 3 (pagamento) |
| 10 | 10-cliente-home.html | `/app` | 1 |
| 11 | 11-cliente-marketplace.html | `/app/marketplace` | 1 |
| 12 | 12-cliente-detalhe-marmita.html | `/app/marmitas/:id` | 1 |
| 13 | 13-cliente-restaurantes.html | `/app/restaurantes` | 1 |
| 14 | 14-cliente-perfil-restaurante.html | `/app/restaurantes/:id` | 1 |
| 15 | 15-cliente-personalizacao.html | `/app/monte-sua-marmita` | 1 |
| 16 | 16-cliente-carrinho.html | `/app/carrinho` | 1 |
| 17 | 17-cliente-pedido-confirmado.html | `/app/pedidos/:id/confirmado` | 1 |
| 18 | 18-cliente-acompanhamento.html | `/app/pedidos/:id` | 2 |
| 19 | 19-cliente-historico.html | `/app/pedidos` | 1 |
| 20 | 20-cliente-avaliar.html | `/app/pedidos/:id/avaliar` | 3 |
| 21 | 21-cliente-perfil.html | `/app/perfil` | 3 |
| 22 | 22-cliente-editar-perfil.html | `/app/perfil/editar` | 3 |
| 23 | 23-cliente-planos.html | `/app/assinatura` | 3 |
| 24 | 24-cliente-plano-alimentar.html | `/app/meu-plano` | 3 |
| 25 | 25-cliente-chatbot.html | `/app/nutribot` | 4 |
| 26 | 26-nutri-home (com menos infos).html | `/nutri` | 3 |
| 27 | 27-nutri-triagens.html | `/nutri/triagens` | 3 |
| 28 | 28-nutri-clientes.html | `/nutri/clientes` | 3 |
| 29 | 29-nutri-cliente-perfil.html | `/nutri/clientes/:id` | 3 |
| 30 | 30-nutri-editor-plano.html | `/nutri/clientes/:id/plano` | 3 |
| 31 | 31-nutri-catalogo.html | `/nutri/catalogo` | 3 |
| 32 | 32-nutri-prescricao.html | `/nutri/prescricoes/nova` | 3 |
| 33 | 33-nutri-chat.html | `/nutri/mensagens` | 3 |
| 34 | 34-nutri-financeiro.html | `/nutri/financeiro` | 4 |
| 35 | 35-nutri-perfil-profissional.html | `/nutri/perfil` | 3 |
| 36 | 36-resto-dashboard.html | `/restaurante` | 2 |
| 37 | 37-resto-pedidos.html | `/restaurante/pedidos` | 2 |
| 38 | 38-resto-cardapio.html | `/restaurante/cardapio` | 2 |
| 39 | 39-resto-criar-prato.html | `/restaurante/cardapio/novo`, `/:id/editar` | 2 |
| 40 | 40-resto-aprovacao.html | `/restaurante/aprovacao` | 2 |
| 41 | 41-resto-analytics.html | `/restaurante/analytics` | 4 |
| 42 | 42-resto-financeiro.html | `/restaurante/financeiro` | 4 |
| 43 | 43-resto-relatorios.html | `/restaurante/relatorios` | 4 |
| 44 | 44-resto-perfil.html | `/restaurante/perfil` | 4 |
| — | (admin, sem tela) | `/admin/aprovacoes`, `/admin/restaurantes` | 2 |
