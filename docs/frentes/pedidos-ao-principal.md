# Pedidos das frentes à sessão principal

Cada frente acrescenta pedidos no fim deste arquivo **no seu branch** e avisa o usuário. A principal responde aqui com o status.

| Status | Significado |
|---|---|
| ABERTO | aguardando a principal |
| FEITO em `main` (commit) | a frente faz `git merge main` |
| RECUSADO | com motivo e alternativa |

## Já atendidos pela principal antes da abertura das frentes (22/11)
- FEITO — `anthropic-java` 3.3.0, OpenPDF 2.0.3 e `spring-boot-starter-mail` no `pom.xml`; chaves `cleaneats.nutribot.*`, `cleaneats.email.*`, `cleaneats.entrega.*`, `cleaneats.supabase-servico.*` no `application.yml`.
- FEITO — `NotificacaoService`, `useRealtime`, `PaginaDto`, `UsuarioLogado`, entidades e repositórios compartilhados.
- LIVRE — `qrcode.react` (frente A, tela 12) pode ser instalado direto no `frontend/package.json`; conflito de lockfile a principal resolve no merge.

## Pedidos

## [P] 22/11 — AVISO A TODAS AS FRENTES: seed central ampliado (decisão do usuário)
Os pratos de todos os restaurantes, os 9 clientes da tela 28 e os pedidos das telas 19 e 37 passam a ficar no `supabase/seed.sql` central (pronto até 23/11 12h). **Não os crie nos seeds das frentes.** Rode `git merge main` e releia a seção "Seed" do seu arquivo de frente. NutriBot passa a usar `claude-sonnet-5-5` por padrão (variável `ANTHROPIC_MODEL`).

## [P] 22/11 — Seed central ampliado: FEITO
36 pratos, 25 usuários e 50 pedidos já estão no `seed.sql` central. O mapa de UUIDs e os conflitos resolvidos estão em `docs/relatorio-seed.md`. Rode `git merge main`. Frente C: veja a regra exata do job de entrega simulada no seu arquivo (o seed depende dela).

## [P] 22/11 — Mudança de dono (frente A, leia)
- `POST /api/contatos-suporte`, a entidade `ContatoSuporte` e o componente `features/suporte/FaleConosco` agora são da **sessão principal** (usados nas telas 04, 17, 18, 21). Nas suas telas, use `<FaleConosco aberto onFechar assuntoInicial />`.
- `restricao_alimentar`, `cliente_restricao`, a entidade `RestricaoAlimentar` e `RestricaoAlimentarRepository` (com `listarDoCliente`, `limparDoCliente`, `vincular`) agora são **compartilhados**, e o `GET /api/restricoes` é da principal. A tela 22 usa esse repositório para editar as restrições.
- `UsuarioService.criarConta(...)` está pronto para os cadastros 06 (frente B) e 07 (frente C).
- O seed passou a ter **8 restrições**, na ordem da tela 05 (entraram `sem-oleaginosas` e `sem-carne-suina`).
