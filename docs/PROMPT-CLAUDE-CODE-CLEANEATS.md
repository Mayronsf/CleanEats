# Prompt — CleanEats (Claude Code)

Você vai transformar em código funcionando o **CleanEats**, um ecossistema web de alimentação saudável desenvolvido pela **TRICODE Solutions** (projeto da disciplina de Fábrica de Software — Bacharelado em Sistemas de Informação, UNIFACOL).

As telas **já estão prontas** — em HTML e no Figma. O seu trabalho **não é redesenhar**: é converter essas telas em uma aplicação React componentizada, fiel ao visual, ligada a um backend real e com as regras de negócio do documento do projeto.

> Campos entre `[colchetes]` são decisões/valores que eu (usuário) preencho ou confirmo.

---

## 0. Antes de qualquer coisa

1. Leia este arquivo inteiro.
2. Leia a documentação do projeto em `[docs/CleanEats - Tricode.docx ou docs/cleaneats-documentacao.md]` — principalmente: **Backlog / Estórias de usuário (CE-1 a CE-21)**, **Arquitetura** (MVC, padrões de nomenclatura, tabelas) e **Declaração do Projeto** (escopo e não-escopo).
3. Abra a pasta de telas `[telas-html/]` e a página-índice `[telas-html/index.html]`. Confira se as 44 telas da seção 4 existem; liste qualquer arquivo faltando ou sobrando.
4. Crie um `CLAUDE.md` na raiz com o resumo deste prompt (stack, regras, convenções, decisões da seção 6, fontes da verdade). Ele será lido em todas as próximas sessões — mantenha-o atualizado.
5. Execute **somente a Fase 0** (seção 10) e pare para eu revisar.

---

## 1. Contexto do produto

Hoje, quem quer comer bem precisa juntar informação espalhada em vários apps: restaurante saudável num lugar, dieta em outro, nutricionista em outro. O CleanEats une isso numa plataforma só, com **três perfis**:

| Perfil | O que faz | Cor de acento |
|---|---|---|
| **Cliente** | Escolhe objetivo (emagrecimento, ganho de massa, equilíbrio), pede marmitas com macros transparentes, segue o plano da nutri, acompanha os macros do dia, conversa com o NutriBot | Verde |
| **Nutricionista** (CRN validado) | Faz triagem, monta plano semanal **com pratos reais do catálogo aprovado**, emite prescrição em PDF, conversa com clientes, acompanha a adesão | Azul-aço |
| **Restaurante** | Cadastra pratos com ficha nutricional, recebe e gerencia pedidos em tempo real, acompanha analytics e financeiro (comissão por pedido) | Coral |

**Modelo de receita:** assinaturas do cliente (Free / Basic / Pro / Premium) + comissão de 8% por pedido entregue no restaurante.

**Público:** pessoas que buscam alimentação prática e saudável (performance, restrições alimentares, economia planejada) e profissionais de nutrição.

---

## 2. Fontes da verdade (ordem de prioridade)

1. **Telas HTML** em `[telas-html/]` → fonte principal de **layout, espaçamento, cores, tipografia e conteúdo**. Foram elas que geraram o Figma (via html.to.design).
2. **Figma** → https://www.figma.com/design/OrwW3hyoYKxySw4l7geO2U/Tricode---Site?node-id=204-284 (Page 2 = CleanEats). Use para **conferência visual** de uma tela específica pelo node-id (tabela da seção 4).
   - ⚠️ A conta do Figma está no plano **Starter**, com **limite baixo de chamadas MCP**. Não varra o arquivo inteiro: use o HTML como base e chame o Figma só por tela, quando houver dúvida.
3. **Documentação do projeto** → fonte das **regras de negócio**, da arquitetura e das convenções.
4. **Este prompt** → decide os conflitos (seção 6). Se algo não estiver coberto aqui, pergunte em vez de inventar.

---

## 3. Stack e arquitetura (definidas na documentação — não trocar sem aprovação)

