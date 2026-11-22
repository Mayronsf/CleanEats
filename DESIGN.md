---
name: CleanEats
description: Ecossistema de alimentação saudável — clientes, nutricionistas e restaurantes numa só plataforma.
colors:
  green-primary: "#5BB033"
  green-dark: "#2D6A1F"
  green-accent: "#8BC34A"
  green-bg-deep: "#D4ED9F"
  green-bg: "#E8F5D8"
  blue: "#457B9D"
  blue-dark: "#2D5A75"
  blue-light: "#7FAFCD"
  blue-bg: "#E0F2FE"
  coral: "#E07856"
  coral-dark: "#C2543A"
  coral-light: "#F0A080"
  coral-bg: "#FDE8E0"
  orange: "#F4A261"
  orange-bg: "#FEF3E5"
  gold: "#C9A961"
  macro-kcal: "#F4A261"
  macro-prot: "#E76F51"
  macro-carb: "#E9C46A"
  macro-fat: "#C7402E"
  macro-fiber: "#52B788"
  ink: "#1A2E1A"
  ink-soft: "#2D3A2D"
  gray-700: "#4A5A4A"
  gray-500: "#8A958A"
  gray-300: "#C8D2C8"
  gray-100: "#F0F3EE"
  gray-50: "#FAFCF7"
  field-bg: "#F7F9F5"
  line: "#F0F0F0"
  line-strong: "#E0E0E0"
  line-panel: "#ECEEF2"
  warning-bg: "#FEF7E0"
  danger-ink: "#9B2C2C"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "48px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    letterSpacing: "0.1em"
  script:
    fontFamily: "Caveat, cursive"
    fontWeight: 700
rounded:
  xs: "8px"
  sm: "10px"
  md: "12px"
  field: "14px"
  lg: "18px"
  card: "20px"
  card-lg: "22px"
  xl: "24px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  page-x: "64px"
components:
  button-primary:
    backgroundColor: "{colors.green-primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.field}"
    padding: "18px"
  button-primary-hover:
    backgroundColor: "{colors.green-dark}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
  input:
    backgroundColor: "{colors.field-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "16px 20px"
  chip:
    backgroundColor: "{colors.gray-100}"
    textColor: "{colors.gray-700}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  chip-active:
    backgroundColor: "{colors.green-primary}"
    textColor: "{colors.white}"
  card-prato:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.card-lg}"
    padding: "20px"
  card-macros-dia:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.xl}"
    padding: "28px"
  stat-card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.card}"
    padding: "22px"
  sidebar-item-active:
    backgroundColor: "{colors.green-primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "11px 14px"
---

# Design System: CleanEats

> Extraído das 44 telas HTML em `telas-html/` (fonte da verdade visual). Tokens vivem em
> `frontend/src/design-system/tokens.css`; componentes em `frontend/src/design-system/components/`;
> vitrine em `/design-system`. Divergências com as telas são registradas em `docs/sugestoes-design.md`.

## Overview

**Creative North Star: "A feira bem organizada"**

Comida de verdade, apresentada com a clareza de uma ficha técnica. Muito branco e off-white, verde de folha como única cor de marca, fotos de prato grandes e generosas, e números (kcal, P, C, G, preço) sempre à vista em pesos pesados. O tom é leve e próximo — a palavra de destaque manuscrita em Caveat, levemente inclinada, quebra a seriedade dos títulos em Plus Jakarta Sans ExtraBold.

A densidade varia por lane: as telas públicas e do cliente respiram (heros verde-claro, cards com 20–24px de padding); os painéis de nutricionista e restaurante são mais densos (sidebar 260px, stat cards, tabelas), mantendo os mesmos raios, pílulas e tipografia. Cada perfil troca só o **acento**: verde (cliente), azul-aço (nutricionista), coral com neutros quentes (restaurante).

**Key Characteristics:**
- Um acento por perfil; o resto é neutro esverdeado.
- Macros com cores fixas e invariáveis em todas as telas.
- Pílulas para tudo que é rótulo, filtro ou status.
- Cards com borda de 1,5px suave; sombra só no hover.
- Palavra manuscrita em todo título principal.

## Colors

Verde de folha sobre off-white, com acentos por perfil e um quinteto fixo de cores de macro.

