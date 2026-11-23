# API REST — proposta por módulo

Base: `/api` · JSON · JWT do Supabase no header `Authorization: Bearer …`.
Rotas em kebab-case (documentação 4.1). Paginação no servidor: `?pagina=0&tamanho=12` → `{ itens, pagina, totalPaginas, totalItens }`.
Erros: `{ status, codigo, mensagem, momento }`. ✅ = implementado na Fase 0.

## Público / autenticação
| Método | Rota | Perfil | Descrição | CE |
|---|---|---|---|---|
| GET | `/api/saude` ✅ | público | Health check | — |
| GET | `/api/auth/me` ✅ | autenticado | Conta + perfil (redireciona à home do perfil) | 1 |
| POST | `/api/cadastro/cliente` | autenticado sem perfil | Etapa 3: objetivo, restrições, dados físicos, metas | 2 |
| POST | `/api/cadastro/nutricionista` | autenticado sem perfil | CRN, especialidades, agenda → `PENDENTE` | 2, 18 |
| POST | `/api/cadastro/restaurante` | autenticado sem perfil | CNPJ, endereço, cozinha, horários → `PENDENTE` | 2, 3 |
| GET | `/api/tiers` | público | Tiers e benefícios (tela 09) | 15 |

Login, cadastro de conta (etapa 1) e recuperação de senha (código de 6 dígitos, 15 min) usam o **Supabase Auth** direto do front.

## Marketplace (cliente)
| Método | Rota | Descrição | CE |
|---|---|---|---|
| GET | `/api/marmitas` | Filtros: `categoria, proteinaMin, caloriasMax, precoMin, precoMax, idRestaurante, notaMin, busca, objetivo, ordenar` — aplica objetivo e restrições do perfil automaticamente | 4, 6, 10 |
| GET | `/api/marmitas/{id}` | Detalhe + ingredientes + avaliações publicadas | 4 |
| GET | `/api/fichas-tecnicas/{id}` | Ficha técnica pública (QR Code) | — |
| GET | `/api/restaurantes` | Só aprovados com ≥1 prato aprovado | 5 |
| GET | `/api/restaurantes/{id}` | Perfil + cardápio | 5 |
| GET | `/api/componentes-marmita` | Componentes do "monte sua marmita" | 6 |
| POST | `/api/componentes-marmita/calculo` | Recalcula kcal/macros/preço e meta por refeição | 6 |
| GET/POST/DELETE | `/api/favoritos` | Favoritos | — |

## Pedidos
| Método | Rota | Descrição | CE |
|---|---|---|---|
| POST | `/api/pedidos/previa` | Calcula subtotal, desconto do tier, cupom, taxa (sem gravar) | 9 |
| POST | `/api/pedidos` | Confirma e registra (`NOVO`); atualiza `consumo_diario` | 9 |
| GET | `/api/historico-pedidos` | Histórico paginado com macros | 7 |
| GET | `/api/pedidos/{id}` | Detalhe + timeline (Realtime atualiza) | 14 |
| POST | `/api/pedidos/{id}/pedir-novamente` | Recria o carrinho | 7 |
| POST | `/api/pedidos/{id}/avaliacoes` | Só se `ENTREGUE`; entra em moderação | 11 |

