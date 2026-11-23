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
O Supabase do projeto já tem as migrations e o seed central aplicados. Login de demo funcionando: , , ,  com a senha .
- Cada worktree já tem  e , ignorados pelo git: **A na porta 8081, B na 8082, C na 8083**. O  de cada worktree já aponta para a porta certa. Não copie esses arquivos para outro lugar e não os commite.
- **O banco é compartilhado pelas 4 sessões.** Não rode  nem apague dados: peça à principal. Para aplicar a migration ou o seed da sua frente, mande o pedido em ; a principal aplica e avisa.
- Criou entidade nova? Antes de cada integração, rode [INFO] Scanning for projects...
[INFO] 
[INFO] -----------------------< com.tricode:cleaneats >------------------------
[INFO] Building CleanEats API 1.0.0
[INFO]   from pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
[INFO] 
[INFO] --- resources:3.3.1:resources (default-resources) @ cleaneats ---
[INFO] Copying 1 resource from srcmainesources to targetclasses
[INFO] Copying 0 resource from srcmainesources to targetclasses
[INFO] 
[INFO] --- compiler:3.14.1:compile (default-compile) @ cleaneats ---
[INFO] Nothing to compile - all classes are up to date.
[INFO] 
[INFO] --- resources:3.3.1:testResources (default-testResources) @ cleaneats ---
[INFO] skip non existing resourceDirectory C:UsersjanieDownloadsFábrica de Softwarecleaneatsackendsrc	estesources
[INFO] 
[INFO] --- compiler:3.14.1:testCompile (default-testCompile) @ cleaneats ---
[INFO] Nothing to compile - all classes are up to date.
[INFO] 
[INFO] --- surefire:3.5.4:test (default-test) @ cleaneats ---
[INFO] Using auto detected provider org.apache.maven.surefire.junitplatform.JUnitPlatformProvider
[INFO] 
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.tricode.cleaneats.MapeamentoBancoIT
[WARNING] Tests run: 1, Failures: 0, Errors: 0, Skipped: 1, Time elapsed: 0.005 s -- in com.tricode.cleaneats.MapeamentoBancoIT
[INFO] 
[INFO] Results:
[INFO] 
[WARNING] Tests run: 1, Failures: 0, Errors: 0, Skipped: 1
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  2.129 s
[INFO] Finished at: 2026-11-22T21:59:07-03:00
[INFO] ------------------------------------------------------------------------. Ele lê todas as entidades do banco real e acusa erro de mapeamento.
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
