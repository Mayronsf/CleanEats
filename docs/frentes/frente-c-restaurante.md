# Frente C — Restaurante (telas 07, 36–44) + Admin + entrega simulada

Leia antes: `CLAUDE.md`, `docs/frentes/README.md`, `docs/matriz-funcionalidades.md` (suas linhas), `docs/roteiro-demo.md` (Atos 1.11, 1.13, 3, 4.4, 6.9), `DESIGN.md`.
Worktree `../cleaneats-frente-c` · branch `frente-c-restaurante` · backend na porta **8083** · migrations `2026112330xxxx–2026112339xxxx`.
Acento **coral** com neutros quentes (`.tema-restaurante`, já aplicado). Admin usa o mesmo design system dos painéis (sem tela no Figma — aqui pode usar `/impeccable shape`/`craft`, só no admin).

## Você é dona de
- **Front:** `frontend/src/app/rotas/rotasRestaurante.tsx` (inclui `menuRestaurante`, `menuAdmin`, `/cadastro/restaurante`), `frontend/src/features/restaurante/**`, `frontend/src/features/admin/**`, `frontend/src/services/{restaurante,admin}.ts`.
- **Back:** `controller.restaurante`, `controller.admin`, `service.restaurante`, `service.admin`, `dto.*` — rotas `/api/painel-restaurante/**` (perfil RESTAURANTE), `/api/admin/**` (perfil ADMIN), `POST /api/cadastro/restaurante`.
- **Tabelas (entidades novas, arquivos seus):** `horario_funcionamento`, `ingrediente_marmita`, `marmita_compatibilidade`. Escreve nas compartilhadas `restaurante`, `marmita`, `pedido` (status), `repasse`, `assinatura` (renovação simulada), `nutricionista` (aprovação) e `avaliacao.status_moderacao`.
- **Seed:** `supabase/seeds/frente-c.sql` — cardápio completo dos 6 restaurantes (tela 14 e 38; **inclua pratos para Açaí Club e Rota Proteica**, senão eles somem pela CE-5), ingredientes e compatibilidades, pratos EM_ANALISE e REJEITADO com motivo (tela 40), horários, pedidos de hoje do Sabor Natural em vários status (telas 36/37), histórico de 6 meses para analytics/financeiro (41/42), repasses; trocar "Sabor & Saúde"/São Paulo/2025 por **Sabor Natural/Recife/2026**. Fila do admin: 1 restaurante e 1 nutricionista PENDENTES, avaliações PENDENTES.

## Etapa 1 — navegável com dados reais (até 23/11 12h)
36 Dashboard → 37 Pedidos → 38 Cardápio → 39 Criar/editar prato → 40 Aprovação → `/admin` → `/admin/avaliacoes` → `/admin/restaurantes` → `/admin/suporte` → 41 Analytics → 42 Financeiro → 43 Relatórios → 44 Perfil → 07 Cadastro.
Os botões das telas 33–44 são `div` no HTML: **complete a lista de botões das suas telas na matriz** nesta etapa.

## Etapa 2 — ações (até 24/11 18h)
| Tela | Ações REAIS obrigatórias |
|---|---|
| 07 | Cadastro com validação (CNPJ com dígito verificador, endereço, cozinhas, horários) → `PENDENTE`; painel mostra status/motivo |
| 36 | Pedidos do dia + total acumulado; **novos pedidos chegam em tempo real** (`useRealtime('pedido', 'id_restaurante=eq.<id>', …, 'INSERT')`) |
| 37 | Abas por status; Aceitar / Recusar (motivo) / Preparando / Pronto / Confirmar retirada → `Pedido.mudarStatus` (transições validadas) + `NotificacaoService` para o cliente (CE-14) |
| Job | **Entrega SIMULADA** (`@Scheduled`, `@EnableScheduling` já ligado): pedido `PRONTO` há ≥ 20 s → define `entregador_nome`, `previsao_entrega_em`, vai para `A_CAMINHO`; ≥ 40 s depois → `ENTREGUE` (+ notificações). Tempos configuráveis (`cleaneats.entrega.segundos-*`) |
| 38 | Lista com status, pausar/reativar, editar, busca/filtros |
| 39 | Criar/editar prato com ficha nutricional (validação Bean Validation + `Marmita.enviarParaAnalise`), ingredientes, compatibilidades, objetivos, foto (Storage bucket `pratos`, público) |
| 40 | Abas Pendente/Aprovado/Rejeitado com motivo; reenviar rejeitado |
| `/admin` | Fila única: CRN (nutricionistas), CNPJ (restaurantes), pratos (ficha) — aprovar/rejeitar com motivo (`avaliar(...)` das entidades) + notificação ao dono |
| `/admin/avaliacoes` | Moderar (publicar/rejeitar); ao publicar, recalcula `nota_media`/`total_avaliacoes` do prato e do restaurante |
| `/admin/restaurantes` | Comissão por restaurante (padrão 8%); **"Simular renovação" (CE-16)**: data simulada → renova assinaturas ATIVAS vencidas (nova `fatura` PAGA) e expira CANCELADAS com `encerra_em` passada (`usuario.id_tier = FREE`, histórico mantido) |
| `/admin/suporte` | Lista de `contato_suporte`, marcar respondido |
| 41 | Gráficos por período (pedidos, receita, pratos mais vendidos, avaliações) — dados agregados no backend |
| 42 | Bruto, comissão (do próprio pedido), líquido; filtro por período; **exportar CSV** (CE-17) |
| 43 | Relatórios em PDF/CSV (vendas, pratos, avaliações) gerados no backend |
| 44 | Perfil, logo/capa (Storage), horários, dados bancários (só chave PIX) |

## Dependências
- Da **A**: pedidos (`POST /api/pedidos`) e avaliações. Até lá, use o seed da C.
- OpenPDF (relatórios) e as chaves `cleaneats.entrega.*` (tempos do job) já estão no `pom.xml`/`application.yml`.

## Testes
- JUnit: transições de status (já existe base), job de entrega, comissão congelada no pedido, CNPJ, renovação/expiração simulada, moderação recalcula nota.
- Playwright: Ato 3, 1.11/1.13, 4.4 e 6.9 do roteiro.
