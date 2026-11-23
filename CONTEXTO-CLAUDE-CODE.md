# Contexto para continuar o CleanEats com o Claude Code

> **Claude Code: leia este arquivo inteiro antes de qualquer coisa, depois `CLAUDE.md`, `docs/frentes/README.md` e o arquivo da frente que for assumir.**
> Atualizado em 23/11/2026 pela sessão principal. A seção "Estado" é a fonte da verdade do que está pronto (a matriz `docs/matriz-funcionalidades.md` confirma botão a botão).

## 1. O projeto em 1 minuto
- Plataforma web de alimentação saudável (UNIFACOL · TRICODE). Perfis: **Cliente**, **Nutricionista**, **Restaurante**, **Admin**.
- **44 telas já desenhadas** em `telas-html/` (somente leitura). O trabalho é **converter com fidelidade** para React + API real, não redesenhar.
- Stack: `frontend/` React 18 + Vite + TS + React Router + TanStack Query + CSS Modules (ícones `lucide-react`) · `backend/` Java 21 + Spring Boot 3.5 · banco **Supabase** (Postgres + Auth + Storage + Realtime) na nuvem.
- Tudo em **português** (código, domínio, UI, commits).
- **Prazo: a apresentação é HOJE (23/11/2026). Nenhuma tela ou funcionalidade pode ser cortada.** Roteiro da apresentação: `docs/roteiro-demo.md` — o que está lá não pode falhar.

## 2. Como rodar (Windows)
Os arquivos de segredo **não estão no git**. Peça ao dono do projeto (por mensagem privada, nunca no repositório):
- `backend/.env` — modelo em `backend/.env.example` (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL/USER/PASSWORD, ANTHROPIC_API_KEY, RESEND_API_KEY…). Nesta máquina a API roda na porta **8090** (`PORT=8090`; a 8080 é do Steam).
- `frontend/.env.local` — modelo em `frontend/.env.example` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, `VITE_API_URL=http://localhost:8090/api`).

```bash
npm install                      # raiz (pg, para os scripts de banco)
npm --prefix frontend install
cd backend && ./mvnw spring-boot:run          # API (lê backend/.env sozinho)
cd frontend && npx vite --port 5180           # web
```
Logins de demo (senha `CleanEats@2026`): `cliente@cleaneats.test` (Breno, Pro), `nutri@cleaneats.test` (Dra. Ana Souza), `restaurante@cleaneats.test` (Sabor Natural), `admin@cleaneats.test`.

**Banco compartilhado (Supabase na nuvem):** nunca rode `npm run banco:resetar`. Aplique só arquivos novos e idempotentes: `npm run banco:sql <arquivo.sql>`. Antes de ensaiar/apresentar: `npm run banco:hoje` (traz o plano e o consumo da demo para hoje) e depois `npm run banco:sql supabase/restaurar-demo.sql` (desfaz assinaturas/avaliações feitas em ensaio).

## 3. Estado (23/11, manhã)
### Pronto (dados reais + ações da matriz, testado no navegador)
| Área | Telas |
|---|---|
| Público/conta | 01 landing · 02 login (Google real) · 03–05 cadastro · 08 recuperar senha · 09 seleção de plano · `/ficha/:id` · `/termos` · `/privacidade` · 404 · `/auth/callback` · central de notificações (sino) |
| Cliente (frente A) | 10 home · 11 marketplace · **15 monte sua marmita** · 12 detalhe do prato (QR real) · 13 restaurantes · 14 perfil do restaurante · 16 carrinho/checkout · 17 confirmado · 18 acompanhamento (Realtime) · 19 histórico · **20 avaliar** · **21 perfil** · **22 editar perfil** · **23 assinatura** · **24 meu plano** · **25 NutriBot** (frente A completa) |