### Primary
- **Verde Folha** (#5BB033): CTA principal, link ativo, chip ativo, anel de progresso, logo. Acento do cliente.
- **Verde Floresta** (#2D6A1F): hover do CTA, texto sobre verde-claro (tags, badges "Pronto").
- **Broto** (#8BC34A): progresso dentro do card escuro de macros.
- **Verde Hero** (#E8F5D8) e **Verde Hero Profundo** (#D4ED9F): fundos de hero, avatar, etapas concluídas.

### Secondary
- **Azul-Aço** (#457B9D) / #2D5A75 / #E0F2FE: acento da nutricionista; também badge "Novo" nos pedidos.
- **Coral** (#E07856) / #C2543A / #FDE8E0: acento do restaurante (com neutros quentes #2A1F1A, #F9F6F3).

### Tertiary
- **Laranja Abóbora** (#F4A261): estrela de avaliação, ponto de notificação, etapa atual da timeline, ícone do aviso legal do NutriBot.
- **Ouro** (#C9A961): plano Premium, selo "IA".

### Macros (fixas)
- **kcal** #F4A261 · **P** #E76F51 · **C** #E9C46A · **G** #C7402E · **F** #52B788.

### Neutral
- **Tinta Floresta** (#1A2E1A): texto principal e fundo do card "Macros de hoje", Premium e prescrição.
- **Musgo** (#4A5A4A): texto secundário. **Líquen** (#8A958A): placeholders e rótulos grandes. **#C8D2C8**: bordas de checkbox.
- **Névoa** (#F0F3EE): fundo de chip, busca e botões de ícone. **Off-white** (#FAFCF7): fundo das páginas do cliente.
- Linhas: #F0F0F0 (cards), #E0E0E0 (tracejados e botões secundários), #ECEEF2 (painéis).

### Named Rules
**A Regra do Acento Único.** Cada tela usa só o acento do seu perfil. Verde nunca aparece como acento no painel do restaurante, exceto no logo e em badges de status.
**A Regra dos Macros Fixos.** P, C, G, F e kcal usam sempre as mesmas cores, em qualquer perfil.

## Typography

**Display/Body:** Plus Jakarta Sans 300–800 · **Destaque:** Caveat 500/700 (Google Fonts).

**Character:** uma sans geométrica e calorosa em pesos pesados para números e títulos, com uma manuscrita que dá a "letra de mão" da nutri.

### Hierarchy
- **Display** (800, 48px, lh 1.05, -0.03em): títulos de autenticação e heros ("Entrar na sua *conta*").
- **Headline** (800, 28–32px, -0.02em): topo dos painéis e títulos de seção.
- **Title** (800, 17–22px): nome de prato (19px), nome de plano (22px), cabeçalho do chat (17px).
- **Body** (400–500, 14–16px, lh 1.5–1.6): descrições, mensagens.
- **Label** (700–800, 10–13px, uppercase, 0.05–0.1em): rótulos de grupo, tags de prato, filtros.
- **Números** (800, 24–44px, -0.02/-0.03em, tabular): preço, kcal, KPIs.

### Named Rules
**A Regra da Palavra Manuscrita.** Todo título principal tem exatamente uma palavra em Caveat, na cor do acento, rotacionada -2°.
**A Regra dos Centavos.** Preço é `R$ 24` + `,90` em ~58% do tamanho.

## Layout

Referência desktop de **1440px** (as telas fixam `body { width: 1440px }`), com padding lateral de 64px nas telas do cliente e grid de 260px + conteúdo nos painéis. Breakpoints usados nas telas: **1023px** (tablet), **767px** (celular), **380px** (celular pequeno). Grades: 3 colunas de pratos/restaurantes, 4 de planos e stat cards; caem para 2 e 1. Ritmo de gaps: 6 / 8 / 10 / 12 / 16 / 24px. No celular a navbar do cliente vira **tabbar flutuante escura** (pílula) e a sidebar dos painéis vira **drawer** (as telas só escondem a sidebar — o drawer é decisão do projeto).

## Elevation & Depth

Plano em repouso, elevado na interação. Cards têm borda de 1,5px e nenhuma sombra; no hover sobem 6–8px com `0 20px 40px rgba(0,0,0,.08)`. Profundidade forte só em elementos flutuantes (tabbar, toasts) e no CTA verde.

### Shadow Vocabulary
- **Avatar** (`0 2px 6px rgba(0,0,0,.1)`): avatares com borda branca.
- **Hover de card** (`0 20px 40px rgba(0,0,0,.08)`): pratos, restaurantes, planos.
- **Flutuante** (`0 16px 40px rgba(0,0,0,.2)`): tabbar, toasts.
- **CTA** (`0 8px 20px rgba(91,176,51,.25)`): botão primário verde.
- **Foco** (`0 0 0 4px rgba(91,176,51,.2)`): anel de foco de campos e botões.

## Shapes

Raios generosos e consistentes: 12px (ícones, itens de menu), 14px (campos e botões), 18px (imagem do prato), 20–24px (cards), 999px (pílulas, chips, badges, tabbar). Linhas tracejadas (`1px dashed #E0E0E0`) separam o rodapé de preço dos cards.

## Components

- **Botão primário:** verde, 14px de raio, sombra CTA, sobe 1px no hover.
- **Campo:** fundo #F7F9F5 sem borda; no foco ganha borda verde e fundo branco.
- **Chip/filtro:** pílula cinza-névoa; ativo = acento sólido.
- **Card de prato:** imagem 1.1:1, tag branca no topo, nota em pílula escura, restaurante em label, barra P/C/G, rodapé tracejado com preço + "Pedir +".
- **Card "Macros de hoje":** fundo tinta-floresta, círculo verde translúcido no canto, anel de kcal e barras por macro.
- **Sidebar:** 260px, badge de papel em pílula, grupos com label uppercase, item ativo sólido no acento.
- **Timeline do pedido:** círculos de 32px ligados por linha; feito = verde, atual = laranja com halo.
- **NutriBot:** cabeçalho com gradiente verde-claro, **aviso legal amarelo obrigatório**, balão do usuário escuro.

## Do's and Don'ts

- **Faça:** use os tokens de `tokens.css`; mantenha os textos das telas; mostre kcal/P/C/G em todo prato.
- **Faça:** troque o acento via `.tema-nutri` / `.tema-restaurante`, nunca por cor solta.
- **Não faça:** copiar estilos inline do HTML; inventar cores; usar emoji como ícone (use Lucide, mesmo traço Feather das telas).
- **Não faça:** usar laranja #F4A261 como cor de **texto** sobre branco (contraste 2,2:1) — use #A8571C (ver `docs/sugestoes-design.md`).