- **Frontend:** React + Vite + `[TypeScript]` + React Router. SPA. Estado de servidor com `[TanStack Query]`. Sem bibliotecas de UI prontas que imponham visual (sem MUI/Chakra/Bootstrap). CSS: `[CSS Modules + variáveis CSS]` com os tokens extraídos do HTML.
- **Backend:** Java 21 + Spring Boot 3 (Web, Data JPA, Validation, Security), padrão **MVC**: `Controller` → `Service` → `Repository` → entidades de domínio. API REST JSON.
- **Banco e Auth:** **Supabase** (PostgreSQL + Supabase Auth). O backend valida o JWT do Supabase; perfis de acesso: `CLIENTE`, `NUTRICIONISTA`, `RESTAURANTE`, `ADMIN`. Ativar RLS nas tabelas expostas.
- **Tempo real:** Supabase Realtime para status de pedido (restaurante atualiza → cliente vê) e mensagens nutri ↔ cliente.
- **Arquivos:** Supabase Storage (fotos de pratos, logos, avatar, PDFs de prescrição).
- **PDF:** gerado no backend (`PrescricaoService`) — `[OpenPDF ou iText]`.
- **IA do NutriBot:** `ChatbotService` no backend chamando `[provedor de LLM — ex.: API da Anthropic]` com a chave **só no servidor**.
- **Pagamentos:** `[modo simulado/sandbox nesta versão]`. Interface preparada para Stripe ou Mercado Pago (citados na tela de planos).

### Estrutura de pastas

```
cleaneats/
├── CLAUDE.md
├── frontend/              # React + Vite
│   └── src/
│       ├── app/           # rotas, layouts, providers
│       ├── design-system/ # tokens, componentes base
│       ├── features/      # auth, marketplace, pedidos, plano, nutribot, nutri/*, restaurante/*, admin/*
│       ├── services/      # chamadas à API (camelCase: buscarMarmitas(), realizarPedido())
│       └── hooks/         # useAuth(), useMarmitas(), usePedidos()...
├── backend/               # Spring Boot (com.tricode.cleaneats)
│   └── src/main/java/.../{domain,repository,service,controller,dto,config,security}
├── supabase/
│   ├── migrations/        # SQL versionado
│   └── seed.sql           # dados de exemplo (seção 8)
├── docs/                  # documentação, DESIGN.md, decisões
└── telas-html/            # REFERÊNCIA — somente leitura
```

**Trabalhe apenas dentro de `[cleaneats/]`.** A pasta `telas-html/` é referência: não edite.

### Convenções de nomenclatura (da documentação)

| Elemento | Padrão | Exemplo |
|---|---|---|
| Classes de domínio (Java) | PascalCase | `Usuario`, `Marmita`, `Pedido`, `PlanoAlimentar` |
| Repositórios / Controllers / Services | sufixo | `MarmitaRepository`, `PedidoController`, `ChatbotService` |
| Variáveis, atributos, métodos | camelCase | `valorCalorico`, `filtrarMarmitas()` |
| Componentes React | PascalCase | `MarketplaceCard`, `ChatbotPanel`, `PainelRestaurante` |
| Hooks | `use` + camelCase | `usePedidos()`, `useMarmitas()` |
| Enums / interfaces | PascalCase | `StatusPedido`, `TierAssinatura`, `PerfilUsuario` |
| Tabelas e colunas | snake_case minúsculo | `plano_alimentar`, `valor_calorico`, `id_nutricionista` |
| PK / FK | `id` / `id_<entidade>` | `id_restaurante` |
| Rotas da API | kebab-case | `/api/historico-pedidos`, `/api/plano-alimentar` |

Código, nomes de domínio e textos de interface em **português**.

---

## 4. Inventário das telas (44) → rotas

Arquivo HTML esperado: `telas-html/<nome>.html`. Node-id para conferir no Figma (`fileKey OrwW3hyoYKxySw4l7geO2U`).

### Público e autenticação

