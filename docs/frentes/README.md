# Execução em paralelo — 3 frentes + sessão principal

Prazo: **corte de funcionalidades 24/11 às 23h**; 25/11 só correção de bugs. Apresentação em 25/11.

| Sessão | Escopo | Worktree | Branch | Instruções |
|---|---|---|---|---|
| **Principal (P)** | Telas 01–05, 08, 09 · telas novas públicas (ficha, termos, privacidade, 404, callback Google) · central de notificações · **dona do que é compartilhado** · integração e deploy | `cleaneats/` | `main` | `CLAUDE.md` |
| **A — Cliente** | Telas 10–25 (inclui NutriBot) | `../cleaneats-frente-a` | `frente-a-cliente` | [frente-a-cliente.md](frente-a-cliente.md) |
| **B — Nutricionista** | Telas 06, 26–35 + `/nutri/prescricoes`, `/nutri/acompanhamento` | `../cleaneats-frente-b` | `frente-b-nutri` | [frente-b-nutri.md](frente-b-nutri.md) |
| **C — Restaurante + Admin** | Telas 07, 36–44 + `/admin/*` + entrega simulada | `../cleaneats-frente-c` | `frente-c-restaurante` | [frente-c-restaurante.md](frente-c-restaurante.md) |

## Como abrir cada sessão
Os worktrees já foram criados pela sessão principal. Em um terminal novo, para cada frente:
```bash
cd "C:/Users/janie/Downloads/Fábrica de Software/cleaneats-frente-a"   # (ou -b, -c)
npm --prefix frontend install
cp ../cleaneats/backend/.env backend/.env           # quando existir
cp ../cleaneats/frontend/.env.local frontend/.env.local
claude
```
E cole como primeira mensagem:
> Leia `CLAUDE.md`, `docs/frentes/README.md` e `docs/frentes/frente-a-cliente.md` (troque pela sua frente) e execute a frente. Comece pela Etapa 1.

Rodar só uma frente localmente: backend `cd backend && ./mvnw spring-boot:run` (porta 8080) e front `npm --prefix frontend run dev`. **Duas frentes não podem subir o backend na mesma porta ao mesmo tempo**: use `SERVER_PORT=8081/8082/8083` (A/B/C) e `VITE_API_URL` correspondente no `.env.local` do worktree.

## Propriedade (quem pode editar o quê)
| Área | Dono | Frentes podem… |
|---|---|---|
| `frontend/src/design-system/**` (tokens, componentes base) | P | só **usar**. Componente novo específico da tela → `features/<frente>/componentes/` |
| `frontend/src/app/App.tsx`, `layouts/`, `rotas/RotaProtegida.tsx`, `hooks/useAuth.tsx`, `hooks/useRealtime.ts`, `services/api.ts`, `services/supabase.ts`, `lib/` | P | só usar |
| `frontend/src/app/rotas/rotas<Frente>.tsx` | a frente | editar livremente (trocar `emConstrucao` pelas telas) |
| `frontend/src/features/<frente>/**`, `frontend/src/services/<frente>.ts`, `frontend/src/hooks/<frente>/**` | a frente | tudo |
| `supabase/migrations/20261122*` (compartilhadas) | P | nunca editar |
| Migrations da frente | a frente | **só** com o prefixo da frente (abaixo), e só para colunas/índices/views de tabelas que são dela |
| `supabase/seed.sql` (núcleo: usuários de demo, **9 clientes da tela 28**, 6 restaurantes, **todos os pratos dos HTMLs**, **pedidos das telas 19 e 37**) | P | nunca editar — use os UUIDs fixos de lá |
| `supabase/seeds/frente-<x>.sql` | a frente | tudo (rodam depois do núcleo, na mesma sessão) |
| `backend/.../domain/` entidades **compartilhadas** (Usuario, PerfilCliente, Restaurante, Marmita, Pedido, ItemPedido, HistoricoStatusPedido, Nutricionista, PlanoAlimentar, RefeicaoPlano, Assinatura, Fatura, ConsumoDiario, Notificacao, Repasse, Enums, CalculoFinanceiro, Status*, TierAssinatura, PerfilUsuario) | P | usar; pedir mudança |
| Entidades das tabelas da frente (ver arquivo da frente) | a frente | criar em `domain/` (arquivo novo) |
| `backend/.../repository/` compartilhados | P | usar; consulta nova → criar **um repositório da frente** ou usar `JpaSpecificationExecutor` |
| `backend/.../{controller,service,dto}/<frente>/**` | a frente | tudo |
| `config/SecurityConfig.java`, `security/**`, `service/NotificacaoService.java`, `application.yml` | P | pedir mudança |
| `docs/matriz-funcionalidades.md` | todas | marcar ☑ **só nas linhas das suas telas** |

