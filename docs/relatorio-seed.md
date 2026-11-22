# Seed central — conteúdo, IDs e conflitos entre telas

Arquivo: `supabase/seed.sql` (sessão principal). Validado em Postgres embarcado: 36 pratos, 25 usuários, 50 pedidos, 84 itens, 264 linhas de histórico.
Senha de todos os usuários: `CleanEats@2026`. Datas dos pedidos são **relativas** ao momento em que o seed roda (o "hoje" das telas vira o dia da demo).

## Mapa de UUIDs (use nos seeds das frentes)
| Faixa | Entidade |
|---|---|
| `00000000-0000-4000-8000-0000000000NN` | usuários: 01 Breno · 02 Dra. Ana · 03 Sabor Natural · 04 Admin · 11–15 donos (VV, MT, FF, AC, RP) · **21–28 clientes da tela 28** · **31–35 assinantes da tela 34** (Maria Braga, Carlos Jota, Lucia Silva, Roberto Oliveira, Juliana Ferraz) · **36–38 clientes avulsos da tela 37** (Ana Torres, Pedro Mendes, Fernanda Lima) |
| `00000000-0000-4000-9000-000000000001` | nutricionista Dra. Ana Souza |
| `00000000-0000-4000-a000-00000000000N` | restaurantes: 1 Sabor Natural · 2 Verde Vida · 3 Mar & Terra · 4 FitFood · 5 Açaí Club · 6 Rota Proteica |
| `00000000-0000-4000-b000-0000000000NN` | pratos 01–36 (lista abaixo) |
| `00000000-0000-4000-c000-00000000000N` | endereços do Breno: 1 Casa · 2 Trabalho |

Clientes 21–28: 21 Mariana Costa (Premium) · 22 Pedro Silva (Pro) · 23 Juliana Sá (Premium) · 24 Lucas Andrade (Pro) · 25 Rafael Mendes (Pro) · 26 Thales Cunha (Pro) · 27 Fernanda Barros (Basic) · 28 Gabriela Nunes (Pro).

## Pratos (36)
| # | Restaurante | Prato | Origem |
|---|---|---|---|
| 01–07 | SN, VV, MT, SN, VV, FF, FF | Frango Grelhado Fitness, Bowl Vegano Power, Salmão com Quinoa, Steak com Batata Doce, Açaí Proteico, Wrap Integral Light, Tapioca com Ovo e Banana | telas 10/11/12 (+ gordura da 31) |
| 08–14 | Sabor Natural | Salmão com Quinoa, Wrap Integral de Frango, Bowl Mediterrâneo, Tilápia com Legumes, Carne Magra com Purê, Omelete Proteico, Marmita Bulking 800g | tela 14 |
| 15–21 | Sabor Natural | Bowl Proteico Frango, Marmita Fit Salmão, Marmita Low Carb, Bowl Vegano, Sopa Detox Premium (REJEITADO), Wrap Integral Frango (EM_ANALISE), Açaí Fit Proteico | telas 38/40 |
| 22–26 | Sabor Natural | Suco Verde Detox, Água de Coco, Suco Natural, Marmita Fit Frango, Bowl Proteico Carne | tela 37 |
| 27–28 | Sabor Natural | Açaí Proteico, Tapioca com Ovo e Banana | telas 16/18 (pedido CE-4823) |
| 29 | Mar & Terra | Tilápia Grelhada com Legumes | tela 31 |
| 30 | Verde Vida | Salada Caesar com Frango | tela 31 |
| 31–32 | FitFood | Wrap Integral de Frango, Omelete de Claras com Espinafre | tela 31 |
| 33–34 | Açaí Club | Açaí Proteico, Açaí 500ml com Whey e Granola | telas 31/19 |
| 35–36 | Rota Proteica | Carne Magra com Arroz Integral, Marmita Bulking 800g | telas 31/19 |

Valores estimados estão marcados no SQL com `-- macro a confirmar` (e `-- preço a confirmar` quando a tela não mostra preço).

## Pedidos
- **Tela 19 (Breno):** 42 pedidos = 38 entregues, 3 cancelados, 1 em andamento. Os 8 da tela têm itens e totais da tela (CE-4823, 4756, 4701, 4612, 4554, 4488, 4321, 4256); os outros 34 são gerados de forma determinística entre fev/2026 e hoje.
- **CE-4823** (telas 16/18/19): Sabor Natural, "a caminho" com o entregador Carlos Eduardo, previsão de chegada 8 min depois do seed, total R$ 75,87 (taxa R$ 6,00 e desconto de R$ 9,73, que soma o cupom NUTRI15 e os 5% do Pro).
- **Tela 37 (Sabor Natural, hoje):** CE-1042 a CE-1035 (o "#1042" da tela vira "CE-1042"), nos status da tela. Os dois PRONTO estão há mais de 10 min: o job de entrega simulada não mexe neles, eles esperam o "Confirmar retirada".

## Conflitos entre telas e decisão tomada
Regra: kcal, P, C e preço das telas do cliente (10/11/12/14) > catálogo da nutri (31) > painel do restaurante (37/38/40). Gordura: valor explícito da tela 12 ou 31.

| Conflito | Decisão |
|---|---|
| Steak: 520 kcal (11) × 560 kcal (31); 38 g C (11) × 28 g C (14) | 520 kcal / 38 g C; gordura 22 g da 31 (fecha o balanço) |
| Salmão: gordura derivada 22 g × 18 g (31) | 18 g |
| Açaí Proteico: gordura 6 g (31); o balanço daria ~9 g | 6 g (valor da tela) |
| Bowl Vegano Power (11) = "Bowl Vegano com Grão-de-bico" (31) | um prato só, nome da tela 11 |
| Açaí Proteico em Verde Vida (11) e Açaí Club (31); Salmão em Mar & Terra (11) e Sabor Natural (14); Marmita Bulking em Sabor Natural (14) e Rota Proteica (19/31) | um prato em cada restaurante (cada tela fica fiel) |
| Bowl Mediterrâneo: R$ 26,90 · 440 kcal (14) × R$ 34,90 · 380 kcal · "Vegetariano" (38/40), mas leva frango | tela 14 |
| Marmita Fit Salmão "Em análise" (40), mas pedida (37) e ativa (38) | APROVADO |
| Marmita Fit Salmão R$ 38,90 (38/40) × R$ 32,90 (pedido #1041 da 37) | cardápio R$ 38,90; o item do pedido guarda R$ 32,90 (preço da época) |
| Sopa Detox "Inativo" (38) × Sopa Detox Premium "Rejeitado" (40) | um prato, REJEITADO com o motivo da tela 40 |
| Frango no carrinho/editor a R$ 26,90 (16/30) | porção média + ovo no pedido; cardápio fica R$ 24,90 |
| Totais da tela 19 (CE-4823: 119 g de proteína) × soma dos itens (99 g) | o app soma os itens |
| Breno é sem lactose, mas o plano e o CE-4823 têm Açaí Proteico com whey | whey descrito como isolado zero lactose → compatível |
| Duas fotos das telas não existem mais no Unsplash (404): Carne Magra e Wrap Integral Frango | foto do prato mais parecido (Steak e Wrap Light) |

## Em aberto — decisão do time
- **Fernanda Barros (tela 28) é Basic**, mas o Basic não inclui nutricionista dedicada (tela 09). Mantida como Basic e vinculada à Dra. Ana, para a tela ficar fiel. Opções: (a) manter; (b) mudar para Pro no seed.
