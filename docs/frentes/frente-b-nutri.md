# Frente B — Nutricionista (telas 06, 26–35 + prescrições e acompanhamento)

Leia antes: `CLAUDE.md`, `docs/frentes/README.md`, `docs/matriz-funcionalidades.md` (suas linhas), `docs/roteiro-demo.md` (Atos 1.12 e 5), `DESIGN.md`.
Worktree `../cleaneats-frente-b` · branch `frente-b-nutri` · backend na porta **8082** · migrations `2026112320xxxx–2026112329xxxx`.
Acento **azul-aço** (`.tema-nutri`, já aplicado pelo `LayoutPainel`). Oficial da tela 26: `26-nutri-home (com menos infos).html`.

## Você é dona de
- **Front:** `frontend/src/app/rotas/rotasNutri.tsx` (inclui `menuNutri` e `/cadastro/nutricionista`), `frontend/src/features/nutri/**`, `frontend/src/services/nutri.ts`, `frontend/src/hooks/nutri/**`.
- **Back:** `controller.nutri`, `service.nutri`, `dto.nutri` — rotas `/api/nutri/**` (já exigem perfil NUTRICIONISTA) e `POST /api/cadastro/nutricionista`.
- **Tabelas (entidades novas, arquivos seus):** `triagem`, `prescricao`, `conversa`, `mensagem`, `medicao`. Escreve nas compartilhadas `plano_alimentar`/`refeicao_plano` (entidades da principal), `nutricionista`, `perfil_cliente` (metas) e lê `repasse`.
- **Seed:** `supabase/seeds/frente-b.sql` — ~9 clientes da Dra. Ana Souza (crie com `pg_temp.criar_usuario_demo(...)`, disponível porque os seeds rodam na mesma sessão; e-mails `@cleaneats.test`), Breno incluído; triagens (tela 27: 3 pendentes, 2 em andamento, 18 concluídas — pode reduzir os números se a tela calcular a partir do banco); plano da semana do Breno com pratos reais do núcleo (tela 24/30); medições (tela 29); conversas e mensagens (tela 33); prescrições anteriores (histórico); faturas Pro/Premium desses clientes para o financeiro (tela 34) — **preços da tela 09** e **repasse de 60%** (nada de R$ 189,90/249,90).

## Etapa 1 — navegável com dados reais (até 23/11 12h)
26 Dashboard → 27 Triagens → 28 Meus clientes → 29 Perfil do cliente → 31 Catálogo → 30 Editor de plano → 32 Prescrição → `/nutri/prescricoes` → 33 Mensagens → 34 Financeiro → 35 Perfil profissional → `/nutri/acompanhamento` → 06 Cadastro.

## Etapa 2 — ações (até 24/11 18h)
| Tela | Ações REAIS obrigatórias |
|---|---|
| 06 | Cadastro com CRN (validar formato `CRN-<região> <UF> <número>/<letra>`), especialidades, agenda → `nutricionista.status_aprovacao = PENDENTE`; enquanto pendente/rejeitado, o painel mostra o status e o motivo |
| 26 | KPIs reais (clientes ativos, triagens pendentes, mensagens não lidas, adesão média) |
| 27 | Abas por status; iniciar triagem; definir metas (kcal, P/C/G, fibras, água) → grava em `perfil_cliente` e `triagem.status = CONCLUIDA` |
| 28 | Busca, filtros, grade/lista, paginação no servidor |
| `/nutri/acompanhamento` | Mesmos componentes da 28, ordenado por **adesão** = refeições do plano pedidas ÷ planejadas nos últimos 7 dias |
| 29 | Abas (visão geral, pedidos), evolução, **registrar medição**, "Editar plano" → 30 |
| 30 | Para cada dia × refeição: escolher **prato do catálogo aprovado** (`PlanoAlimentar.definirRefeicao` já valida) + observação; adicionar refeição extra; trocar cliente; salvar → notifica o cliente (`NotificacaoService`) — CE-19 |
| 31 | Só `status_prato = APROVADO`; filtros por restaurante/categoria/proteína/restrições |
| 32 | Emitir prescrição (**só cliente Premium**): `PrescricaoService` gera PDF com **OpenPDF** (já está no `pom.xml`) com nome do cliente, plano, metas, CRN e assinatura digital (imagem de `assinatura_digital_url` + hash SHA-256 do documento); salva no Storage (bucket `prescricoes`, privado), grava `prescricao`, **download** e **e-mail** (CE-20) |
| `/nutri/prescricoes` | Histórico com download de cada PDF (URL assinada do Storage) |
| 33 | Chat em tempo real (`useRealtime('mensagem', 'id_conversa=eq.<id>')`), enviar, marcar como lida; respeitar limite do tier do cliente (Pro 2x/semana, Premium ilimitado) |
| 34 | Receita bruta = mensalidades dos clientes vinculados; líquido = **60%** (`CalculoFinanceiro.calcularRepasseNutricionista`); gráfico 6 meses; exportar CSV |
| 35 | Editar perfil profissional, agenda, especialidades, assinatura digital (upload) |

### E-mail da prescrição
- `EmailService` (pacote `service.nutri`): **Resend** via HTTP (`RESEND_API_KEY`, `EMAIL_REMETENTE`) com fallback SMTP (`spring-boot-starter-mail`, se configurado). PDF anexo.
- Modo demo: se `EMAIL_REDIRECIONAR_PARA` estiver definido, **todo e-mail vai para esse endereço** (os e-mails `@cleaneats.test` não existem). Registre no corpo o destinatário original.
- Dependências (OpenPDF, `spring-boot-starter-mail`) e variáveis (`cleaneats.email.*`, `RESEND_API_KEY`, `EMAIL_REMETENTE`, `EMAIL_REDIRECIONAR_PARA`, `SPRING_MAIL_*`) já estão no `pom.xml`, `application.yml` e `.env.example`.

## Dependências
- Da **A**: assinatura Pro/Premium cria a `triagem` e vincula a nutri; `consumo_diario` e pedidos (adesão). Até lá, use o seed da frente B.
- Da **C**: aprovação do CRN no `/admin`. Até lá, a Dra. Ana já está APROVADA no núcleo.

## Testes
- JUnit: validação de CRN, cálculo de adesão, repasse 60%, geração do PDF (conteúdo contém nome, CRN e metas), plano só com prato aprovado.
- Playwright: Ato 5 do roteiro.