| # | Tela | Rota | Figma node |
|---|---|---|---|
| 01 | splash (landing) | `/` | 344:1130 |
| 02 | login | `/login` | 236:315 |
| 03 | cadastro-etapa1 (conta) | `/cadastro` | 236:397 |
| 04 | cadastro-perfil (escolha do perfil) | `/cadastro/perfil` | 236:555 |
| 05 | cadastro-cliente (objetivo, restrições, dados físicos, IMC) | `/cadastro/cliente` | 236:719 |
| 06 | cadastro-nutricionista (CRN, especialidades, agenda) | `/cadastro/nutricionista` | 236:968 |
| 07 | cadastro-restaurante (CNPJ, endereço, cozinha, horários) | `/cadastro/restaurante` | 236:1205 |
| 08 | recuperar-senha (3 estados: e-mail → código → nova senha) | `/recuperar-senha` | 236:1633 |
| 09 | selecao-plano (tiers + comparativo + FAQ) | `/planos` | 236:1936 |

### Cliente (`/app`, navbar superior)

| # | Tela | Rota | Figma node |
|---|---|---|---|
| 10 | cliente-home | `/app` | 236:2414 |
| 11 | cliente-marketplace | `/app/marketplace` | 335:469 |
| 12 | cliente-detalhe-marmita | `/app/marmitas/:id` | 236:3112 |
| 13 | cliente-restaurantes | `/app/restaurantes` | 236:3433 |
| 14 | cliente-perfil-restaurante | `/app/restaurantes/:id` | 236:3901 |
| 15 | cliente-personalizacao (monte sua marmita) | `/app/monte-sua-marmita` | 236:4257 |
| 16 | cliente-carrinho (checkout) | `/app/carrinho` | 236:4591 |
| 17 | cliente-pedido-confirmado | `/app/pedidos/:id/confirmado` | 236:4891 |
| 18 | cliente-acompanhamento | `/app/pedidos/:id` | 236:5161 |
| 19 | cliente-historico | `/app/pedidos` | 236:5384 |
| 20 | cliente-avaliar | `/app/pedidos/:id/avaliar` | 236:5787 |
| 21 | cliente-perfil | `/app/perfil` | 236:6002 |
| 22 | cliente-editar-perfil | `/app/perfil/editar` | 204:4059 |
| 23 | cliente-planos (minha assinatura) | `/app/assinatura` | 204:4401 |
| 24 | cliente-plano-alimentar | `/app/meu-plano` | 204:4742 |
| 25 | cliente-chatbot (NutriBot) | `/app/nutribot` | 204:5105 |

### Nutricionista (`/nutri`, sidebar "Painel Nutri")

| # | Tela | Rota | Figma node |
|---|---|---|---|
| 26 | nutri-home (versão "com menos infos" é a oficial) | `/nutri` | 204:5503 |
| 27 | nutri-triagens | `/nutri/triagens` | 204:5814 |
| 28 | nutri-clientes | `/nutri/clientes` | 204:6052 |
| 29 | nutri-cliente-perfil | `/nutri/clientes/:id` | 204:6385 |
| 30 | nutri-editor (editor de plano) | `/nutri/clientes/:id/plano` | 204:566 |
| 31 | nutri-catalogo | `/nutri/catalogo` | 204:3582 |
| 32 | nutri-prescricao | `/nutri/prescricoes/nova` | 204:956 |
| 33 | nutri-chat | `/nutri/mensagens` | 204:1265 |
| 34 | nutri-financeiro | `/nutri/financeiro` | 204:286 |
| 35 | nutri-perfil-profissional | `/nutri/perfil` | 204:1458 |

### Restaurante (`/restaurante`, sidebar "Restaurante")

| # | Tela | Rota | Figma node |
|---|---|---|---|
| 36 | resto-dashboard | `/restaurante` | 204:1644 |
| 37 | resto-pedidos | `/restaurante/pedidos` | 204:1874 |
| 38 | resto-cardapio | `/restaurante/cardapio` | 204:2090 |
| 39 | resto-criar-prato | `/restaurante/cardapio/novo` (e `/:id/editar`) | 204:2354 |
| 40 | resto-aprovacao (curadoria) | `/restaurante/aprovacao` | 204:2565 |
| 41 | resto-analytics | `/restaurante/analytics` | 204:2779 |
| 42 | resto-financeiro | `/restaurante/financeiro` | 204:3023 |
| 43 | resto-relatorios | `/restaurante/relatorios` | 204:3284 |
| 44 | resto-perfil | `/restaurante/perfil` | 204:6770 |

