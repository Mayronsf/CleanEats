# Relatório — Fase 0 (Fundação) · 22/11/2026

## Entregue
| Item do prompt | Status | Onde |
|---|---|---|
| 1. Inventário 44 telas | ✅ Todas presentes; extras, faltas e links quebrados listados | `docs/inventario-telas.md` |
| 2. CLAUDE.md + Impeccable init/document | ✅ `PRODUCT.md` (init com rodada de perguntas) e `DESIGN.md` (tokens reais do CSS) | raiz |
| 3. Monorepo + "hello" ponta a ponta | ✅ código pronto; ⚠️ **não executado contra um Supabase real** (falta o projeto na nuvem) | `/dev/conexao` |
| 4. Design system + `/design-system` | ✅ tokens + 24 componentes da lista + Botão, Campo, Logo | `frontend/src/design-system/` |
| 5. Schema + endpoints | ✅ 34 tabelas, RLS em todas, Realtime, seed núcleo; proposta da API por módulo | `supabase/`, `docs/schema.md`, `docs/api-endpoints.md` |
| 6. Relatório | ✅ este arquivo | — |

## Verificação feita
- **Backend:** `./mvnw test` → 7 testes de regra passando (fluxo de status do pedido, comissão 8%/configurável, preços dos tiers, benefícios/limite do NutriBot, repasse de 60%). Compila em Java 21 (rodado em JDK 26).
- **Frontend:** `tsc` sem erros, `vitest` 8/8 (formatos pt-BR, MarketplaceCard com macros, proporção 46/39/15, timeline, preço, quantidade, smoke da App), `vite build` ok com lazy loading por rota.
- **Banco:** migrations + seed executados num Postgres embarcado (PGlite) com stub do schema `auth`: 34 tabelas, 0 sem RLS, a view do CE-5 esconde restaurante sem prato aprovado, o check do CE-3 bloqueia prato sem ficha, o trigger grava o histórico de status, e a senha de demo confere via `crypt`.
- **Visual:** screenshots headless da vitrine a 1440px e 600px. A captura encontrou 2 bugs, ambos corrigidos: badges e ícones sem cor (convenção de nomes do CSS Modules) e overflow das grades no celular. O detector da Impeccable não encontrou nada.
- **Não verificado:** 390px real (o Chrome headless no Windows não abre janela tão estreita, fica para o Playwright na Fase 5) e o login real (precisa do Supabase).

## O que você precisa fazer para destravar o "hello" real
1. Criar o projeto no Supabase e rodar as 2 migrations + `seed.sql` no SQL Editor.
2. Preencher `frontend/.env.local` e `backend/.env` (modelos `.env.example`).
3. `./mvnw spring-boot:run` + `npm run dev` → abrir `/dev/conexao` e entrar com `cliente@cleaneats.test` / `CleanEats@2026`.

## Achados e riscos
| Risco | Impacto | Mitigação |
|---|---|---|
| **Prazo: 25/11 (3 dias)** com 44 telas + admin | Alto | Cortar escopo (abaixo) |
| Supabase ainda não criado; seed em `auth.users` depende do schema interno do Supabase | Médio | Seed segue o padrão usado pela comunidade; se falhar, criar os 4 usuários pelo painel Auth e rodar só a parte `public` |
| Projetos Supabase novos assinam JWT com ES256 | Baixo | Backend aceita JWKS (ES256/RS256) e, opcionalmente, HS256 |
| Gordura de 6 pratos derivada da barra de macros da tela 11; a da Tapioca foi estimada | Médio (CE: qualidade da informação) | Marcado no seed: confirmar com os restaurantes |
| NutriBot: risco legal alto | Alto | Aviso fixo no `ChatbotPanel`; prompt do sistema proibirá prescrição (Fase 4) |
| Açaí Club e Rota Proteica sem pratos nas telas | Baixo | Somem da listagem (CE-5) até o seed da Fase 1 incluir pratos da tela 14 |
| Laranja `#F4A261` como texto reprova AA | Baixo | Texto em `#A8571C` (`docs/sugestoes-design.md` #1) |

## Dúvidas em aberto
1. **Corte de escopo para 25/11** — proposta: Fase 1 completa + Fase 2 (restaurante + admin + realtime). Nutricionista, NutriBot e financeiro só se sobrar tempo, ou como telas navegáveis com dados do seed e sem as regras completas. Confirma?
2. Login social (Google/Facebook/Apple) fica fora? (proposta: sim)
3. Envio de e-mail da prescrição (CE-20): usar o SMTP do Supabase ou só gerar o PDF e oferecer download? (proposta: download + e-mail se houver SMTP)

## Estimativa (1 dev + Claude Code, dias úteis até a apresentação)
| Fase | Escopo | Estimativa |
|---|---|---|
| 1 | Público + cliente núcleo (01–05, 08–17, 19) + seed completo | ~1,5 dia |
| 2 | Restaurante + admin + realtime (07, 36–40, 18) | ~1 dia |
| 3 | Assinaturas + nutricionista (06, 09, 20–24, 26–33, 35) | ~2 dias |
| 4 | NutriBot + gestão (25, 34, 41–44) | ~1,5 dia |
| 5 | Audit/polish, responsivo, E2E, README | ~1 dia |
| **Total** | | **~7 dias**: não cabe até 25/11 sem cortar escopo |
