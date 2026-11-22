# Roteiro da demonstração — 25/11/2026

> **Regra:** tudo o que está aqui **não pode falhar**. Cada passo vira um teste E2E (Playwright) até a noite de 24/11, e o roteiro é ensaiado inteiro ao menos 2 vezes antes da apresentação.
> História: **cadastro → pedido → restaurante → nutri monta o plano → cliente segue o plano → NutriBot.**
> Cobertura: 44 telas + telas novas. Tempo estimado: 25–30 min.

## Preparação (30 min antes)
1. `npm run banco:resetar` (banco limpo e seed recarregado). Conferir `/dev/conexao` → 4 passos verdes.
2. Abrir **4 janelas** (perfis separados do navegador, para não misturar sessões):
   - **Cliente** — `cliente@cleaneats.test` (Breno, Pro)
   - **Restaurante** — `restaurante@cleaneats.test` (Sabor Natural)
   - **Nutri** — `nutri@cleaneats.test` (Dra. Ana Souza)
   - **Admin** — `admin@cleaneats.test`
   Senha de todos: `CleanEats@2026`. Uma 5ª janela anônima para o cadastro novo.
3. Celular com câmera à mão (QR Code) e a caixa de e-mail da equipe aberta (código de recuperação e prescrição).
4. **Abrir a URL da API (`https://<api>.onrender.com/api/saude`) 2 minutos antes de apresentar.** O Render gratuito hiberna após 15 min sem uso e leva ~1 min para acordar. Não deixar a demo parada mais de 15 min entre os atos.
5. **Plano B:** se a nuvem falhar, `npm run demo` no notebook (mesmo Supabase). Se a internet cair, apresentar o vídeo gravado do ensaio.

---

## Ato 1 — Chegada e cadastro (janela anônima) · CE-1, CE-2, CE-15, CE-18, CE-3
| # | Tela | Ação | Resultado esperado | CE |
|---|---|---|---|---|
| 1.1 | **01** Landing `/` | Rolar a página; clicar "Planos" | Landing completa, rodapé TRICODE/UNIFACOL | — |
| 1.2 | **09** Planos `/planos` | Alternar Mensal/Anual; abrir 2 perguntas do FAQ | Preços 29,90/59,90/89,90 ↔ 23,90/47,90/71,90; tabela comparativa | 15 |
| 1.3 | **Termos / Privacidade** | Abrir pelos links do rodapé | Páginas legais (LGPD) | 2 |
| 1.4 | **03** Cadastro `/cadastro` | Criar a conta "Marina Lima" com senha fraca → ver o medidor → senha forte, aceitar termos | Força da senha; não avança sem o aceite | 2 |
| 1.5 | **04** Perfil | Escolher "Cliente" | — | 2 |
| 1.6 | **05** Cliente | Objetivo Emagrecimento, restrição "Sem glúten", 64 kg / 1,65 m | IMC calculado na hora; meta de kcal sugerida | 2, 6 |
| 1.7 | **09** Planos | Escolher **Pro mensal** → pagamento PIX (simulado) | Aprovado na hora; vai para `/app` já como Pro | 15 |
| 1.8 | **10** Home da Marina | Mostrar o selo Pro e o aviso "aguardando triagem da nutri" | Dados reais da conta nova | 15 |
| 1.9 | **02** Login | Sair; tentar senha errada → erro; "Entrar com Google" (conta Google da equipe); clicar Facebook | Erro claro; Google entra (cai em `/cadastro/perfil` se for conta nova); Facebook mostra "em breve" | 1 |
| 1.10 | **08** Recuperar senha | Pedir o código **para o e-mail do dono da conta Resend** (conta criada com esse e-mail no ensaio) → digitar o código de 6 dígitos → nova senha | Contagem regressiva de reenvio; senha trocada; login com a nova | 1 |
| 1.11 | **07** Cadastro restaurante | Nova conta "Bowl & Cia" (CNPJ, endereço, cozinha, horários) | Fica PENDENTE; painel mostra "aguardando aprovação" | 3 |
| 1.12 | **06** Cadastro nutricionista | Nova conta "Dr. Paulo Reis" (CRN, especialidades, agenda) | Fica PENDENTE | 18 |
| 1.13 | **Admin** `/admin` | Aprovar o CNPJ da Bowl & Cia; **rejeitar** o CRN do Dr. Paulo com motivo | Status muda; o profissional vê o motivo ao entrar | 3, 18 |

