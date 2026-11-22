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
