# Frente A — Cliente (telas 10–25)

Leia antes: `CLAUDE.md`, `docs/frentes/README.md` (regras de propriedade e ritmo), `docs/matriz-funcionalidades.md` (suas linhas), `docs/roteiro-demo.md` (Atos 2, 4 e 6), `DESIGN.md`.
Worktree `../cleaneats-frente-a` · branch `frente-a-cliente` · backend na porta **8081** · migrations `2026112310xxxx–2026112319xxxx`.

## Você é dona de
- **Front:** `frontend/src/app/rotas/rotasCliente.tsx`, `frontend/src/features/cliente/**`, `frontend/src/services/cliente.ts`, `frontend/src/hooks/cliente/**`.
- **Back:** `controller.cliente`, `service.cliente`, `dto.cliente` — rotas `/api/marmitas`, `/api/restaurantes`, `/api/componentes-marmita`, `/api/favoritos`, `/api/pedidos`, `/api/historico-pedidos`, `/api/perfil`, `/api/enderecos`, `/api/consumo-diario`, `/api/plano-alimentar` (leitura), `/api/assinatura`, `/api/nutribot`, `/api/conversas` (lado do cliente), `/api/contatos-suporte`.
- **Tabelas (entidades novas em `domain/`, arquivos seus):** `favorito`, `cupom`, `avaliacao`, `componente_marmita`, `endereco`, `cliente_restricao`, `restricao_alimentar` (leitura), `conversa_chatbot`, `mensagem_chatbot`, `conquista`, `conquista_usuario`, `contato_suporte`. Escreve também nas compartilhadas `pedido`, `item_pedido`, `consumo_diario`, `perfil_cliente`, `usuario`, `assinatura`, `fatura` usando as entidades da principal.
- **Seed:** pratos de todos os restaurantes, os 9 clientes da tela 28 e os **pedidos das telas 19 e 37 ficam no `seed.sql` central** (sessão principal, até 23/11 12h) — não os crie. `supabase/seeds/frente-a.sql` fica com: avaliações publicadas (tela 12: Marina S., Rafael M., Júlia P.), favoritos, conquistas (tela 21), consumo de hoje (tela 10: 1.247 kcal, 86 g P, 142 g C, 42 g G, 18 g F), componentes do monte sua marmita (tela 15, exatamente os da tela), cupons (incluindo **NUTRI15**, usado no CE-4823), faturas da assinatura (tela 23), conversa inicial do NutriBot. Os endereços Casa/Trabalho do Breno (tela 16) já estão no central. Avaliações da tela 12 citam os pedidos CE-4823/CE-4801/CE-4756 de outros clientes: o CE-4823 e o CE-4756 já são do Breno — crie pedidos **novos** (códigos CE-47xx livres) para as avaliadoras Marina S., Rafael M. e Júlia P. Mapa de UUIDs: `docs/relatorio-seed.md`.

## Etapa 1 — navegável com dados reais (até 23/11 12h)
Para cada tela: endpoint GET + página fiel ao HTML com loading/vazio/erro. Ordem sugerida (segue o roteiro):
10 Home → 11 Marketplace → 12 Detalhe → 13 Restaurantes → 14 Perfil do restaurante → 15 Monte sua marmita → 16 Carrinho → 17 Confirmado → 18 Acompanhamento → 19 Histórico → 24 Meu plano → 21 Perfil → 22 Editar perfil → 23 Assinatura → 20 Avaliar → 25 NutriBot.