**Prefixos de migration** (Supabase ordena pelo número):
- P: `20261123000000`–`20261123099999`
- A: `20261123100000_…` em diante (`2026112310xxxx`–`2026112319xxxx`)
- B: `2026112320xxxx`–`2026112329xxxx`
- C: `2026112330xxxx`–`2026112339xxxx`

**Pacotes do backend:** `controller.<frente>`, `service.<frente>`, `dto.<frente>`, com `<frente>` = `cliente` (A), `nutri` (B), `restaurante` e `admin` (C), `conta`/`publico` (P). Rotas da API como em `docs/api-endpoints.md` (já protegidas por perfil no `SecurityConfig`).

## Pedir mudança à sessão principal
Não edite arquivo compartilhado. Pare, escreva o pedido no fim de `docs/frentes/pedidos-ao-principal.md` **no seu branch** e avise o usuário com o texto do pedido (ele leva para a sessão principal). Formato:
```
## [A] 23/11 14:10 — Marmita precisa de campo X
Motivo: tela 12 mostra …  ·  Proposta: coluna `x` em marmita + getter na entidade.
```
Enquanto isso, siga com outra tela. A principal publica a mudança em `main`; a frente puxa com `git merge main`.

## Banco no ar (22/11, 22h)
O Supabase do projeto já tem as migrations e o seed central aplicados. Login de demo funcionando: `cliente@`, `nutri@`, `restaurante@` e `admin@cleaneats.test`, com a senha `CleanEats@2026`.
- Cada worktree já tem `backend/.env` e `frontend/.env.local`, ignorados pelo git: **A na porta 8081, B na 8082, C na 8083**. O `VITE_API_URL` de cada worktree já aponta para a porta certa. Não copie esses arquivos para outro lugar e não os commite.
- **O banco é compartilhado pelas 4 sessões.** Não rode `npm run banco:resetar` nem apague dados: peça à principal. Para aplicar a migration ou o seed da sua frente, mande o pedido em `pedidos-ao-principal.md`; a principal aplica e avisa.
- Criou entidade nova? Antes de cada integração, rode `cd backend && ./mvnw test -Dtest=MapeamentoBancoIT -Dintegracao=true`. Ele lê todas as entidades do banco real e acusa erro de mapeamento.
- Siga a ordem: primeiro as telas lendo dados reais (GET), depois as ações.

## Ritmo e sincronização
- **Etapa 1 (até 23/11 12h):** todas as telas da frente **navegáveis com dados reais** (GET da API + seed da frente). Nada fixo em componente. Botões ainda podem só navegar.
- **Etapa 2 (até 24/11 18h):** todas as **ações** da matriz funcionando de ponta a ponta + testes.
- **24/11 18h–23h:** testes E2E dos atos do roteiro, `/impeccable audit` + `polish` nas telas da frente, correções.
- **24/11 23h: corte.** 25/11: só bugs.
- A cada tela concluída: commit pequeno em português (`frente A: tela 11 marketplace com filtros reais`).
- **Puxe `main` pelo menos a cada 3 horas** (`git merge main`) e rode `npm --prefix frontend test` + `cd backend && ./mvnw test`.
- **Pontos de integração (a principal faz o merge em `main`):** 23/11 12h, 23/11 22h, 24/11 18h, 24/11 23h. Antes de cada um: build e testes verdes no branch.