### Admin (NÃO existe no Figma — criar, ver seção 6)

| Tela | Rota |
|---|---|
| Fila de aprovação: nutricionistas (CRN), restaurantes (CNPJ), pratos (ficha nutricional) | `/admin/aprovacoes` |
| Configuração de comissão por restaurante | `/admin/restaurantes` |

---

## 5. Regras de negócio (do backlog CE-1 a CE-21)

Cada história tem um "como demonstrar" na documentação — **ele é o critério de aceite**. Resumo:

**Acesso**
- **CE-1 Login:** e-mail + senha (login social Google/Facebook/Apple via Supabase `[opcional nesta versão]`). Dados inválidos → mensagem de erro; válido → redireciona para a home **do perfil**.
- **CE-2 Cadastro:** 3 etapas (conta → perfil → detalhes do perfil). Força de senha, aceite de termos/LGPD. Cada conta tem **um único perfil**.
- **Recuperar senha:** código de 6 dígitos com expiração (15 min), reenvio com contagem regressiva, nova senha com requisitos.

**Restaurante e pratos**
- **CE-3:** cadastro de restaurante com validação de campos obrigatórios. **A ficha nutricional é obrigatória para publicar um prato.**
- Restaurante e nutricionista passam por **aprovação manual** (status `PENDENTE` / `APROVADO` / `REJEITADO`) antes de operar.
- Prato novo entra como `EM_ANALISE`; só aparece no marketplace depois de `APROVADO` pela curadoria. Rejeição guarda o motivo.
- **CE-5:** só aparecem na listagem os restaurantes com **pelo menos um prato aprovado**.
- **CE-14:** painel do restaurante com pedidos do dia e status; ao mudar o status, **o cliente vê a mudança em tempo real**. Fluxo: `NOVO → ACEITO/RECUSADO → PREPARANDO → PRONTO → A_CAMINHO → ENTREGUE` (+ `CANCELADO`).
- **CE-17:** financeiro com valor bruto, comissão da plataforma e valor líquido, filtro por período e exportação. **Comissão configurável por restaurante pelo admin (padrão 8%).**

**Cliente**
- **CE-4 / CE-10:** marketplace mostra calorias, proteínas, carboidratos e gorduras em todo card. Filtros (categoria, proteína, calorias, preço, restaurante, avaliação) **atualizam os resultados automaticamente**.
- **CE-6:** escolher o objetivo (emagrecimento, ganho de massa, equilíbrio) filtra/prioriza automaticamente as opções compatíveis. As restrições alimentares do perfil escondem pratos incompatíveis.
- **Monte sua marmita:** os componentes (proteína, carboidrato com tamanho, vegetais, adicionais) recalculam kcal, macros e preço em tempo real, com uma meta de calorias por refeição conforme o objetivo.
- **CE-9:** pedido só é registrado após **confirmação**; depois vai para o histórico e atualiza os macros consumidos do dia.
- **CE-7:** histórico com data, itens e informações nutricionais; "pedir novamente".
- **CE-11:** avaliação (nota geral + critérios + comentário + tags) **somente após pedido entregue**; avaliação passa por moderação antes de ser publicada.
- **CE-12:** editar perfil (dados pessoais, físicos com IMC, objetivo, restrições, endereços).
- **CE-13:** notificações no sistema (novo cardápio, status do pedido, recomendação da nutri).
- **QR Code** na página do prato abre a ficha técnica nutricional pública daquele prato.

**Assinaturas**
- **CE-15:** 4 tiers — **Free R$0 / Basic R$23,90 / Pro R$47,90 / Premium R$71,90 por mês** (anual com 30% de desconto). Ao assinar, o perfil reflete o novo plano **imediatamente**. Os benefícios de cada tier seguem a tabela comparativa da tela 09 (ex.: NutriBot 5 dúvidas/dia no Basic e ilimitado no Pro; nutricionista dedicado a partir do Pro; prescrição digital só no Premium; desconto 5% Pro / 15% Premium).
- **CE-16:** cobrança recorrente (simulada), upgrade/downgrade. Ao cancelar, mostra a data de encerramento; depois dela volta para o Free **sem perder histórico**.