### Falta (ordem sugerida = ordem do roteiro)
| Frente | Telas | Arquivo com as regras |
|---|---|---|
| **B — Nutricionista** | 06 cadastro da nutri · 26 home · 27 triagens · 28 clientes · 29 perfil do cliente · 30 editor de plano · 31 catálogo · 32 prescrição (PDF + e-mail) · 33 chat · 34 financeiro · 35 perfil · `/nutri/prescricoes` · `/nutri/acompanhamento` | `docs/frentes/frente-b-nutri.md` |
| **C — Restaurante + Admin** | 07 cadastro do restaurante · 36 dashboard · 37 pedidos (muda status → cliente vê na 18) · 38 cardápio · 39 criar prato · 40 aprovação · 41 analytics · 42 financeiro · 43 relatórios (CSV) · 44 perfil · `/admin` (aprovar CRN/CNPJ/pratos) · `/admin/avaliacoes` (moderação) · `/admin/suporte` · `/admin/restaurantes` (comissão + simular renovação) · **job da entrega simulada** (PRONTO → A_CAMINHO → ENTREGUE) | `docs/frentes/frente-c-restaurante.md` |

As rotas que faltam já existem e mostram "em construção": troque `emConstrucao(...)` pelo componente em `frontend/src/app/rotas/rotas<Frente>.tsx`.

### Pendência de configuração
- **`ANTHROPIC_API_KEY` vazia no `backend/.env`**: sem ela o NutriBot (tela 25) responde "NutriBot indisponível: a chave da IA não está configurada". Coloque uma chave válida antes da apresentação (modelo `claude-sonnet-5-5` via `ANTHROPIC_MODEL`).
- O chat cliente → nutri (`/api/conversas/nutri`) grava em `conversa`/`mensagem`: a **tela 33 (frente B)** deve listar e responder essas conversas.

## 4. Como trabalhar em paralelo sem pisar no outro
- `main` é a integração. **Cada pessoa/sessão assume uma frente inteira** e trabalha num branch: `frente-b-nutri` ou `frente-c-restaurante` (a frente A está no `main`, com a sessão principal).
  ```bash
  git checkout -b frente-c-restaurante origin/main   # ou frente-b-nutri
  # ... a cada tela: commit; a cada 2 telas: git pull --rebase origin main (ou merge) e git push -u origin <branch>
  ```
- Avise o dono quando uma tela estiver pronta; o merge para `main` é feito pela sessão principal (ou abra um PR para `main`).
- **Propriedade de arquivos:** tabela em `docs/frentes/README.md`. Resumo: cada frente edita só `features/<frente>/`, `services/<frente>.ts`, `rotas<Frente>.tsx`, `controller|service|dto.<frente>`, migrations com o **seu prefixo** (`2026112320xxxx` B, `2026112330xxxx` C) e `supabase/seeds/frente-<x>*.sql`. Arquivo compartilhado (design system, `SecurityConfig`, entidades compartilhadas): só se for pequeno e bloqueante; descreva no commit e em `docs/frentes/pedidos-ao-principal.md`.

## 5. Receita por tela (o que a sessão principal fez em cada uma)
1. **Ver o HTML**: tirar screenshot de `telas-html/NN-*.html` em 1440px (Playwright, ver item 7) e ler o texto/CSS do arquivo. Ler as linhas da tela em `docs/matriz-funcionalidades.md` (botões e ações esperadas).
2. **Banco**: conferir colunas em `supabase/migrations/`. Faltou coluna? migration nova da frente (`add column if not exists`), aplicar com `npm run banco:sql`. Dados de demo: seed idempotente da frente (`on conflict do nothing` / `where not exists`).
3. **Backend**: `service.<frente>` com JdbcClient (SQL direto, padrão do projeto) + `controller.<frente>`. Regra de negócio e validação **no service** (mensagem em português via `IllegalArgumentException` → 422). Teste JUnit quando houver cálculo/regra. `./mvnw -q compile`.
4. **Frontend**: funções em `services/<frente>.ts` (`chamarApi`), página em `features/<frente>/<tela>/` com CSS Module. Estados obrigatórios: `Skeleton` (carregando), `EmptyState` (vazio), `ErroCarregamento` (erro), desabilitado, foco visível, responsivo. **Nada fixo no componente**: todo dado vem da API. `npx tsc --noEmit -p .`
5. **Testar no navegador de verdade** (Playwright logado, clicando os botões) e comparar o screenshot com o do HTML.
6. Marcar ☑ na matriz, documentar rotas novas em `docs/api-endpoints.md`, **commit pequeno** (`Frente C: tela 37 pedidos com mudança de status`), push.