## Ato 2 — O pedido do Breno (janela Cliente) · CE-4, CE-5, CE-6, CE-9, CE-10, CE-14
| # | Tela | Ação | Resultado esperado | CE |
|---|---|---|---|---|
| 2.1 | **10** Home | Mostrar macros do dia (anel), plano de hoje e recomendados | Valores do banco (meta 2.200 kcal / 140 g P) | 6 |
| 2.2 | **11** Marketplace | Filtrar "Alta Proteína", proteína ≥ 35 g, ordenar por preço | Resultados atualizam sozinhos; todo card com kcal/P/C/G; nada com lactose aparece (restrição do Breno) | 4, 6, 10 |
| 2.3 | **12** Detalhe "Frango Grelhado Fitness" | Ver ficha, ingredientes, avaliações publicadas; **escanear o QR Code com o celular** | Abre `/ficha/:id` no celular, com a ficha técnica pública | 4 |
| 2.4 | **Ficha** `/ficha/:id` | (no celular) | Ficha nutricional + selo de aprovação | — |
| 2.5 | **13** Restaurantes | Filtro "Fitness"; abrir "Mapa" | Só restaurantes com prato aprovado (a Bowl & Cia **não** aparece ainda: não tem prato) | 5 |
| 2.6 | **14** Sabor Natural | Ver cardápio com macros; favoritar um prato | Favorito salvo | 4 |
| 2.7 | **15** Monte sua marmita | Objetivo Ganho de Massa; frango + batata doce **Grande** + brócolis + abacate | kcal, macros e preço recalculam a cada clique; barra de meta por refeição | 6 |
| 2.8 | **16** Carrinho | Marmita montada + 1 "Frango Grelhado" (qtd 2); cupom; endereço Casa; PIX | Desconto Pro 5% aplicado; **confirmação** antes de registrar | 9 |
| 2.9 | **17** Pedido confirmado | — | Código CE-49xx, resumo e macros somados ao dia | 9 |
| 2.10 | **18** Acompanhamento | **Deixar esta janela visível** | Timeline em "Pedido recebido" | 14 |

## Ato 3 — O restaurante (janela Restaurante) · CE-14, CE-3, CE-17
| # | Tela | Ação | Resultado esperado | CE |
|---|---|---|---|---|
| 3.1 | **36** Dashboard | — | O pedido do Breno chegou **em tempo real** (sem recarregar); total do dia | 14 |
| 3.2 | **37** Pedidos | Aceitar → Preparando → Pronto | A cada clique, a **tela 18 do Breno muda ao vivo**; depois de "Pronto" o entregador (simulado) assume, vai para "A caminho" e "Entregue" sozinho | 14 |
| 3.3 | **38** Cardápio | Pausar um prato | Some do marketplace | 3 |
| 3.4 | **39** Novo prato | Salvar "Wrap de Atum" **sem** a ficha → erro; preencher ficha + foto → Enviar para análise | Validação bloqueia; prato vai para EM_ANÁLISE | 3 |
| 3.5 | **40** Aprovação | Ver o prato em "Pendente" e um rejeitado com motivo | Lista por status | 3 |
| 3.6 | **Admin** `/admin` | Aprovar o "Wrap de Atum"; aprovar o primeiro prato da Bowl & Cia | Wrap aparece no marketplace; Bowl & Cia passa a aparecer na tela 13 | 3, 5 |
| 3.7 | **Admin** `/admin/restaurantes` | Mudar a comissão do Sabor Natural para 10% | Pedidos novos usam 10% | 17 |
| 3.8 | **41** Analytics | Período "30 dias" | Gráficos com os pedidos reais | — |
| 3.9 | **42** Financeiro | Filtrar o mês; **Exportar** | Bruto, comissão e líquido batem com os pedidos; CSV baixado | 17 |
| 3.10 | **43** Relatórios | Gerar relatório de vendas | PDF baixado | 17 |
| 3.11 | **44** Perfil | Alterar horário de sábado | Salvo | 3 |

## Ato 4 — Depois do pedido (janela Cliente) · CE-7, CE-11, CE-13, CE-15, CE-16
| # | Tela | Ação | Resultado esperado | CE |
|---|---|---|---|---|
| 4.1 | **Sino** (central de notificações) | Abrir o sino | Notificações de status do pedido; marcar como lidas | 13 |
| 4.2 | **19** Histórico | Abas Entregues/Cancelados; "Pedir novamente" | Itens voltam ao carrinho | 7 |
| 4.3 | **20** Avaliar | Nota 5, critérios, tags, comentário | "Enviada para moderação" | 11 |
| 4.4 | **Admin** `/admin/avaliacoes` | Aprovar a avaliação | Aparece na tela 12 | 11 |
| 4.5 | **23** Assinatura | **Upgrade para Premium** (anual) | Fatura PAGA gerada; perfil vira Premium **na hora**; desconto passa a 15% | 15, 16 |