**Nutricionista**
- **CE-18:** cadastro com CRN, especialidades e disponibilidade; validação manual do CRN pelo admin. Perfil aprovado fica disponível para os clientes conforme o tier.
- **CE-19:** editor de plano semanal: para cada refeição, escolher um **prato real do catálogo aprovado** + observação por refeição. Ao salvar, o cliente vê o plano no app com os pratos prontos para pedir.
- **CE-20:** prescrição em PDF com nome do cliente, plano, metas, CRN e assinatura digital, enviada por e-mail ao cliente; guardar o **histórico de prescrições emitidas**.
- Triagem: clientes novos aguardam a primeira avaliação; a nutri inicia a triagem e define as metas (kcal, P/C/G, fibras, hidratação).

**NutriBot (CE-8 / CE-21)**
- Responde usando como contexto **o plano ativo, os pedidos/consumo do dia e as metas de macros do usuário**. Respostas genéricas sem contexto não são aceitas.
- Depois de um pedido, a mesma pergunta deve trazer uma resposta que **já reflete o novo consumo**.
- ⚠️ **Risco legal alto (documentação):** o bot **não substitui o nutricionista** — não prescreve, não monta dieta e encaminha ajustes oficiais para a nutri. Mostrar sempre o aviso que já existe na tela 25.
- Limite de uso por tier.

---

## 6. Decisões sobre inconsistências encontradas (siga estas)

1. **Admin inexistente no Figma:** crie um painel `/admin` mínimo **usando o mesmo design system do painel do restaurante/nutri** (sidebar + tabelas + badges). Sem ele, ninguém aprova CRN, CNPJ nem pratos.
2. **Preços divergentes:** a tela 34 (financeiro da nutri) mostra "Pro Mensal R$189,90" e "Premium R$249,90". **Valem os preços da tela 09.** `[Defina como a nutri é remunerada — ex.: repasse de X% da assinatura dos clientes atendidos]` e ajuste os valores da tela 34 de acordo.
3. **Datas e nomes de exemplo:** as telas de nutri/restaurante usam 2025 e "Sabor & Saúde, São Paulo"; as de cliente usam 2026 e "Sabor Natural, Recife". **Unifique tudo no seed** (seção 8): 2026, Recife, "Sabor Natural". Nada de dados fixos no código — tudo vem da API.
4. **Comissão:** o Figma mostra 8% fixo → padrão 8%, configurável por restaurante no admin.
5. **Entregador e rastreio (tela 18):** não há logística no escopo. Implementar a timeline de status real; o entregador e o mapa são `[simulados]`.
6. **Mapa (tela 13):** `[placeholder estático nesta versão | Leaflet + OpenStreetMap]`.
7. **Item "Acompanhamento" no menu da nutri** não tem tela → aponta para `/nutri/clientes` filtrado por adesão, ou fica desabilitado com "em breve".
8. **Registro de alimento por foto** (citado no TAP) não tem tela → fora desta versão.
9. **Fora do escopo (documentação):** videochamada com nutricionista, geração automática de dieta por IA, apps nativos iOS/Android, nota fiscal, wearables, rede social, modo offline. Não implemente.

---

## 7. Design system e uso da skill Impeccable

### Regra principal
**Use apenas a skill `impeccable`.** Não use a `taste` skill nem outras skills de design.

O design **já está aprovado**. Use a Impeccable para **fidelidade, consistência e acabamento** — **não para reinventar**. Se uma sugestão da skill conflitar com o HTML/Figma, **o HTML/Figma vence**; anote a sugestão em `docs/sugestoes-design.md` para eu decidir.