## 6. Peças prontas que você deve reaproveitar
- **Design system** `frontend/src/design-system/` (`Botao`, `Campo`, `Confirmacao` (diálogo), `EmptyState`, `ErroCarregamento`, `Skeleton`, `useToast`, `SidebarPainel` para os painéis nutri/restaurante/admin, `TabelaDados`, `StatCard`, `MacroBar`…). Vitrine em `/design-system`. Tokens em `tokens.css`; temas `.tema-nutri` / `.tema-restaurante`.
- **Auth**: `useAuth()` (usuário, perfil, tier, `sair()`), `UsuarioLogado.id()` no backend. Rotas da API já protegidas por perfil no `SecurityConfig` (`/api/nutri/**`, `/api/painel-restaurante/**`, `/api/admin/**`).
- **Notificações**: `NotificacaoService.notificar(idUsuario, tipo, titulo, corpo, link)` — aparece no sino via Realtime; respeita as preferências do usuário.
- **Realtime**: `useRealtime(tabela, filtro)` no front (tela 18 usa `historico_status_pedido`).
- **Upload de imagem**: o navegador NÃO escreve no Storage. Use `SupabaseServicoClient.enviarImagem(bucket, pasta, MultipartFile)` no backend (buckets: `pratos`, `restaurantes`, `avatares`, `avaliacoes` públicos; `prescricoes` privado). No front, `chamarApi` aceita `FormData`.
- **Assinatura** (`/api/assinatura`, tela 23): ao assinar Pro/Premium o cliente é vinculado a uma nutri e é criada `triagem` AGUARDANDO → é isso que a **tela 27 (frente B)** deve listar.
- **Avaliações** (tela 20) nascem `PENDENTE` e notificam os admins → a **`/admin/avaliacoes` (frente C)** aprova (`PUBLICADA`) ou rejeita; ao publicar, recalcule `restaurante.nota_media/total_avaliacoes`. A tela 12 só mostra `PUBLICADA`.
- **Pedidos** (tela 16 cria; tela 18 acompanha): a **tela 37 (frente C)** muda o status com `PATCH /api/painel-restaurante/pedidos/{id}/status`, gravando `historico_status_pedido` (o cliente vê na hora). Regra do job de entrega simulada: `docs/frentes/frente-c-restaurante.md`.
- **Plano alimentar**: a **tela 30 (frente B)** grava `plano_alimentar` + `refeicao_plano` com pratos reais aprovados → a tela 24 do cliente já lê (`GET /api/plano-alimentar`).

## 7. Armadilhas desta máquina (Windows + Git Bash)
- Ao passar rota como argumento (`/app/x`) no Git Bash, use `export MSYS_NO_PATHCONV=1`, senão vira `C:/Program Files/Git/app/x`.
- Script de captura logada: `cd frontend && node e2e/capturar.mjs <pasta> <email> /rota1,/rota2 1440` (precisa do front na 5180 e da API no ar).
- Heredoc com aspas simples dentro de CSS/JS pode quebrar o `bash -c`; prefira criar arquivos com a ferramenta de escrita.
- Reiniciar a API: matar o processo da porta 8090 (`Get-NetTCPConnection -LocalPort 8090` no PowerShell) e rodar `./mvnw -q spring-boot:run` de novo.
- Mudou entidade JPA? `./mvnw test -Dtest=MapeamentoBancoIT -Dintegracao=true` (confere o mapeamento contra o banco real).
- Testou ações que mexem no Breno (assinar, avaliar)? Rode `npm run banco:sql supabase/restaurar-demo.sql` depois.

## 8. Decisões fechadas (não reabrir)
Ver tabela "Decisões fechadas" em `CLAUDE.md` (preços, benefícios por tier, repasse 60% à nutri, comissão 8%, login, prescrição, NutriBot com `claude-sonnet-5-5`, entrega e renovação simuladas, mapas como placeholder, tela 26 oficial = "com menos infos", referência 1440px).