## Etapa 2 — ações (até 24/11 18h)
| Tela | Ações REAIS obrigatórias |
|---|---|
| 11 | Filtros categoria/proteína/calorias/preço/restaurante/avaliação **atualizam sozinhos** (query params + paginação no servidor); objetivo prioriza e restrições escondem (CE-4/6/10); busca da navbar (`?busca=`) |
| 12 | Quantidade + "Adicionar ao pedido" (carrinho); favoritar; **QR Code real** apontando para `${origin}/ficha/:id` (lib `qrcode.react` — pode instalar); avaliações publicadas |
| 13/14 | Só restaurantes de `vw_restaurante_publico` (CE-5); filtros por cozinha e ordenação; mapa = placeholder estático |
| 15 | Seleção de objetivo, proteína, carboidrato com tamanho P/M/G, vegetais, adicionais → kcal/macros/preço em tempo real + meta por refeição (450/650/550); "Adicionar" cria item personalizado (backend recalcula — nunca confiar no preço do front) |
| 16 | Carrinho persistido (localStorage por usuário), cupom (`POST /api/pedidos/previa`), endereço (CRUD), entrega imediata/agendada, forma de pagamento (**SIMULADA**: aprova na hora), **confirmação antes de registrar** (CE-9) |
| 17 | Mostra o pedido criado; soma ao `consumo_diario` |
| 18 | Timeline com `useRealtime('historico_status_pedido', 'id_pedido=eq.<id>')`; entregador/mapa simulados (dados vêm do pedido, preenchidos pelo job da frente C); "Cancelar pedido" (só NOVO/ACEITO/PREPARANDO); "Falar com suporte" |
| 19 | Abas por status, paginação "Carregar mais", Detalhes, Pedir novamente, Avaliar (só ENTREGUE), Ver motivo |
| 20 | Nota + critérios + tags + comentário → `status_moderacao = PENDENTE` (CE-11) |
| 21 | Conquistas, plano, nutri vinculada, sino, preferências de notificação, "Fale conosco" |
| 22 | Dados pessoais/físicos (IMC), objetivo, restrições, endereços, trocar foto (Storage bucket `avatares`), **excluir conta** (anonimizar `usuario`, apagar endereços, `supabase.auth.admin.deleteUser` no backend com a service role — chave só no servidor) |
| 23 | Upgrade/downgrade/ciclo, pagamento **SIMULADO** (gera `fatura` PAGA e atualiza `usuario.id_tier` **na hora**), cancelar (mostra `encerra_em`), pausar. Ao assinar Pro/Premium sem nutri: vincula a nutri disponível e cria `triagem` AGUARDANDO (contrato com B) |
| 24 | Plano ativo da semana (dias, refeições, pratos reais, observações da nutri); "Pedir" com 1 clique adiciona o prato ao carrinho e vai ao checkout |
| 25 | **NutriBot REAL (CE-21)** — ver abaixo |

### NutriBot (CE-8 / CE-21) — regras
- Antes de escrever o código, **carregue a skill `claude-api`** (SDK Java). O SDK `com.anthropic:anthropic-java:3.3.0` já está no `pom.xml`; chave e modelo em `cleaneats.nutribot.api-key` / `cleaneats.nutribot.modelo` — padrão **`claude-sonnet-5-5`** (decisão do usuário: mais rápido no chat ao vivo), trocável pela variável `ANTHROPIC_MODEL` sem recompilar. Nunca deixe o id do modelo fixo no código. No Sonnet 5.5 `thinking: disabled` dá erro 400: use esforço `OutputConfig.Effort.LOW` para o chat (ou `between_tools`, ver a skill). Use streaming para mostrar a resposta chegando e trate `stop_reason = refusal` (a skill recomenda `fallbacks: "default"` com o beta `server-side-fallback-2026-07-01`; confira o builder Java nela).
- `ChatbotService` monta o contexto **a cada pergunta**, lendo do banco: perfil e metas (`perfil_cliente`), plano ativo do dia (`plano_alimentar`/`refeicao_plano` com os pratos), `consumo_diario` de hoje, pedidos de hoje, restrições. Guarde o snapshot em `mensagem_chatbot.contexto`.
- Prompt de sistema: **não prescreve, não monta dieta, não substitui a nutricionista**; ajustes oficiais → "Falar com a nutri". Respostas curtas, em pt-BR, citando números reais (kcal restantes, proteína que falta).
- Limite por tier: Free bloqueado (convite para assinar), Basic 5/dia, Pro/Premium ilimitado (`TierAssinatura.podePerguntarAoNutriBot`).
- Chips da tela 25 enviam as perguntas prontas. Aviso legal sempre visível (`ChatbotPanel` já tem).
- Teste obrigatório: mesma pergunta antes e depois de um pedido → resposta diferente (roteiro 6.4–6.6). Se a API falhar, mostre erro claro ("NutriBot indisponível, tente de novo") — nunca uma resposta inventada.

## Dependências
- Da **principal**: login/cadastro (02–05), central de notificações, `/ficha/:id`. Enquanto não existirem, use `/dev/conexao` para logar.
- Da **C**: pratos aprovados de todos os restaurantes (seed C) e job da entrega simulada. Até lá, use os 7 pratos do núcleo.
- Da **B**: plano semanal do Breno (seed B). Até lá, a tela 24 mostra o EmptyState "Sua nutricionista ainda não montou o plano".

## Testes
- JUnit: preço/macros do monte sua marmita, prévia do pedido (desconto tier + cupom + taxa), soma do consumo, limite do NutriBot, cancelamento de pedido.
- Vitest: filtros do marketplace, carrinho, cálculo da tela 15.
- Playwright: Atos 2, 4 e 6 do roteiro (cliente).