### Como usar a Impeccable neste projeto
1. `/impeccable init` → contexto do produto. Lane: **brand** para a landing (01); **product** para todo o resto. Público, tom e anti-referências: os da seção 1.
2. `/impeccable document` → gerar `DESIGN.md` **a partir das telas HTML existentes** (não invente tokens).
3. `/impeccable extract` → puxar tokens e componentes reutilizáveis para `frontend/src/design-system/`.
4. Em cada tela implementada: `/impeccable audit` (acessibilidade, responsivo, estados) e `/impeccable polish` (detalhes) — **sem mudar a identidade**.
5. **Não use** comandos que mudam a direção visual (ex.: `bolder`, `quieter`, `colorize`, `craft`/`shape` de tela nova), **exceto** para o painel admin, que não tem design.

### Identidade a preservar (confirme os valores exatos no CSS do HTML)
- Verde principal (~`#5BB130`), verde-floresta escuro nos cards de destaque (macros do dia, prescrição, Premium), fundo verde-claro nos heros e off-white nas páginas.
- **Palavra de destaque em fonte manuscrita** nos títulos ("Entrar na sua *conta*", "Qual é o seu *perfil?*").
- Acento por perfil: **verde** (cliente), **azul-aço** (nutricionista), **coral** (restaurante).
- Cores fixas de macro: **P** laranja-avermelhado, **C** amarelo, **G** vermelho, **F** verde.
- Preços com centavos menores (`R$ 24,90`), badges em pílula, cards com borda suave e muito espaço em branco.

### Componentes a extrair (lista mínima)
`NavbarCliente`, `SidebarPainel` (variante nutri/restaurante/admin), `Stepper` (cadastro), `MarketplaceCard` / `PratoCard`, `RestauranteCard`, `MacroBar`, `MacroRing`, `MacroDistribuicao`, `StatCard`, `Chip` / `FiltroCategoria`, `Badge` (status), `Preco`, `RatingStars`, `QuantityStepper`, `PlanoTierCard`, `TimelineStatusPedido`, `ChatbotPanel`, `ChatThread`, `TabelaDados`, `UploadImagem`, `EmptyState`, `Skeleton`, `Toast`.

### Ao converter cada HTML
- **Não** copie estilos inline nem a estrutura gerada; reescreva com componentes e tokens.
- Mantenha os textos (microcopy) das telas.
- Imagens: use as que vêm com os HTMLs em `frontend/public/` (ou Supabase Storage no seed). Sem hotlink.
- Ícones: a mesma família de ícones de traço do HTML (`[identificar no HTML — ex.: Lucide]`).
- Todo estado que o HTML não mostra precisa existir: **loading, vazio, erro, desabilitado, foco**.

---

## 8. Banco de dados e dados de exemplo

Tabelas base da documentação: `usuario`, `marmita`, `pedido`, `restaurante`, `nutricionista`, `plano_alimentar`, `avaliacao`. **Complete** o que as telas exigem, por exemplo: `perfil_cliente` (objetivo, peso, altura, nível de atividade, metas), `restricao_alimentar`, `endereco`, `item_pedido`, `componente_marmita` (monte sua marmita), `assinatura` / `tier` / `fatura`, `triagem`, `refeicao_plano`, `prescricao`, `mensagem`, `conversa_chatbot`, `notificacao`, `consumo_diario` (HistoricoConsumo), `repasse` / `transacao`, `conquista`, `favorito`, `cupom`.

Entregue as migrations em `supabase/migrations/` e um **`seed.sql` coerente com as telas**:
- Cliente **Breno Filho** (Pro, ganho de massa, sem lactose, 78 kg / 1,78 m, meta de 2.200 kcal e 140 g de proteína).
- Nutricionista **Dra. Ana Souza** (CRN-6 PE 12345/P) com ~9 clientes.
- Restaurantes **Sabor Natural, Verde Vida, Mar & Terra, FitFood, Açaí Club, Rota Proteica** e os pratos das telas, com macros e preços iguais aos do HTML.
- Histórico de pedidos, avaliações, plano da semana e faturas como mostrado nas telas.
- Um usuário de demonstração por perfil + um admin `[e-mails/senhas de demo]`.

---

## 9. Requisitos técnicos e de qualidade

