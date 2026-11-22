# CLAUDE.md — CleanEats (TRICODE Solutions · UNIFACOL)

Leia isto no início de toda sessão. Prompt original: `docs/PROMPT-CLAUDE-CODE-CLEANEATS.md`.
Documentação do projeto: `docs/cleaneats-documentacao.md` (backlog CE-1 a CE-21 = critérios de aceite).

## O que é
Plataforma web de alimentação saudável com 3 perfis + admin: **Cliente** (verde), **Nutricionista** (azul-aço), **Restaurante** (coral), **Admin** (design system dos painéis). As 44 telas já estão desenhadas: o trabalho é **converter com fidelidade**, não redesenhar.

## Escopo e prazo (decisão de 22/11 — SEM CORTE)
- **Todas as 44 telas + telas novas**, navegáveis pelas rotas, lendo dados reais do banco. Telas novas: `/ficha/:id` (QR real), `/admin` (+ `/admin/avaliacoes`, `/admin/suporte`, `/admin/restaurantes`), `/nutri/prescricoes`, `/nutri/acompanhamento`, central de notificações (sino), `/termos`, `/privacidade`, 404, `/auth/callback`.
- Funcionalidades **REAIS** por padrão; **SIMULADAS** só: cobrança cartão/PIX, renovação da assinatura (botão no admin), entregador/rastreio da tela 18, login com Facebook ("em breve"), mapas. **Login com Apple removido.** Nenhum botão sem ação → `docs/matriz-funcionalidades.md`.
- **Corte de funcionalidades: 24/11 às 23h.** 25/11 só bugs. Apresentação 25/11 seguindo `docs/roteiro-demo.md` (o que está lá não pode falhar).
- Execução em **3 frentes paralelas** (git worktrees) + esta sessão principal → `docs/frentes/README.md`.

## Esta sessão (principal) é dona de
Telas 01–05, 08, 09 e as telas novas públicas; central de notificações; **tudo que é compartilhado** (design system, `App.tsx`, layouts, auth, `useRealtime`, migrations `20261122*`/`2026112300xxxx`, `seed.sql`, entidades/repositórios compartilhados, `SecurityConfig`, `application.yml`, `pom.xml`); integração (merge das frentes em `main` às 23/11 12h, 23/11 22h, 24/11 18h, 24/11 23h); deploy. Pedidos das frentes: `docs/frentes/pedidos-ao-principal.md`.

## Fontes da verdade (ordem)
1. `telas-html/` (somente leitura) — layout, cores, tipografia, microcopy.
2. Figma `OrwW3hyoYKxySw4l7geO2U` — só para conferir uma tela pelo node-id (plano Starter; nunca varrer o arquivo).
3. `docs/cleaneats-documentacao.md` — regras de negócio e arquitetura.
4. Prompt + decisões abaixo. Fora disso: **perguntar**.

## Stack (não trocar sem aprovação)
- `frontend/`: React 18 + Vite 6 + TypeScript + React Router 6 (`useRoutes`, um arquivo de rotas por frente em `src/app/rotas/`) + TanStack Query 5 + CSS Modules + tokens CSS. Ícones **lucide-react**. Sem MUI/Chakra/Bootstrap.
- `backend/`: Java 21 + Spring Boot 3.5 (Web, JPA, Validation, Security, OAuth2 Resource Server, Mail, Scheduling), `com.tricode.cleaneats.{domain,repository,service,controller,dto,config,security}` com subpacotes por frente (`cliente`, `nutri`, `restaurante`, `admin`, `conta`). Maven Wrapper. Lê `backend/.env` sozinho.
- `supabase/`: projeto na nuvem. Tipos de status são `domain` de texto com CHECK (não enum nativo) → JPA usa `@Enumerated(STRING)`.
- PDF: **OpenPDF**. NutriBot: `anthropic-java` 3.3.0, modelo `claude-opus-5-5` (configurável), chave só no servidor. E-mail: Resend (ou SMTP) com `EMAIL_REDIRECIONAR_PARA` no modo demo.

## Convenções
- Código, domínio e UI em **português**.
- Java: classes PascalCase, sufixos `Repository/Service/Controller`, camelCase. Regra de negócio nas entidades/services, nunca no controller nem no front.
- React: componentes PascalCase, hooks `useX`, services camelCase (`buscarMarmitas()`).
- Banco: snake_case, PK `id`, FK `id_<entidade>`. Migrations com prefixo por dono (ver `docs/frentes/README.md`).
- API `/api/...` kebab-case (`docs/api-endpoints.md`); paginação `PaginaDto` (`{ itens, pagina, totalPaginas, totalItens }`); erros `ErroDto`.
- Formatos: `R$ 1.234,56`, `dd/mm/aaaa`, fuso `America/Recife` (`frontend/src/lib/formato.ts`).
- Git: commits pequenos em português; `main` = integração; frentes em `frente-a-cliente`, `frente-b-nutri`, `frente-c-restaurante`.

