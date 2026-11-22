# CLAUDE.md — CleanEats (TRICODE Solutions · UNIFACOL)

Leia isto no início de toda sessão. Prompt completo: `docs/PROMPT-CLAUDE-CODE-CLEANEATS.md`.
Documentação do projeto: `docs/cleaneats-documentacao.md` (backlog CE-1 a CE-21 = critérios de aceite).

## O que é
Plataforma web de alimentação saudável com 3 perfis + admin: **Cliente** (verde), **Nutricionista** (azul-aço), **Restaurante** (coral), **Admin** (mesmo design system dos painéis). As 44 telas já estão desenhadas: o trabalho é **converter com fidelidade**, não redesenhar.

## Prazo e prioridade
**Apresentação em 25/11/2026.** Se não couber tudo: cliente ponta a ponta → restaurante (+ admin) → nutricionista → NutriBot → financeiro/analytics/relatórios.

## Fontes da verdade (ordem)
1. `telas-html/` (somente leitura) — layout, cores, tipografia, microcopy.
2. Figma `OrwW3hyoYKxySw4l7geO2U` — só para conferir uma tela pelo node-id (plano Starter, poucas chamadas; nunca varrer o arquivo).
3. `docs/cleaneats-documentacao.md` — regras de negócio e arquitetura.
4. Prompt — resolve conflitos. Fora disso: **perguntar**.

## Stack (não trocar sem aprovação)
- `frontend/`: React 18 + Vite 6 + TypeScript + React Router 6 + TanStack Query 5 + CSS Modules + tokens CSS. Ícones **lucide-react** (mesmo traço Feather das telas). Sem MUI/Chakra/Bootstrap.
- `backend/`: Java 21 + Spring Boot 3.5 (Web, JPA, Validation, Security, OAuth2 Resource Server), pacote `com.tricode.cleaneats.{domain,repository,service,controller,dto,config,security}`. Maven Wrapper (`./mvnw`).
- `supabase/`: Postgres + Auth + Realtime + Storage, **projeto na nuvem** (sem Docker nesta máquina). Migrations em `supabase/migrations/`, seed em `supabase/seed.sql`.
- PDF: OpenPDF (`PrescricaoService`). NutriBot: `ChatbotService` → API da Anthropic, chave só no servidor. Pagamentos: simulados (interface pronta p/ Stripe/Mercado Pago).

## Convenções
- Código, domínio e UI em **português**.
- Java: classes PascalCase (`Marmita`), sufixos `Repository/Service/Controller`, camelCase em métodos/atributos.
- React: componentes PascalCase, hooks `useX`, services camelCase (`buscarMarmitas()`).
- Banco: snake_case, PK `id`, FK `id_<entidade>`. Enums iguais aos Java (`StatusPedido`, `TierAssinatura`...).
- API: `/api/...` em kebab-case. Proposta completa em `docs/api-endpoints.md`.
- Formatos: `R$ 1.234,56`, `dd/mm/aaaa`, fuso `America/Recife` (`frontend/src/lib/formato.ts`).
- Git: branch por fase (`fase-0`, `fase-1`…), commits pequenos em português.

## Decisões fechadas
| Tema | Decisão |
|---|---|
| Preços (CE-15) | **Tela 09**: mensal 29,90 / 59,90 / 89,90; anual 286,80 / 574,80 / 862,80 (=23,90/47,90/71,90 por mês, -20%) |
| Remuneração da nutri | Repasse de **60%** da mensalidade Pro/Premium de cada cliente vinculado (tela 34 recalculada) |
| Comissão restaurante | 8% padrão, configurável por restaurante no admin, congelada no pedido |
| Dados de exemplo | Só no seed: 2026, Recife, "Sabor Natural". Nada fixo em componente |
| Admin | `/admin/aprovacoes` e `/admin/restaurantes` com o design system dos painéis |
| Entregador/mapa (18) | Timeline real; entregador e mapa simulados |
| Mapa (13) | Placeholder estático nesta versão |
| "Acompanhamento" (nutri) | Item desabilitado "Em breve" (lista por adesão fica em `/nutri/clientes?ordenar=adesao`) |
| Foto de alimento, videochamada, dieta por IA, apps nativos, NF, wearables, rede social, offline | **Fora do escopo** |
| Tela 26 | Oficial = `26-nutri-home (com menos infos).html` |
| Desktop de referência | 1440px (as telas fixam essa largura) |
| Login social | Opcional — fora da Fase 1 |
| Demo | Senha `CleanEats@2026`: `cliente@`, `nutri@`, `restaurante@`, `admin@cleaneats.test` |

## Segurança
- Perfil vem da tabela `usuario` (backend), nunca do front. `SecurityConfig` protege `/api/admin/**`, `/api/nutri/**`, `/api/painel-restaurante/**` por role.
- RLS ligada em todas as tabelas; escrita só pelo backend. Front usa Supabase apenas p/ Auth e Realtime.
- Nenhum segredo no git: `frontend/.env.local`, `backend/.env` / `backend/application-local.yml` (modelos `.env.example`).

## Design (skill Impeccable — única permitida)
- `PRODUCT.md` (produto) e `DESIGN.md` (tokens extraídos do CSS das telas) na raiz.
- Tokens: `frontend/src/design-system/tokens.css`; temas `.tema-nutri` / `.tema-restaurante`.
- Componentes: `frontend/src/design-system/components/` — vitrine em `/design-system`.
- Por tela: `audit` + `polish` sem mudar identidade. Comandos que mudam direção (`bolder`, `colorize`, `shape`…) só no admin.
- Divergências necessárias (a11y/responsivo) e sugestões → `docs/sugestoes-design.md`.
- Converter HTML: não copiar inline/estrutura gerada; manter microcopy; imagens em `frontend/public/img/` (sem hotlink); estados loading/vazio/erro/desabilitado/foco sempre.

## Comandos
```bash
cd frontend && npm run dev | npm test | npm run build
cd backend && ./mvnw spring-boot:run | ./mvnw test
```

## Estado
- **Fase 0 concluída (22/11/2026)** — ver `docs/relatorio-fase-0.md`. Próxima: Fase 1 (telas 01–05, 08–17, 19).