## Cliente
| Método | Rota | Descrição | CE |
|---|---|---|---|
| GET/PUT | `/api/perfil` | Dados pessoais, físicos (IMC), objetivo, restrições | 12 |
| GET/POST/PUT/DELETE | `/api/enderecos` | Endereços | 12 |
| DELETE | `/api/perfil` | Exclusão de conta (anonimização LGPD) | — |
| GET | `/api/consumo-diario?data=` | Macros do dia vs metas | 9 |
| GET | `/api/plano-alimentar` | Plano ativo com pratos prontos para pedir | 19 |
| GET/PATCH | `/api/notificacoes` | Lista / marcar como lida | 13 |
| GET | `/api/assinatura` | Plano atual, renovação, faturas | 15, 16 |
| POST | `/api/assinatura` | Assinar / upgrade / downgrade (pagamento simulado) | 15, 16 |
| POST | `/api/assinatura/cancelamento` | Cancela e devolve a data de encerramento | 16 |
| POST | `/api/assinatura/reativacao` | Desfaz o cancelamento antes do fim do período | 16 |
| POST | `/api/assinatura/pausa` · `/api/assinatura/retomada` | Pausa 30 dias (adia a cobrança) / retoma devolvendo os dias não usados | 16 |
| PATCH | `/api/assinatura/forma-pagamento` | PIX ou CARTAO (simulado) | 15 |
| GET/POST | `/api/nutribot/mensagens` | Conversa com contexto (plano, consumo, metas); limite por tier | 8, 21 |
| GET/POST | `/api/conversas/{id}/mensagens` | Chat com a nutri | — |

## Nutricionista (`/api/nutri/**`, perfil NUTRICIONISTA)
| Método | Rota | Descrição | CE |
|---|---|---|---|
| GET | `/api/nutri/painel` | KPIs do dashboard | — |
| GET | `/api/nutri/triagens` · POST `/{id}/inicio` · PUT `/{id}` | Fila de triagem e metas | — |
| GET | `/api/nutri/clientes` · `/{id}` | Clientes (filtro `ordenar=adesao`) | — |
| GET | `/api/nutri/catalogo` | Só pratos `APROVADO` | 19 |
| GET/PUT | `/api/nutri/clientes/{id}/plano-alimentar` | Editor semanal (valida prato aprovado) | 19 |
| POST | `/api/nutri/prescricoes` · GET `/api/nutri/prescricoes` | Emite PDF (OpenPDF), envia e-mail, histórico | 20 |
| GET | `/api/nutri/financeiro?inicio=&fim=` | Bruto (assinaturas) × repasse 60% | — |
| GET/PUT | `/api/nutri/perfil` | Perfil profissional e agenda | 18 |

## Restaurante (`/api/painel-restaurante/**`, perfil RESTAURANTE)
| Método | Rota | Descrição | CE |
|---|---|---|---|
| GET | `/api/painel-restaurante/resumo` | Pedidos do dia, total acumulado | 14 |
| GET | `/api/painel-restaurante/pedidos?status=&data=` | Lista paginada | 14 |
| PATCH | `/api/painel-restaurante/pedidos/{id}/status` | Transição validada; Realtime avisa o cliente | 14 |
| GET/POST/PUT | `/api/painel-restaurante/marmitas` | Cardápio; criar/editar (ficha obrigatória) | 3 |
| POST | `/api/painel-restaurante/marmitas/{id}/envio-analise` | `RASCUNHO → EM_ANALISE` | 3 |
| POST | `/api/painel-restaurante/uploads` | URL assinada do Storage (foto/logo) | 3 |
| GET | `/api/painel-restaurante/analytics?periodo=` | Gráficos | — |
| GET | `/api/painel-restaurante/financeiro?inicio=&fim=` · `/exportacao.csv` | Bruto, comissão, líquido; exportar | 17 |
| GET | `/api/painel-restaurante/relatorios/{tipo}.pdf` | Relatórios | 17 |
| GET/PUT | `/api/painel-restaurante/perfil` | Dados e horários | 3 |

## Admin (`/api/admin/**`, perfil ADMIN)
| Método | Rota | Descrição | CE |
|---|---|---|---|
| GET | `/api/admin/aprovacoes?tipo=NUTRICIONISTA\|RESTAURANTE\|MARMITA` | Fila de curadoria | 3, 18 |
| POST | `/api/admin/aprovacoes/{tipo}/{id}` | `{ decisao: APROVADO\|REJEITADO, motivo }` | 3, 18 |
| GET | `/api/admin/avaliacoes?status=PENDENTE` · POST `/{id}/moderacao` | Moderação de avaliações | 11 |
| GET | `/api/admin/restaurantes` · PATCH `/{id}/comissao` | Comissão por restaurante (padrão 8%) | 17 |