- **Idioma e formatos:** interface em pt-BR, moeda `R$ 1.234,56`, datas `dd/mm/aaaa`, fuso `America/Recife`.
- **Responsivo:** desktop (referência 1920px), tablet e celular. No celular, a navbar do cliente vira menu inferior e a sidebar dos painéis vira drawer.
- **Acessibilidade:** contraste AA, foco visível, `label` em todo campo, navegação por teclado, `alt` nas imagens, `prefers-reduced-motion`.
- **Segurança:** autorização por perfil no backend (nunca só no front), RLS no Supabase, validação de entrada (Bean Validation), HTTPS. **Nenhum segredo no repositório** — use `.env` / `application-local.yml` com `.env.example`.
- **LGPD:** consentimento no cadastro, exclusão de conta (tela 22) apagando ou anonimizando os dados.
- **Desempenho:** paginação no servidor (marketplace, histórico, catálogo), imagens otimizadas, lazy loading de rotas.
- **Testes:** JUnit nos services de regra (cálculo de macros, comissão, tiers, transições de status); Vitest + Testing Library nos componentes críticos; um fluxo E2E `[Playwright]` por perfil.
- **Git:** commits pequenos por tela/feature, mensagens em português, branch por fase.
- **Documentação:** `README.md` com o passo a passo para rodar tudo localmente (Supabase, backend, frontend, seed) e os usuários de demo.
- **Marca:** rodapé "© 2026 CleanEats — TRICODE Solutions · Recife · Brasil" e "v1.0 · MVP · UNIFACOL", como na tela 01.

---

## 10. Plano de execução por fases

Ao fim de cada fase: rode build e testes, compare cada tela entregue lado a lado com o HTML (screenshot), atualize o `CLAUDE.md` e **pare para eu revisar**.

**Fase 0 — Fundação (faça só esta agora)**
1. Inventário: as 44 telas da seção 4 × arquivos em `telas-html/` (faltando ou sobrando).
2. `CLAUDE.md` + `/impeccable init` + `/impeccable document` → `DESIGN.md` com tokens reais extraídos do CSS.
3. Monorepo criado (frontend, backend, supabase) rodando um "hello" ponta a ponta com auth do Supabase.
4. Design system: tokens + componentes base da seção 7, com uma página `/design-system` mostrando todos.
5. Proposta de schema (diagrama + migrations) e de endpoints REST por módulo.
6. Relatório: o que encontrou, riscos, dúvidas e estimativa por fase.

**Fase 1 — Público e cliente núcleo:** telas 01–05, 08–17, 19 (CE-1, 2, 4, 6, 9, 10, 7).
**Fase 2 — Restaurante + admin:** telas 07, 36–40 + admin (CE-3, 5, 14), com o status do pedido em tempo real chegando à tela 18.
**Fase 3 — Assinaturas e nutricionista:** telas 06, 09 (pagamento), 21–24, 26–33, 35 (CE-15, 16, 18, 19, 20, 11, 12, 13).
**Fase 4 — NutriBot e gestão:** telas 25, 34, 41–44 (CE-8, 21, 17), relatórios PDF/CSV.
**Fase 5 — Acabamento:** `/impeccable audit` + `polish` em todas as telas, responsivo, acessibilidade, testes E2E, README final.

**Prazo:** `[data da entrega/apresentação]`. Se não couber tudo, priorize nesta ordem: fluxo do cliente ponta a ponta → restaurante → nutricionista → NutriBot → financeiro/analytics/relatórios.

---

## 11. Não fazer

- Não redesenhar telas nem "melhorar" o visual por conta própria.
- Não trocar a stack (React / Spring Boot / Supabase) sem aprovação.
- Não usar outras skills de design além da `impeccable`.
- Não deixar dados fixos no componente — tudo vem da API/seed.
- Não implementar funcionalidades fora do escopo (seção 6, item 9).
- Não expor chaves (Supabase service role, LLM, pagamento) no frontend.
- Não editar arquivos fora de `[cleaneats/]` nem dentro de `telas-html/`.
- Não varrer o Figma inteiro (limite do plano Starter).
