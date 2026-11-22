# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Definida na documentação do projeto (não trocar sem aprovação): React + Vite + TypeScript + React Router + TanStack Query, CSS Modules + variáveis CSS (sem MUI/Chakra/Bootstrap). Backend Java 21 + Spring Boot 3 (MVC: Controller → Service → Repository). Supabase (PostgreSQL, Auth, Realtime, Storage) em projeto na nuvem.

## Users

- **Cliente** — pessoa com rotina corrida que quer comer bem sem juntar vários apps: escolhe um objetivo (emagrecimento, ganho de massa, equilíbrio), pede marmitas com macros transparentes, segue o plano da nutricionista e acompanha os macros do dia. Perfis citados: performance, restrições alimentares, economia planejada.
- **Nutricionista** (CRN validado manualmente) — faz triagem, monta plano semanal com pratos reais do catálogo aprovado, emite prescrição em PDF, conversa com clientes e acompanha adesão.
- **Restaurante** — cadastra pratos com ficha nutricional obrigatória, gerencia pedidos em tempo real, acompanha analytics e financeiro.
- **Admin** (interno) — aprova CRN, CNPJ e pratos; configura comissão por restaurante.

## Product Purpose

Unir em uma única plataforma o que hoje está espalhado: restaurante saudável, dieta e nutricionista. Sucesso = cliente pede uma marmita compatível com o objetivo e o plano, a nutri acompanha com pratos reais, o restaurante recebe e entrega o pedido com status em tempo real.

## Positioning

O plano da nutricionista é montado com **pratos reais e aprovados do marketplace**, prontos para pedir com 1 clique, e o NutriBot responde com o contexto do plano, do consumo do dia e das metas do usuário — não com respostas genéricas.

## Operating Context

- Receita: assinaturas do cliente (Free R$0 / Basic / Pro / Premium; preços da tela 09: mensal R$29,90 / R$59,90 / R$89,90; anual R$286,80 / R$574,80 / R$862,80, 20% de desconto) + comissão de 8% por pedido entregue (configurável por restaurante).
- Nutricionista recebe repasse de 60% da mensalidade Pro/Premium de cada cliente vinculado.
- Fluxo de pedido: `NOVO → ACEITO/RECUSADO → PREPARANDO → PRONTO → A_CAMINHO → ENTREGUE` (+ `CANCELADO`).
- Pratos e cadastros profissionais passam por curadoria manual antes de aparecer.
- Contexto acadêmico: disciplina de Fábrica de Software, UNIFACOL; apresentação em 25/11/2026.

## Capabilities and Constraints

- Backlog CE-1 a CE-21 (docs/cleaneats-documentacao.md) define os critérios de aceite.
- Pagamentos simulados (interface preparada para Stripe/Mercado Pago). Entregador e mapa de rastreio simulados.
- Fora do escopo: videochamada, dieta gerada por IA, apps nativos, nota fiscal, wearables, rede social, modo offline, assistentes de voz, registro de alimento por foto.
- pt-BR, moeda `R$ 1.234,56`, datas `dd/mm/aaaa`, fuso `America/Recife`.

## Brand Commitments

- Nome **CleanEats**, desenvolvido pela **TRICODE Solutions**. Rodapé: "© 2026 CleanEats — TRICODE Solutions · Recife · Brasil" e "v1.0 · MVP · UNIFACOL".
- Logo inspirado no yin-yang (pilão com ervas, chapéu de chef, figura humana); "Clean" leve + "Eats" em negrito; tagline "Nutricionistas · Restaurantes · Pacientes".
- O visual está **aprovado** nas 44 telas HTML (telas-html/) e no Figma; o trabalho é fidelidade, não redesenho.

## Evidence on Hand

- 44 telas HTML em `telas-html/` (+ variante descartada da tela 26), documentação em `docs/cleaneats-documentacao.md`.
- Fotos de pratos são do Unsplash (hotlink nas telas); devem ser baixadas para `frontend/public/`.
- Não há depoimentos, clientes reais nem métricas reais: os números das telas são dados de exemplo e vivem só no seed.

## Product Principles

1. Transparência nutricional em todo lugar: todo prato mostra kcal, P, C e G.
2. A nutricionista decide; o NutriBot orienta e encaminha, nunca prescreve (risco legal alto).
3. Só o que foi aprovado aparece: prato, restaurante e profissional passam por curadoria.
4. Do plano ao pedido em 1 clique.

## Accessibility & Inclusion

Contraste AA, foco visível, `label` em todo campo, navegação por teclado, `alt` em imagens, `prefers-reduced-motion`. Responsivo: desktop, tablet e celular (navbar do cliente vira menu inferior; sidebar dos painéis vira drawer).