## Ato 5 — A nutricionista monta o plano (janela Nutri) · CE-19, CE-20
| # | Tela | Ação | Resultado esperado | CE |
|---|---|---|---|---|
| 5.1 | **26** Dashboard | — | Clientes ativos, triagens pendentes, mensagens | — |
| 5.2 | **27** Triagens | A Marina (Ato 1) está "Aguardando" → iniciar triagem, definir metas (kcal, P/C/G, fibras, água) | Marina vira cliente ativa | 19 |
| 5.3 | **28** Meus clientes | Buscar "Breno" | — | — |
| 5.4 | **Acompanhamento** `/nutri/acompanhamento` | Ordenar por adesão | Clientes com menor adesão primeiro | — |
| 5.5 | **29** Perfil do Breno | Registrar medição (78,4 kg) | Gráfico de evolução atualiza | — |
| 5.6 | **31** Catálogo | Filtrar "Alta Proteína" | **Só pratos aprovados** (o "Wrap de Atum" do Ato 3 já aparece) | 19 |
| 5.7 | **30** Editor de plano | Montar a semana do Breno: em cada refeição, um prato real + observação ("sem molho") → Salvar | Plano salvo; Breno é notificado | 19 |
| 5.8 | **32** Prescrição | Emitir a prescrição do Breno (Premium) | **PDF baixado** com nome, plano, metas, CRN e assinatura; **e-mail recebido** | 20 |
| 5.9 | **Prescrições** `/nutri/prescricoes` | — | Histórico com a prescrição nova | 20 |
| 5.10 | **33** Mensagens | Mandar "Breno, montei seu plano!" | Chega na hora para o cliente | — |
| 5.11 | **34** Financeiro | — | Repasse de 60% das mensalidades Pro/Premium dos clientes da Ana | — |
| 5.12 | **35** Perfil profissional | Editar a bio | Salvo | 18 |

## Ato 6 — O cliente segue o plano e usa o NutriBot (janela Cliente) · CE-19, CE-12, CE-21, CE-8, CE-16
| # | Tela | Ação | Resultado esperado | CE |
|---|---|---|---|---|
| 6.1 | **24** Meu plano | Ver a semana montada no Ato 5; "Pedir" o jantar com 1 clique | Pratos reais do plano; pedido criado | 19 |
| 6.2 | **21** Perfil | Conquistas, plano Premium, nutricionista vinculada | — | 12 |
| 6.3 | **22** Editar perfil | Mudar peso e restrição | IMC recalcula; marketplace respeita a nova restrição | 12, 6 |
| 6.4 | **25** NutriBot | Perguntar **"Posso comer uma pizza hoje?"** | Resposta cita o plano de hoje, o consumo e as metas; aviso "não substitui sua nutricionista" sempre visível | 21, 8 |
| 6.5 | **16 → 17** | Pedir mais um prato do marketplace | — | 9 |
| 6.6 | **25** NutriBot | Repetir **a mesma pergunta** | **A resposta muda**, refletindo o novo consumo | 21 |
| 6.7 | **25** NutriBot | "Monta uma dieta pra mim?" | Recusa e encaminha para a nutri | 21 |
| 6.8 | **23** Assinatura | Cancelar | Mostra a **data de encerramento**; benefícios mantidos até lá | 16 |
| 6.9 | **Admin** `/admin/restaurantes` | "Simular renovação" com a data após o encerramento | Breno volta para o Free; histórico de pedidos e plano continuam lá | 16 |
| 6.10 | **404** | Abrir uma URL inexistente | Página 404 | — |

---

## Checklist de cobertura
01 ✔ 02 ✔ 03 ✔ 04 ✔ 05 ✔ 06 ✔ 07 ✔ 08 ✔ 09 ✔ 10 ✔ 11 ✔ 12 ✔ 13 ✔ 14 ✔ 15 ✔ 16 ✔ 17 ✔ 18 ✔ 19 ✔ 20 ✔ 21 ✔ 22 ✔ 23 ✔ 24 ✔ 25 ✔ 26 ✔ 27 ✔ 28 ✔ 29 ✔ 30 ✔ 31 ✔ 32 ✔ 33 ✔ 34 ✔ 35 ✔ 36 ✔ 37 ✔ 38 ✔ 39 ✔ 40 ✔ 41 ✔ 42 ✔ 43 ✔ 44 ✔
Novas: `/ficha/:id` ✔ `/admin` ✔ `/admin/avaliacoes` ✔ `/admin/restaurantes` ✔ `/nutri/prescricoes` ✔ `/nutri/acompanhamento` ✔ notificações ✔ termos/privacidade ✔ 404 ✔ · CE-1 a CE-21 ✔

## Pontos de atenção (testar no ensaio)
- **Código de recuperação (1.10):** e-mails de Auth saem pelo SMTP do Supabase, **não** pelo modo demo do backend (`EMAIL_REDIRECIONAR_PARA` só cobre os e-mails do backend). Com o Resend como SMTP do Supabase e **sem domínio verificado**, só chegam ao e-mail do dono da conta Resend — por isso a tela 08 é demonstrada com uma conta cadastrada nesse e-mail. Se verificarmos um domínio, qualquer e-mail funciona.
- **Google (1.9):** configurar o provedor Google no Supabase e as URLs de redirecionamento (localhost + Vercel).
- **Realtime (3.1, 3.2):** testar com as duas janelas em máquinas diferentes, na rede do local da apresentação.
- **NutriBot (6.4/6.6):** chave da API no Render; respostas costumam levar 3–8 s (mostrar o "digitando…").
- **E-mail da prescrição (5.8):** com Resend sem domínio próprio, só entrega para o e-mail dono da conta Resend; usar esse e-mail como o do Breno na demo.