## Definição de pronto (por tela)
1. Rota da seção 4 abre, lendo dados do banco (seed da frente); sem dado fixo em componente.
2. Fiel ao HTML (`telas-html/`) — conferir lado a lado com screenshot em 1440px; Figma só por node-id em caso de dúvida.
3. Estados: carregando (Skeleton), vazio (EmptyState), erro (ErroCarregamento), desabilitado, foco visível.
4. Responsivo (desktop/tablet/celular) e acessível (label, alt, teclado).
5. Todos os botões da tela na matriz com ação REAL (ou SIMULADA se for integração externa) e ☑.
6. Regras de negócio no **backend** (service), com teste JUnit quando houver cálculo/validação.
7. Passos do `docs/roteiro-demo.md` que usam a tela funcionando.

## Contratos entre frentes
| Quem produz | Quem consome | Contrato |
|---|---|---|
| C — status do pedido (`PATCH /api/painel-restaurante/pedidos/{id}/status`) + job de entrega simulada | A — tela 18 | Tabelas `pedido` e `historico_status_pedido` via `useRealtime` |
| A — criação de pedido (`POST /api/pedidos`) | C — telas 36/37 | `INSERT` em `pedido` via Realtime; `NotificacaoService` avisa o restaurante |
| B — plano (`plano_alimentar` + `refeicao_plano`) | A — telas 10, 24, NutriBot | Lê o plano ativo do cliente (`PlanoAlimentarRepository.findByIdUsuarioAndAtivoTrue`) |
| A — `consumo_diario` | B — 29 e acompanhamento; A — NutriBot | Atualizado ao confirmar o pedido |
| C — aprovação de prato | A — marketplace · B — catálogo/editor | Só `status_prato = 'APROVADO'` aparece |
| A — assinatura Pro/Premium | B — triagens, financeiro | Cliente Pro/Premium sem nutri → triagem `AGUARDANDO` com a nutri disponível (criada pelo service de assinatura de A) |
| A — avaliação | C — `/admin/avaliacoes` | `avaliacao.status_moderacao` |
| Todas | P — central de notificações | `NotificacaoService.notificar(...)` |

## Mudança de 23/11 (madrugada)
As frentes não tinham começado. A **sessão principal assumiu a frente A (telas 10–25)** e trabalha direto em `main`, seguindo `frente-a-cliente.md`. Se uma sessão da frente A for aberta, ela deve primeiro rodar `git merge main` e combinar com o usuário quais telas ainda estão livres (ver a matriz: linhas ☑ já feitas). As frentes B e C seguem disponíveis.

## Mudança de 23/11 (manhã) — APRESENTAÇÃO HOJE, SEM CORTE
A apresentação foi antecipada para **hoje, 23/11**. Nenhuma tela ou funcionalidade sai do escopo. Regras do dia:
- **Etapas 1 e 2 juntas:** cada tela já sai com dados reais **e** com as ações da matriz funcionando. Commit por tela.
- **Banco:** a principal está ocupada com a frente A, então cada frente aplica **só os próprios arquivos** com `npm run banco:sql supabase/migrations/<sua migration>.sql` ou `npm run banco:sql supabase/seeds/frente-<x>.sql` (o seed tem que ser idempotente: `on conflict do nothing` / `where not exists`). Nunca `banco:resetar`, nunca apagar dados de outra frente.
- **Arquivo compartilhado** (entidade compartilhada, `SecurityConfig`, design system): se for bloqueante e pequeno, edite e descreva a mudança no commit e em `pedidos-ao-principal.md` (status `FEITO PELA FRENTE`) para a principal revisar no merge. Sem refatorar nada da principal.
- **Integração:** a cada 2 telas, `git merge main` no seu branch; a principal faz merge dos branches das frentes em `main` periodicamente. Build e `tsc` verdes antes de avisar.
- **Front local:** `npm --prefix frontend run dev -- --port 5182` (B) / `--port 5183` (C) para não brigar com a principal (5180).
- Use o roteiro (`docs/roteiro-demo.md`) para decidir a ordem: primeiro as telas que aparecem nos atos.