## Decisões fechadas
| Tema | Decisão |
|---|---|
| Preços (CE-15) | **Tela 09**: mensal 29,90 / 59,90 / 89,90; anual 286,80 / 574,80 / 862,80 (=23,90/47,90/71,90 por mês, -20%) |
| Benefícios por tier | Basic NutriBot 5/dia; Pro nutri dedicada + NutriBot ilimitado + 5% desc.; Premium + prescrição + 15% + entrega grátis > R$ 30 (`TierAssinatura`) |
| Remuneração da nutri | Repasse de **60%** da mensalidade Pro/Premium de cada cliente vinculado |
| Comissão restaurante | 8% padrão, configurável por restaurante no admin, congelada no pedido (sobre produtos − descontos) |
| Login | E-mail/senha + **Google real**; Facebook "em breve"; **Apple removido** |
| Prescrição (CE-20) | PDF (OpenPDF) com download **e** e-mail; histórico em `/nutri/prescricoes`; só Premium |
| NutriBot (CE-21) | Real, contexto = plano + consumo do dia + metas; nunca prescreve; limite por tier |
| Entrega (tela 18) | Timeline real; entregador e avanço `PRONTO → A_CAMINHO → ENTREGUE` simulados por job |
| Renovação (CE-16) | "Simular renovação" no `/admin/restaurantes` |
| Dados de exemplo | Só nos seeds: 2026, Recife, "Sabor Natural". Nada fixo em componente. 7 pratos do núcleo marcados `[MACROS EXATOS]/[GORDURA DERIVADA]/[GORDURA ESTIMADA]` |
| Admin | `/admin` (aprovações) — home do perfil ADMIN |
| "Acompanhamento" (nutri) | Tela real `/nutri/acompanhamento` (componentes da 28, ordem por adesão) |
| Mapas (13, 18) | Placeholder estático |
| Fora do escopo | Foto de alimento, videochamada, dieta por IA, apps nativos, NF, wearables, rede social, offline |
| Tela 26 | Oficial = `26-nutri-home (com menos infos).html` |
| Desktop de referência | 1440px |
| Demo | Senha `CleanEats@2026`: `cliente@`, `nutri@`, `restaurante@`, `admin@cleaneats.test` |

## Segurança
- Perfil vem da tabela `usuario` (backend). `SecurityConfig` protege `/api/admin/**`, `/api/nutri/**`, `/api/painel-restaurante/**` por role.
- RLS ligada em todas as tabelas; escrita só pelo backend. Front usa Supabase para Auth, Realtime e upload no Storage.
- Nenhum segredo no git (`backend/.env`, `frontend/.env.local`; modelos `.env.example`). `service_role` e chaves de IA/e-mail só no servidor.

## Design (skill Impeccable — única permitida)
- `PRODUCT.md`, `DESIGN.md` na raiz. Tokens `frontend/src/design-system/tokens.css`; temas `.tema-nutri` / `.tema-restaurante`. Vitrine `/design-system`.
- Por tela: `audit` + `polish` sem mudar identidade. Comandos que mudam direção só no admin.
- Divergências necessárias (a11y/responsivo) → `docs/sugestoes-design.md`.
- Converter HTML: não copiar inline/estrutura gerada; manter microcopy; imagens em `frontend/public/img/` ou Storage (sem hotlink); estados loading/vazio/erro/desabilitado/foco sempre.

## Comandos
```bash
npm run demo                 # raiz: API + web (plano B)
npm run banco | banco:resetar  # raiz: migrations + seeds no Supabase
cd frontend && npm run dev | npm test | npm run build
cd backend && ./mvnw spring-boot:run | ./mvnw test
```

## Estado
- Fase 0 concluída (22/11). Base compartilhada para as frentes pronta (22/11): rotas por frente com placeholders, layouts, guarda por perfil, entidades/repositórios, `NotificacaoService`, `useRealtime`, migrations com escopo completo, seeds por frente, scripts de demo/banco, deploy.
- Próximo nesta sessão: telas 01–05, 08, 09; login Google; central de notificações; `/ficha/:id`; termos/privacidade; integração às 12h de 23/11.
