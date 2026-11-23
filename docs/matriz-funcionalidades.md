# Matriz de funcionalidades

**Regra:** tudo é **REAL** (salva no banco e funciona ponta a ponta). **SIMULADA** só nas integrações externas listadas abaixo. **Nenhum botão fica sem ação.**
Frentes: **P** = sessão principal · **A** = cliente · **B** = nutricionista · **C** = restaurante + admin.
Cada frente marca ☑ na coluna "Feito" quando a ação funcionar de ponta a ponta, no próprio branch.

## O que é SIMULADO (e só isto)
| Integração | Como funciona na demo | Frente |
|---|---|---|
| Cobrança de cartão/PIX (pedido e assinatura) | Aprova na hora; assinatura gera `fatura` PAGA | A |
| Renovação da assinatura (CE-16) | Botão "Simular renovação" no `/admin/restaurantes` avança o ciclo, gera fatura e expira canceladas vencidas | C |
| Entregador e rastreio (tela 18) | Job agendado: depois de `PRONTO`, atribui entregador fictício, passa para `A_CAMINHO` e depois `ENTREGUE` sozinho | C (backend) · A (tela) |
| Login com Facebook | Toast "Login com Facebook em breve" | P |
| Login com Apple | **Removido** (decisão de 22/11) — o botão sai da tela 02/03 | P |
| Mapa (telas 13 e 18) | Imagem/placeholder estático | A |

Integrações **REAIS**: Supabase Auth (e-mail/senha + **Google**), Realtime, Storage; NutriBot (API da Anthropic, CE-21); e-mail da prescrição (Resend ou SMTP) + PDF (OpenPDF).

## Histórias CE-1 a CE-21
| CE | História | Nível | Como demonstrar (critério de aceite) | Telas | Frente |
|---|---|---|---|---|---|
| 1 | Login | REAL | E-mail/senha inválidos → erro; válidos → home do perfil. Google real; Facebook "em breve" | 02 | P |
| 2 | Cadastro | REAL | 3 etapas (conta → perfil → detalhes), força de senha, aceite de termos/LGPD, 1 perfil por conta | 03, 04, 05, 06, 07 | P, B (06), C (07) |
| 3 | Cadastro de restaurante e prato | REAL | Campos obrigatórios validados; prato sem ficha nutricional não publica; prato aparece no cardápio | 07, 38, 39, 40 | C |
| 4 | Visualizar marmitas | REAL | Filtros de tipo de refeição e proteína; todo card com kcal/P/C/G; abre cardápio do restaurante | 11, 12, 14 | A |
| 5 | Listagem de restaurantes | REAL | Só restaurantes aprovados com ≥1 prato aprovado | 13 | A |
| 6 | Personalizar por objetivo | REAL | Objetivo filtra/prioriza pratos; restrições escondem incompatíveis; monte sua marmita recalcula | 05, 11, 15, 22 | A |
| 7 | Histórico de pedidos | REAL | Data, itens, macros; pedir novamente | 19 | A |
| 8 | Chatbot de suporte | REAL | Dúvidas sobre alimentação e sobre o sistema | 25 | A |
| 9 | Realizar pedido | REAL | Confirmação antes de registrar; vai ao histórico e soma no consumo do dia | 12, 16, 17 | A |
| 10 | Filtrar por categoria | REAL | Vegetariana / low carb / alta proteína atualizam sozinhos | 11 | A |
| 11 | Avaliar marmita | REAL | Só após ENTREGUE; nota + critérios + comentário + tags; moderação no admin antes de publicar | 20, /admin/avaliacoes, 12 | A, C |
| 12 | Editar perfil | REAL | Nome, telefone, dados físicos (IMC), objetivo, restrições, endereços; excluir conta (LGPD) | 21, 22 | A |
| 13 | Notificações | REAL | Novo cardápio, status do pedido, recomendação da nutri — no sino da navbar e da sidebar | central de notificações | P |
| 14 | Painel do restaurante | REAL | Pedidos do dia + total; mudar status → cliente vê em tempo real | 36, 37 → 18 | C, A |
| 15 | Tiers de assinatura | REAL (pagamento simulado) | Escolhe Pro, confirma, perfil reflete na hora | 09, 23, 21 | P (09), A (23) |
| 16 | Recorrência e cancelamento | REAL (renovação simulada) | Cancelar mostra data de encerramento; depois volta ao Free sem perder histórico; upgrade/downgrade | 23, /admin/restaurantes | A, C |
| 17 | Financeiro do restaurante | REAL | Bruto, comissão, líquido; filtro por período; exportar CSV; comissão configurável no admin | 42, 43, /admin/restaurantes | C |
| 18 | Cadastro de nutricionista | REAL | CRN, especialidades, disponibilidade; aprovação manual no admin; aparece para clientes conforme tier | 06, 35, /admin | B, C |
| 19 | Editor de plano alimentar | REAL | Prato real aprovado por refeição + observação; cliente vê o plano e pede com 1 clique | 30, 31 → 24 | B, A |
| 20 | Prescrição digital | REAL | PDF com cliente, plano, metas, CRN e assinatura; download + e-mail; histórico | 32, /nutri/prescricoes | B |
| 21 | NutriBot 24/7 | REAL | "Posso comer pizza?" responde com plano, consumo e metas; após um pedido a resposta muda | 25 | A |

## Telas novas
| Rota | O que faz | Nível | Frente |
|---|---|---|---|
| `/ficha/:id` | Ficha técnica pública do prato (QR Code real da tela 12) | REAL | P |
| `/admin` | Aprovação de CRN, CNPJ e pratos (com motivo de rejeição) | REAL | C |
| `/admin/avaliacoes` | Moderação de avaliações (CE-11) | REAL | C |
| `/admin/suporte` | Fila do "Fale conosco" | REAL | C |
| `/admin/restaurantes` | Comissão por restaurante + "Simular renovação" (CE-16) | REAL / SIMULADA | C |
| `/nutri/prescricoes` | Histórico de prescrições emitidas | REAL | B |
| `/nutri/acompanhamento` | Clientes ordenados por adesão (componentes da tela 28) | REAL | B |
| Central de notificações | Painel do sino (navbar do cliente e sidebar dos painéis), marcar como lida, Realtime | REAL | P |
| `/termos`, `/privacidade` | Termos de uso e política de privacidade (LGPD) | REAL | P |
| `*` (404) | Página não encontrada | REAL | P |
| `/auth/callback` | Retorno do login com Google | REAL | P |

## Botões por tela
Gerado a partir das telas HTML. A extração automática não pega os botões feitos com `div` (principalmente telas 33–44): **cada frente completa a lista da sua tela na 1ª passada.**

### 01 · 01-splash — `/` — frente P

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Home | REAL | Navega para `/` | ☑ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☑ |
| Planos | REAL | Navega para `/planos` | ☑ |
| Nutricionistas | REAL | Navega para `/` | ☑ |
| Blog | REAL | Sem blog no escopo: âncora para a seção de conteúdo da landing (ou remover) | ☑ |
| Criar conta grátis | REAL | Navega para `/cadastro` | ☑ |
| Entrar | REAL | Navega para `/login` | ☑ |
| Começar agora | REAL | Navega para `/cadastro` | ☑ |
| Ver marketplace | REAL | Navega para `/app/marketplace` | ☑ |
| Ver todos | REAL | Navega para `/app/marketplace` | ☑ |
| Explorar cardápio | REAL | Navega para `/app/marketplace` | ☑ |
| Sou nutricionista | REAL | Navega para `/nutri` | ☑ |
| Sou restaurante | REAL | Navega para `/restaurante` | ☑ |
| f (rede social) | REAL | Link externo para o perfil da TRICODE — sem URL oficial, o ícone é removido | ☑ |
| in (rede social) | REAL | Link externo para o perfil da TRICODE — sem URL oficial, o ícone é removido | ☑ |
| ig (rede social) | REAL | Link externo para o perfil da TRICODE — sem URL oficial, o ícone é removido | ☑ |
| tw (rede social) | REAL | Link externo para o perfil da TRICODE — sem URL oficial, o ícone é removido | ☑ |
| + | REAL | Atualiza carrinho (estado local persistido) e recalcula prévia | ☑ |

### 02 · 02-login — `/login` — frente P

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| G Entrar com Google | REAL | supabase.auth.signInWithOAuth({provider:"google"}) → /auth/callback → home do perfil | ☑ |
| f Facebook | SIMULADA | Toast "Login com Facebook em breve" | ☑ |
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Voltar ao início | REAL | Navega para `/` | ☑ |
| Esqueci a senha | REAL | Navega para `/recuperar-senha` | ☑ |
| Entrar | REAL | Navega para `/app` | ☑ |
| Criar conta grátis | REAL | Navega para `/cadastro` | ☑ |

### 03 · 03-cadastro-etapa1 — `/cadastro` — frente P

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| G Google | REAL | supabase.auth.signInWithOAuth({provider:"google"}) → /auth/callback → home do perfil | ☑ |
| f Facebook | SIMULADA | Toast "Login com Facebook em breve" | ☑ |
| Apple | REMOVIDO | Botão retirado da tela (decisão do usuário 22/11) | ☐ |
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Voltar ao início | REAL | Navega para `/` | ☑ |
| termos de uso | REAL | Navega para `/termos` (tela nova) | ☑ |
| política de privacidade | REAL | Navega para `/privacidade` (tela nova) | ☑ |
| Continuar | REAL | Navega para `/cadastro/perfil` | ☑ |
| Fazer login | REAL | Navega para `/login` | ☑ |

### 04 · 04-cadastro-perfil — `/cadastro/perfil` — frente P

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| Selecionado | REAL | Escolhe o perfil (guardado no rascunho do cadastro) | ☑ |
| Escolher este perfil | REAL | Escolhe o perfil (guardado no rascunho do cadastro) | ☑ |
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Voltar | REAL | Navega para `/cadastro` | ☑ |
| Continuar como Cliente | REAL | Navega para `/cadastro/cliente` | ☑ |
| Falar com suporte | REAL | Abre "Fale conosco": POST /api/contatos-suporte (admin vê em /admin) | ☑ |

### 05 · 05-cadastro-cliente — `/cadastro/cliente` — frente P

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| Sem glúten | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Sem lactose | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Vegetariano | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Vegano | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Low carb | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Alérgico a oleaginosas | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Sem frutos do mar | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Sem carne suína | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Voltar | REAL | Navega para `/cadastro/perfil` | ☑ |
| Ver planos disponíveis | REAL | Navega para `/planos` | ☑ |

### 06 · 06-cadastro-nutricionista — `/cadastro/nutricionista` — frente B

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| + Nutrição Clínica | REAL | Marca especialidade | ☑ |
| + Nutrição Funcional | REAL | Marca especialidade | ☑ |
| + Reeducação Alimentar | REAL | Marca especialidade | ☑ |
| + Nutrição Materno-Infantil | REAL | Marca especialidade | ☑ |
| + Nutrição Vegana | REAL | Marca especialidade | ☑ |
| + Transtornos Alimentares | REAL | Marca especialidade | ☑ |
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Voltar | REAL | Navega para `/cadastro/perfil` | ☑ |
| Enviar para aprovação | REAL | POST /api/cadastro/nutricionista → `/nutri` | ☑ |

### 07 · 07-cadastro-restaurante — `/cadastro/restaurante` — frente C

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Voltar | REAL | Navega para `/cadastro/perfil` | ☑ |
| Enviar logo | REAL | POST /api/cadastro/restaurante/logo (Storage `restaurantes`) | ☑ |
| Tipos de cozinha / Horários | REAL | Seleciona cozinhas e horários por dia da semana | ☑ |
| Enviar para aprovação | REAL | POST /api/cadastro/restaurante → `/restaurante` (`PENDENTE`) | ☑ |

### 08 · 08-recuperar-senha — `/recuperar-senha` — frente P

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Voltar ao login | REAL | Navega para `/login` | ☑ |
| Enviar código | REAL | Link: #state2 | ☑ |
| Já lembrei, voltar ao login | REAL | Navega para `/login` | ☑ |
| Criar conta grátis | REAL | Navega para `/cadastro` | ☑ |
| Trocar email | REAL | Navega para `/recuperar-senha` | ☑ |
| Verificar código | REAL | Link: #state3 | ☑ |
| Trocar de email | REAL | Navega para `/recuperar-senha` | ☑ |
| Voltar | REAL | Link: #state2 | ☑ |
| Salvar nova senha | REAL | Navega para `/login` | ☑ |

### 09 · 09-selecao-plano — `/planos` — frente P

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| Mensal | REAL | Alterna ciclo e recalcula preços (GET /api/tiers) | ☑ |
| Anual -20% | REAL | Alterna ciclo e recalcula preços (GET /api/tiers) | ☑ |
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Já tenho conta | REAL | Navega para `/login` | ☑ |
| Pular por agora | REAL | Navega para `/app` | ☑ |
| Continuar grátis | REAL | Navega para `/app` | ☑ |
| Assinar Basic | REAL | Navega para `/app` | ☑ |
| Começar com Pro | REAL | Navega para `/app` | ☑ |
| Quero ser Premium | REAL | Navega para `/app` | ☑ |

### 10 · 10-cliente-home — `/app` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☐ |
| + | REAL | Atualiza carrinho (estado local persistido) e recalcula prévia | ☐ |
| C Clean Eats | REAL | Navega para `/` | ☐ |
| Home | REAL | Navega para `/app` | ☐ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☐ |
| Meu plano | REAL | Navega para `/app/meu-plano` | ☐ |
| Pedidos | REAL | Navega para `/app/pedidos` | ☐ |
| NutriBot | REAL | Navega para `/app/nutribot` | ☐ |
| Meu perfil | REAL | Navega para `/app/perfil` | ☐ |
| Carrinho | REAL | Navega para `/app/carrinho` | ☐ |
| Explorar marketplace | REAL | Navega para `/app/marketplace` | ☐ |
| Marketplace 120 restaurantes | REAL | Navega para `/app/marketplace` | ☐ |
| Meu plano 3 refeições hoje | REAL | Navega para `/app/meu-plano` | ☐ |
| NutriBot Tire dúvidas agora | REAL | Navega para `/app/nutribot` | ☐ |
| Histórico 42 pedidos feitos | REAL | Navega para `/app/pedidos` | ☐ |
| Pedir agora | REAL | Navega para `/app/carrinho` | ☐ |
| Ver todos | REAL | Navega para `/app/marketplace` | ☐ |
| Buscar | REAL | Navega para `/app/marketplace` | ☐ |
| Perfil | REAL | Navega para `/app/perfil` | ☐ |

### 11 · 11-cliente-marketplace — `/app/marketplace` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| Buscar | REAL | Busca no servidor | ☐ |
| Todos | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Alta Proteína | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Vegano | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Sem Glúten | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Low Carb | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Sem Lactose | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Pescetariano | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| ⇅ Ordenar: Mais relevantes | REAL | Ordenação/visualização (parâmetro na consulta) | ☐ |
| ⊞ Grade | REAL | Ordenação/visualização (parâmetro na consulta) | ☐ |
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☐ |
| 1 | REAL | Paginação / navegação de período | ☐ |
| 2 | REAL | Paginação / navegação de período | ☐ |
| 3 | REAL | Paginação / navegação de período | ☐ |
| ... | REAL | Paginação / navegação de período | ☐ |
| 12 | REAL | Paginação / navegação de período | ☐ |
| Frango Grelhado Fitness | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Pedir + | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Bowl Vegano Power | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Salmão com Quinoa | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Steak com Batata Doce | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Açaí Proteico | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Wrap Integral Light | REAL | Navega para `/app/marmitas/:id` | ☐ |

### 12 · 12-cliente-detalhe-marmita — `/app/marmitas/:id` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☐ |
| − | REAL | Atualiza carrinho (estado local persistido) e recalcula prévia | ☐ |
| + | REAL | Atualiza carrinho (estado local persistido) e recalcula prévia | ☐ |
| C Clean Eats | REAL | Navega para `/` | ☐ |
| Home | REAL | Navega para `/app` | ☐ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☐ |
| Meu plano | REAL | Navega para `/app/meu-plano` | ☐ |
| Pedidos | REAL | Navega para `/app/pedidos` | ☐ |
| NutriBot | REAL | Navega para `/app/nutribot` | ☐ |
| Meu perfil | REAL | Navega para `/app/perfil` | ☐ |
| Carrinho | REAL | Navega para `/app/carrinho` | ☐ |
| Alta Proteína | REAL | Navega para `/app/marketplace` | ☐ |
| Adicionar ao pedido | REAL | Navega para `/app/carrinho` | ☐ |
| Ver mais | REAL | Navega para `/app/marketplace` | ☐ |
| Sabor Natural Steak com Batata Doce R$ 28 ,90 + | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Mar & Terra Salmão com Quinoa R$ 32 ,90 + | REAL | Navega para `/app/marmitas/:id` | ☐ |
| FitFood Wrap Integral Light R$ 19 ,90 + | REAL | Navega para `/app/marmitas/:id` | ☐ |
| FitFood Tapioca com Ovo R$ 16 ,90 + | REAL | Navega para `/app/marmitas/:id` | ☐ |
| R$ 24 | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☐ |

### 13 · 13-cliente-restaurantes — `/app/restaurantes` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☐ |
| Todos 120 | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Fitness 38 | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Vegano 22 | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Vegetariano 31 | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Low Carb 18 | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Sem Glúten 14 | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Pescetariano 9 | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Anterior | REAL | Paginação / navegação de período | ☐ |
| 1 | REAL | Paginação / navegação de período | ☐ |
| 2 | REAL | Paginação / navegação de período | ☐ |
| 3 | REAL | Paginação / navegação de período | ☐ |
| 4 | REAL | Paginação / navegação de período | ☐ |
| 15 | REAL | Paginação / navegação de período | ☐ |
| Próxima | REAL | Paginação / navegação de período | ☐ |
| C Clean Eats | REAL | Navega para `/` | ☐ |
| Home | REAL | Navega para `/app` | ☐ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☐ |
| Restaurantes | REAL | Navega para `/app/restaurantes` | ☐ |
| Meu plano | REAL | Navega para `/app/meu-plano` | ☐ |
| Pedidos | REAL | Navega para `/app/pedidos` | ☐ |
| NutriBot | REAL | Navega para `/app/nutribot` | ☐ |
| Meu perfil | REAL | Navega para `/app/perfil` | ☐ |
| Destaque Fitness Aberto SN Sabor Natural 4.9 1.2km 25-35min R$ 6 en… | REAL | Navega para `/app/restaurantes/:id` | ☐ |
| Vegano Aberto VV Verde Vida 4.8 2.4km 30-45min R$ 8 entrega Vegano … | REAL | Navega para `/app/restaurantes/:id` | ☐ |
| Pescetariano Sem Glúten Aberto MT Mar & Terra 4.7 3.1km 35-50min R$… | REAL | Navega para `/app/restaurantes/:id` | ☐ |
| Destaque Aberto FF FitFood 4.9 0.8km 20-30min Grátis Fitness Low Ca… | REAL | Navega para `/app/restaurantes/:id` | ☐ |
| Bowls Aberto AC Açaí Club 4.6 1.8km 25-40min R$ 7 entrega Bowls Veg… | REAL | Navega para `/app/restaurantes/:id` | ☐ |
| Sem Glúten Fechado · abre 18:00 RP Rota Proteica 4.8 2.0km 30-45min… | REAL | Navega para `/app/restaurantes/:id` | ☐ |
| Abrir visão em mapa | REAL | Abre mapa estático com os restaurantes (placeholder decidido) | ☐ |
| Buscar | REAL | Navega para `/app/marketplace` | ☐ |
| Perfil | REAL | Navega para `/app/perfil` | ☐ |
| Ver cardápio | REAL | Abre /app/restaurantes/:id | ☐ |

### 14 · 14-cliente-perfil-restaurante — `/app/restaurantes/:id` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☐ |
| + | REAL | Atualiza carrinho (estado local persistido) e recalcula prévia | ☐ |
| C Clean Eats | REAL | Navega para `/` | ☐ |
| Home | REAL | Navega para `/app` | ☐ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☐ |
| Restaurantes | REAL | Navega para `/app/restaurantes` | ☐ |
| Meu plano | REAL | Navega para `/app/meu-plano` | ☐ |
| Pedidos | REAL | Navega para `/app/pedidos` | ☐ |
| NutriBot | REAL | Navega para `/app/nutribot` | ☐ |
| Meu perfil | REAL | Navega para `/app/perfil` | ☐ |
| Voltar | REAL | Navega para `/app/restaurantes` | ☐ |
| Top vendido Frango Grelhado Fitness Filé grelhado, batata doce, bró… | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Premium Steak com Batata Doce Filé mignon ao ponto, batata doce car… | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Sem glúten Salmão com Quinoa Salmão grelhado ao limão, quinoa real,… | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Light Wrap Integral de Frango Wrap integral recheado com frango des… | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Bowl Mediterrâneo Quinoa, frango desfiado, tomate cereja, pepino, a… | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Tilápia com Legumes Filé de tilápia grelhada com mix de legumes sal… | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Carne Magra com Purê Patinho grelhado em iscas com purê de mandioqu… | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Alta proteína Omelete Proteico Omelete de 4 claras + 1 ovo inteiro,… | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Bulking Marmita Bulking 800g Porção grande: 200g de frango, 150g de… | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Buscar | REAL | Navega para `/app/marketplace` | ☐ |
| Perfil | REAL | Navega para `/app/perfil` | ☐ |

### 15 · 15-cliente-personalizacao — `/app/monte-sua-marmita` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Emagrecimento ~450 kcal/refeição | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| Ganho de Massa ~650 kcal/refeição | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| Equilíbrio ~550 kcal/refeição | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| Frango Grelhado 150g · 35g prot | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Filé Mignon 150g · 38g prot | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Salmão Grelhado 150g · 32g prot | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Carne Magra 150g · 36g prot | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Tilápia 150g · 30g prot | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Tofu Grelhado 120g · 18g prot | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Arroz Integral 100g · 28g carb | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Batata Doce 120g · 32g carb | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Quinoa 100g · 24g carb | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Mandioquinha 120g · 30g carb | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Pequena 60g · -20g carb | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Média 120g · padrão | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Grande 180g · +24g carb | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Brócolis no vapor 80g · 35 kcal | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Salada de folhas 60g · 20 kcal | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Cenoura ralada 50g · 22 kcal | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Abobrinha 70g · 18 kcal | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Abacate (50g) +R$ 3,50 · 80 kcal | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Ovo cozido +R$ 2,00 · 70 kcal | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Queijo cottage +R$ 4,00 · 60 kcal | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Chia / sementes +R$ 2,50 · 40 kcal | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Home | REAL | Navega para `/app` | ☑ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☑ |
| Meu plano | REAL | Navega para `/app/meu-plano` | ☑ |
| Pedidos | REAL | Navega para `/app/pedidos` | ☑ |
| NutriBot | REAL | Navega para `/app/nutribot` | ☑ |
| Meu perfil | REAL | Navega para `/app/perfil` | ☑ |
| Buscar | REAL | Navega para `/app/marketplace` | ☑ |
| Perfil | REAL | Navega para `/app/perfil` | ☑ |
| Emagrecimento | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| ~450 kcal/refeição | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| Ganho de Massa | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| ~650 kcal/refeição | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| Equilíbrio | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| ~550 kcal/refeição | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |

### 16 · 16-cliente-carrinho — `/app/carrinho` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☐ |
| Limpar tudo | REAL | Atualiza carrinho (estado local persistido) e recalcula prévia | ☐ |
| − | REAL | Atualiza carrinho (estado local persistido) e recalcula prévia | ☐ |
| + | REAL | Atualiza carrinho (estado local persistido) e recalcula prévia | ☐ |
| Remover | REAL | Atualiza carrinho (estado local persistido) e recalcula prévia | ☐ |
| Casa Rua das Acácias, 245 · Apto 302 Boa Viagem, Recife · PE · 5102… | REAL | Seleciona/cadastra endereço (GET/POST /api/enderecos) | ☐ |
| Trabalho Av. Conselheiro Aguiar, 4250 · Sala 1408 Boa Viagem, Recif… | REAL | Seleciona/cadastra endereço (GET/POST /api/enderecos) | ☐ |
| + Adicionar novo endereço | REAL | Seleciona/cadastra endereço (GET/POST /api/enderecos) | ☐ |
| Entrega imediata Chega em 25-35min A partir das 14h25 de hoje | REAL | Define horário de entrega do pedido | ☐ |
| Agendar Escolha o horário Hoje 18:00 · Amanhã 12:30 · ... | REAL | Define horário de entrega do pedido | ☐ |
| PIX Pix Aprovação instantânea · sem taxas + Rápido | SIMULADA | Seleciona forma de pagamento; cobrança simulada aprova na hora | ☐ |
| VISA Visa •••• 4523 Crédito · até 3x sem juros Salvo | SIMULADA | Seleciona forma de pagamento; cobrança simulada aprova na hora | ☐ |
| MC Mastercard •••• 8902 Crédito · à vista Salvo | SIMULADA | Seleciona forma de pagamento; cobrança simulada aprova na hora | ☐ |
| Dinheiro na entrega Informe o valor para troco | SIMULADA | Seleciona forma de pagamento; cobrança simulada aprova na hora | ☐ |
| Aplicar | REAL | POST /api/pedidos/previa com cupom | ☐ |
| C Clean Eats | REAL | Navega para `/` | ☐ |
| Home | REAL | Navega para `/app` | ☐ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☐ |
| Meu plano | REAL | Navega para `/app/meu-plano` | ☐ |
| Pedidos | REAL | Navega para `/app/pedidos` | ☐ |
| NutriBot | REAL | Navega para `/app/nutribot` | ☐ |
| Meu perfil | REAL | Navega para `/app/perfil` | ☐ |
| Continuar comprando | REAL | Navega para `/app/marketplace` | ☐ |
| Buscar | REAL | Navega para `/app/marketplace` | ☐ |
| Perfil | REAL | Navega para `/app/perfil` | ☐ |

### 17 · 17-cliente-pedido-confirmado — `/app/pedidos/:id/confirmado` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| + | REAL | Atualiza carrinho (estado local persistido) e recalcula prévia | ☐ |
| Acompanhar entrega | REAL | Navega para `/app/pedidos/:id` | ☐ |
| Voltar para a Home | REAL | Navega para `/app` | ☐ |
| Ver detalhes | REAL | Navega para `/app/pedidos/:id` | ☐ |
| Ver plano completo | REAL | Navega para `/app/meu-plano` | ☐ |
| Ver tudo | REAL | Navega para `/app/marketplace` | ☐ |
| Sabor Natural Steak com Batata Doce R$ 28 ,90 + | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Mar & Terra Salmão com Quinoa R$ 32 ,90 + | REAL | Navega para `/app/marmitas/:id` | ☐ |
| FitFood Wrap Integral R$ 19 ,90 + | REAL | Navega para `/app/marmitas/:id` | ☐ |
| Verde Vida Bowl Vegano R$ 22 ,90 + | REAL | Navega para `/app/marmitas/:id` | ☐ |

### 18 · 18-cliente-acompanhamento — `/app/pedidos/:id` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☐ |
| C Clean Eats | REAL | Navega para `/` | ☐ |
| Home | REAL | Navega para `/app` | ☐ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☐ |
| Meu plano | REAL | Navega para `/app/meu-plano` | ☐ |
| Pedidos | REAL | Navega para `/app/pedidos` | ☐ |
| NutriBot | REAL | Navega para `/app/nutribot` | ☐ |
| Meu perfil | REAL | Navega para `/app/perfil` | ☐ |
| (ícone) | REAL | Navega para `/app/pedidos` | ☐ |
| Falar com suporte | REAL | Abre "Fale conosco": POST /api/contatos-suporte (admin vê em /admin) | ☐ |
| Cancelar pedido | REAL | PATCH /api/pedidos/{id}/cancelamento (só NOVO/ACEITO/PREPARANDO) | ☐ |
| Buscar | REAL | Navega para `/app/marketplace` | ☐ |
| Perfil | REAL | Navega para `/app/perfil` | ☐ |

### 19 · 19-cliente-historico — `/app/pedidos` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☐ |
| Todos 42 | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☐ |
| Em andamento 1 | REAL | Aba/filtro por status (consulta no servidor) | ☐ |
| Entregues 38 | REAL | Aba/filtro por status (consulta no servidor) | ☐ |
| Cancelados 3 | REAL | Aba/filtro por status (consulta no servidor) | ☐ |
| Detalhes | REAL | Abre detalhe/acompanhamento do pedido | ☐ |
| Pedir novamente | REAL | POST /api/pedidos/{id}/pedir-novamente → carrinho | ☐ |
| Avaliar | REAL | Abre /app/pedidos/:id/avaliar (só se ENTREGUE) | ☐ |
| Pedir de novo | REAL | POST /api/pedidos/{id}/pedir-novamente → carrinho | ☐ |
| Ver motivo | REAL | Mostra motivo de recusa/cancelamento do pedido | ☐ |
| Carregar mais pedidos | REAL | Próxima página (paginação no servidor) | ☐ |
| C Clean Eats | REAL | Navega para `/` | ☐ |
| Home | REAL | Navega para `/app` | ☐ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☐ |
| Meu plano | REAL | Navega para `/app/meu-plano` | ☐ |
| Pedidos | REAL | Navega para `/app/pedidos` | ☐ |
| NutriBot | REAL | Navega para `/app/nutribot` | ☐ |
| Meu perfil | REAL | Navega para `/app/perfil` | ☐ |
| Exportar histórico | REAL | Download CSV/PDF gerado no backend | ☐ |
| 14 Mai 14:25 Em andamento #CE-4823 Sabor Natural Frango Fitness + A… | REAL | Navega para `/app/pedidos/:id` | ☐ |
| 10 Mai 12:15 Entregue #CE-4756 Verde Vida Bowl Vegano + Açaí 730 kc… | REAL | POST /api/pedidos/{id}/pedir-novamente → carrinho | ☐ |
| 06 Mai 19:42 Entregue #CE-4701 Mar & Terra Salmão com Quinoa 480 kc… | REAL | POST /api/pedidos/{id}/pedir-novamente → carrinho | ☐ |
| 28 Abr 13:08 Entregue #CE-4612 FitFood +1 Wrap, Tapioca, Frango... … | REAL | POST /api/pedidos/{id}/pedir-novamente → carrinho | ☐ |
| 22 Abr 12:50 Entregue #CE-4554 Sabor Natural Steak + Açaí 870 kcal … | REAL | POST /api/pedidos/{id}/pedir-novamente → carrinho | ☐ |
| 15 Abr 20:14 Cancelado #CE-4488 Rota Proteica Marmita Bulking 800g … | REAL | Mostra motivo de recusa/cancelamento do pedido | ☐ |
| 29 Mar 12:38 Entregue #CE-4321 Açaí Club Açaí 500ml + Whey + Granol… | REAL | POST /api/pedidos/{id}/pedir-novamente → carrinho | ☐ |
| 22 Mar 19:50 Entregue #CE-4256 Sabor Natural Carne Magra + Tapioca … | REAL | POST /api/pedidos/{id}/pedir-novamente → carrinho | ☐ |
| Buscar | REAL | Navega para `/app/marketplace` | ☐ |
| Perfil | REAL | Navega para `/app/perfil` | ☐ |

### 20 · 20-cliente-avaliar — `/app/pedidos/:id/avaliar` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Bem temperado | REAL | Tag da avaliação | ☑ |
| Ingredientes frescos | REAL | Tag da avaliação | ☑ |
| Macros corretos | REAL | Tag da avaliação | ☑ |
| Boa apresentação | REAL | Tag da avaliação | ☑ |
| Embalagem boa | REAL | Tag da avaliação | ☑ |
| Entrega rápida | REAL | Tag da avaliação | ☑ |
| Vale o preço | REAL | Tag da avaliação | ☑ |
| Repetiria | REAL | Tag da avaliação | ☑ |
| Recomendaria | REAL | Tag da avaliação | ☑ |
| (ícone) | REAL | Navega para `/app/pedidos` | ☑ |
| Pular por agora | REAL | Navega para `/app/pedidos` | ☑ |
| Publicar avaliação | REAL | Navega para `/app/pedidos` | ☑ |

### 21 · 21-cliente-perfil — `/app/perfil` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Home | REAL | Navega para `/app` | ☑ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☑ |
| Meu plano | REAL | Navega para `/app/meu-plano` | ☑ |
| Pedidos | REAL | Navega para `/app/pedidos` | ☑ |
| NutriBot | REAL | Navega para `/app/nutribot` | ☑ |
| Meu perfil | REAL | Navega para `/app/perfil` | ☑ |
| Alterar capa | REAL | Navega para `/app/perfil/editar` | ☑ |
| Editar perfil | REAL | Navega para `/app/perfil/editar` | ☑ |
| Configurações | REAL | Navega para `/app/perfil/editar` | ☑ |
| Ver histórico | REAL | Navega para `/app/pedidos` | ☑ |
| Ver todas (12) | REAL | Abre a central de notificações | ☑ |
| Gerenciar | REAL | Navega para `/app/assinatura` | ☑ |
| Fazer upgrade | REAL | Navega para `/planos` | ☑ |
| Conversar com a nutri | REAL | Navega para `/app/nutribot` | ☑ |
| Dados pessoais Nome, contato, foto › | REAL | Navega para `/app/perfil/editar` | ☑ |
| Endereços salvos 2 endereços cadastrados › | REAL | Seleciona/cadastra endereço (GET/POST /api/enderecos) | ☑ |
| Métodos de pagamento 3 cartões salvos › | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Notificações Push, email e SMS › | REAL | Preferências de notificação: PUT /api/perfil/preferencias-notificacao | ☑ |
| Segurança e privacidade Senha, 2FA, dados › | REAL | Seleciona dia do plano | ☑ |
| Ajuda e suporte FAQ, contato, status › | REAL | Abre "Fale conosco" (POST /api/contatos-suporte) | ☑ |
| ↪ Sair da conta Você precisará logar de novo › | REAL | Navega para `/login` | ☑ |
| Buscar | REAL | Navega para `/app/marketplace` | ☑ |
| Perfil | REAL | Navega para `/app/perfil` | ☑ |

### 22 · 22-cliente-editar-perfil — `/app/perfil/editar` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Trocar foto | REAL | Upload no Storage (avatar) + PUT /api/perfil | ☑ |
| Remover | REAL | Atualiza carrinho (estado local persistido) e recalcula prévia | ☑ |
| Emagrecimento ~1.800 kcal/dia | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| Ganho de Massa ~2.200 kcal/dia | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| Equilíbrio ~2.000 kcal/dia | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| Sem glúten | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Sem lactose | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Vegetariano | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Vegano | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Low carb | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Sem oleaginosas | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Sem frutos do mar | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Sem carne suína | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Excluir conta | REAL | DELETE /api/perfil (anonimiza dados, LGPD) + signOut | ☑ |
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Home | REAL | Navega para `/app` | ☑ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☑ |
| Meu plano | REAL | Navega para `/app/meu-plano` | ☑ |
| Pedidos | REAL | Navega para `/app/pedidos` | ☑ |
| NutriBot | REAL | Navega para `/app/nutribot` | ☑ |
| Meu perfil | REAL | Navega para `/app/perfil` | ☑ |
| (ícone) | REAL | Navega para `/app/perfil` | ☑ |
| Descartar | REAL | Navega para `/app/perfil` | ☑ |
| Salvar alterações | REAL | Navega para `/app/perfil` | ☑ |
| Buscar | REAL | Navega para `/app/marketplace` | ☑ |
| Perfil | REAL | Navega para `/app/perfil` | ☑ |
| Emagrecimento | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| ~1.800 kcal/dia | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| Ganho de Massa | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| ~2.200 kcal/dia | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| Equilíbrio | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |
| ~2.000 kcal/dia | REAL | Seleciona objetivo → filtra/prioriza pratos e meta de kcal | ☑ |

### 23 · 23-cliente-planos — `/app/assinatura` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Cancelar plano | REAL | POST /api/assinatura/cancelamento → mostra data de encerramento | ☑ |
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Home | REAL | Navega para `/app` | ☑ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☑ |
| Meu plano | REAL | Navega para `/app/meu-plano` | ☑ |
| Pedidos | REAL | Navega para `/app/pedidos` | ☑ |
| NutriBot | REAL | Navega para `/app/nutribot` | ☑ |
| Meu perfil | REAL | Navega para `/app/perfil` | ☑ |
| (ícone) | REAL | Navega para `/app/perfil` | ☑ |
| Fazer upgrade pro Premium | REAL | Navega para `/planos` | ☑ |
| Gerenciar assinatura | REAL | Navega para `/app/assinatura` | ☑ |
| Comparar planos | REAL | Navega para `/planos` | ☑ |
| Baixar todas | REAL | Download CSV/PDF gerado no backend | ☑ |
| 05 Jun 2026 Próxima cobrança · Plano Pro mensal ⏳ Em 22 dias R$ 47 ,90 | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| 05 Mai 2026 Plano Pro · Visa •••• 4523 Pago R$ 47 ,90 | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| 05 Abr 2026 Plano Pro · Visa •••• 4523 Pago R$ 47 ,90 | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| 05 Mar 2026 Plano Pro · Visa •••• 4523 Pago R$ 47 ,90 | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| 05 Fev 2026 Plano Basic · trial gratuito Grátis R$ 0 ,00 | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Trocar | REAL | Troca o item/prato da refeição (abre o seletor com pratos aprovados) | ☑ |
| Pausar plano | REAL | POST /api/assinatura/pausa (status PAUSADA até a data escolhida) | ☑ |
| Ver detalhes | REAL | Abre detalhe/acompanhamento do pedido | ☑ |
| Free R$ 0/mês Downgrade | REAL | Navega para `/planos` | ☑ |
| Basic R$ 23,90/mês Downgrade | REAL | Navega para `/planos` | ☑ |
| Pro Atual R$ 47,90/mês Atual | REAL | Componente do monte sua marmita: recalcula kcal/macros/preço | ☑ |
| Premium R$ 71,90/mês Upgrade | REAL | Navega para `/planos` | ☑ |
| Buscar | REAL | Navega para `/app/marketplace` | ☑ |
| Perfil | REAL | Navega para `/app/perfil` | ☑ |
| 5 dias restantes | REAL | Informativo do trial/ciclo (sem ação; vira texto, não botão) | ☑ |
| Downgrade | REAL | POST /api/assinatura (pagamento simulado gera fatura PAGA) | ☑ |
| Atual | REAL | Informativo do tier atual (desabilitado) | ☑ |
| Upgrade | REAL | POST /api/assinatura (pagamento simulado gera fatura PAGA) | ☑ |

### 24 · 24-cliente-plano-alimentar — `/app/meu-plano` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Hoje | REAL | Seleciona dia do plano | ☑ |
| Seg 12 Concluído | REAL | Seleciona dia do plano | ☑ |
| Ter 13 Concluído | REAL | Seleciona dia do plano | ☑ |
| Qua 14 Hoje | REAL | Seleciona dia do plano | ☑ |
| Qui 15 Planejado | REAL | Seleciona dia do plano | ☑ |
| Sex 16 Planejado | REAL | Seleciona dia do plano | ☑ |
| Sáb 17 Planejado | REAL | Seleciona dia do plano | ☑ |
| Dom 18 Livre | REAL | Seleciona dia do plano | ☑ |
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Home | REAL | Navega para `/app` | ☑ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☑ |
| Meu plano | REAL | Navega para `/app/meu-plano` | ☑ |
| Pedidos | REAL | Navega para `/app/pedidos` | ☑ |
| NutriBot | REAL | Navega para `/app/nutribot` | ☑ |
| Meu perfil | REAL | Navega para `/app/perfil` | ☑ |
| Conversar com a nutri | REAL | Navega para `/app/nutribot` | ☑ |
| Pedir agora | REAL | Navega para `/app/carrinho` | ☑ |
| Pedir | REAL | Navega para `/app/marmitas/:id` | ☑ |
| Buscar | REAL | Navega para `/app/marketplace` | ☑ |
| Perfil | REAL | Navega para `/app/perfil` | ☑ |
| Seg | REAL | Seleciona dia do plano | ☑ |
| 12 | REAL | Paginação / navegação de período | ☑ |
| Ter | REAL | Seleciona dia do plano | ☑ |
| 13 | REAL | Paginação / navegação de período | ☑ |
| Qua | REAL | Seleciona dia do plano | ☑ |
| 14 | REAL | Paginação / navegação de período | ☑ |
| Qui | REAL | Seleciona dia do plano | ☑ |
| 15 | REAL | Paginação / navegação de período | ☑ |
| Planejado | REAL | Seleciona dia do plano | ☑ |
| Sex | REAL | Seleciona dia do plano | ☑ |
| 16 | REAL | Paginação / navegação de período | ☑ |
| Sáb | REAL | Seleciona dia do plano | ☑ |
| 17 | REAL | Paginação / navegação de período | ☑ |
| Dom | REAL | Seleciona dia do plano | ☑ |
| 18 | REAL | Paginação / navegação de período | ☑ |
| Livre | REAL | Seleciona dia do plano | ☑ |

### 25 · 25-cliente-chatbot — `/app/nutribot` — frente A

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Ok, vou de pizza proteica | REAL | Envia a pergunta ao NutriBot (POST /api/nutribot/mensagens, contexto real) | ☑ |
| Prefiro manter o plano | REAL | Envia a pergunta ao NutriBot (POST /api/nutribot/mensagens, contexto real) | ☑ |
| E o pré-treino? | REAL | Envia a pergunta ao NutriBot (POST /api/nutribot/mensagens, contexto real) | ☑ |
| Falar com a nutri | REAL | Abre conversa com a nutricionista vinculada | ☑ |
| Posso comer X agora? | REAL | Envia a pergunta ao NutriBot (POST /api/nutribot/mensagens, contexto real) | ☑ |
| Como tão meus macros? | REAL | Envia a pergunta ao NutriBot (POST /api/nutribot/mensagens, contexto real) | ☑ |
| Tô com fome | REAL | Envia a pergunta ao NutriBot (POST /api/nutribot/mensagens, contexto real) | ☑ |
| Sugestões pré-treino | REAL | Envia a pergunta ao NutriBot (POST /api/nutribot/mensagens, contexto real) | ☑ |
| Lanche da madrugada | REAL | Envia a pergunta ao NutriBot (POST /api/nutribot/mensagens, contexto real) | ☑ |
| Bater proteína do dia | REAL | Envia a pergunta ao NutriBot (POST /api/nutribot/mensagens, contexto real) | ☑ |
| C Clean Eats | REAL | Navega para `/` | ☑ |
| Home | REAL | Navega para `/app` | ☑ |
| Marketplace | REAL | Navega para `/app/marketplace` | ☑ |
| Meu plano | REAL | Navega para `/app/meu-plano` | ☑ |
| Pedidos | REAL | Navega para `/app/pedidos` | ☑ |
| NutriBot | REAL | Navega para `/app/nutribot` | ☑ |
| Meu perfil | REAL | Navega para `/app/perfil` | ☑ |
| Dra. Ana Souza | REAL | Abre o perfil da nutricionista vinculada | ☑ |
| Pedir | REAL | Navega para `/app/carrinho` | ☑ |
| Buscar | REAL | Navega para `/app/marketplace` | ☑ |
| Perfil | REAL | Navega para `/app/perfil` | ☑ |

### 26 · 26-nutri-home (com menos infos) — `/nutri` — frente B

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Atender triagens | REAL | Navega para `/nutri/triagens` | ☑ |
| Ver semana | REAL | Navega para `/app/meu-plano` | ☑ |
| 08:00 Concluído Triagem Pedro Silva Ganho de massa · Plano Pro Plan… | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| 09:30 Concluído Follow-up Mariana Costa Adesão 95% · Plano Premium … | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| 11:00 Agora Triagem Breno Filho Ganho de massa · 23a · Pro Iniciar | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| 14:30 14:30 Revisão Lucas Andrade Pediu ajuste de macros Ver | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| 16:00 16:00 Triagem Camila Rocha Emagrecimento · Plano Pro Ver | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| 17:30 17:30 Follow-up Rafael Mendes Adesão 76% Ver | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| Ver todos | REAL | Navega para `/nutri/clientes` | ☑ |
| RM Rafael Mendes Adesão 42% | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| JS Juliana Sá Sem pedido há 3 dias | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| TC Thales Cunha Macros em 70% | REAL | Navega para `/nutri/clientes/:id` | ☑ |

### 27 · 27-nutri-triagens — `/nutri/triagens` — frente B

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Pendentes 3 | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Em andamento 2 | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Concluídas 18 | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| 1 | REAL | Paginação / navegação de período | ☑ |
| Iniciar triagem | REAL | Navega para `/nutri/clientes/:id` | ☑ |

### 28 · 28-nutri-clientes — `/nutri/clientes` — frente B

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Grade | REAL | Ordenação/visualização (parâmetro na consulta) | ☑ |
| Lista | REAL | Ordenação/visualização (parâmetro na consulta) | ☑ |
| 1 | REAL | Paginação / navegação de período | ☑ |
| 2 | REAL | Paginação / navegação de período | ☑ |
| 3 | REAL | Paginação / navegação de período | ☑ |
| BF Breno Filho Pro 23 anos · 78kg · 1,78m · Ganho de massa Adesão s… | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| MC Mariana Costa Premium 31 anos · 62kg · 1,68m · Equilíbrio Adesão… | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| PS Pedro Silva Pro 28 anos · 85kg · 1,80m · Ganho de massa Adesão s… | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| JS Juliana Sá Premium 34 anos · 70kg · 1,65m · Emagrecimento Adesão… | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| LA Lucas Andrade Pro 26 anos · 75kg · 1,76m · Ganho de massa Adesão… | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| RM Rafael Mendes Pro 30 anos · 88kg · 1,82m · Emagrecimento Adesão … | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| TC Thales Cunha Pro 27 anos · 72kg · 1,75m · Equilíbrio Adesão sema… | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| FB Fernanda Barros Basic 25 anos · 58kg · 1,62m · Emagrecimento Ade… | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| GN Gabriela Nunes Pro 32 anos · 65kg · 1,70m · Equilíbrio Adesão se… | REAL | Navega para `/nutri/clientes/:id` | ☑ |

### 29 · 29-nutri-cliente-perfil — `/nutri/clientes/:id` — frente B

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| (ícone) | REAL | Navega para `/nutri/clientes` | ☑ |
| Meus clientes | REAL | Navega para `/nutri/clientes` | ☑ |
| Editar plano | REAL | Navega para `/nutri/clientes/:id/plano` | ☑ |
| Enviar mensagem | REAL | Navega para `/nutri/mensagens` | ☑ |
| Visão geral | REAL | Aba do perfil do cliente (nutri) | ☑ |
| Plano alimentar | REAL | Navega para `/nutri/clientes/:id/plano` | ☑ |
| Pedidos | REAL | Aba de pedidos do cliente (nutri) | ☑ |
| Prescrições | REAL | Navega para `/nutri/prescricoes/nova` | ☑ |
| Mensagens | REAL | Navega para `/nutri/mensagens` | ☑ |
| Ver histórico | REAL | Abre histórico (medições/pedidos) do cliente | ☑ |
| Ver todos | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Registrar nova medição | REAL | POST /api/nutri/clientes/{id}/medicoes (peso, % gordura, cintura) | ☑ |

### 30 · 30-nutri-editor-plano — `/nutri/clientes/:id/plano` — frente B

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Adicionar refeição extra | REAL | Adiciona refeição ao plano (PUT plano-alimentar) | ☑ |
| (ícone) | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| Clientes | REAL | Navega para `/nutri/clientes` | ☑ |
| Breno Filho | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| Descartar | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| Salvar e enviar | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| Seg 12 4/4 | REAL | Seleciona dia do plano | ☑ |
| Ter 13 4/4 | REAL | Seleciona dia do plano | ☑ |
| Qua 14 4/4 | REAL | Seleciona dia do plano | ☑ |
| Qui 15 2/4 | REAL | Seleciona dia do plano | ☑ |
| Sex 16 0/4 | REAL | Seleciona dia do plano | ☑ |
| Sáb 17 0/4 | REAL | Seleciona dia do plano | ☑ |
| Dom 18 livre | REAL | Seleciona dia do plano | ☑ |
| Seg | REAL | Seleciona dia do plano | ☑ |
| 12 | REAL | Paginação / navegação de período | ☑ |
| Ter | REAL | Seleciona dia do plano | ☑ |
| 13 | REAL | Paginação / navegação de período | ☑ |
| Qua | REAL | Seleciona dia do plano | ☑ |
| 14 | REAL | Paginação / navegação de período | ☑ |
| Qui | REAL | Seleciona dia do plano | ☑ |
| 15 | REAL | Paginação / navegação de período | ☑ |
| 2/4 | REAL | Seleciona dia do plano | ☑ |
| Sex | REAL | Seleciona dia do plano | ☑ |
| 16 | REAL | Paginação / navegação de período | ☑ |
| 0/4 | REAL | Seleciona dia do plano | ☑ |
| Sáb | REAL | Seleciona dia do plano | ☑ |
| 17 | REAL | Paginação / navegação de período | ☑ |
| Dom | REAL | Seleciona dia do plano | ☑ |
| 18 | REAL | Paginação / navegação de período | ☑ |
| livre | REAL | Refeição livre do plano (sem prato) | ☑ |

### 31 · 31-nutri-catalogo — `/nutri/catalogo` — frente B

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Todos os restaurantes | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Categoria | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Proteína: qualquer | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Restrições | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Grade | REAL | Ordenação/visualização (parâmetro na consulta) | ☑ |
| Lista | REAL | Ordenação/visualização (parâmetro na consulta) | ☑ |
| ‹ | REAL | Paginação / navegação de período | ☑ |
| 1 | REAL | Paginação / navegação de período | ☑ |
| 2 | REAL | Paginação / navegação de período | ☑ |
| 3 | REAL | Paginação / navegação de período | ☑ |
| 4 | REAL | Paginação / navegação de período | ☑ |
| › | REAL | Paginação / navegação de período | ☑ |
| Aprovado SN Sabor Natural Frango Grelhado Fitness 420 kcal 38 prot … | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Aprovado MT Mar & Terra Salmão com Quinoa 480 kcal 35 prot 28 carb … | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Aprovado VV Verde Vida Bowl Vegano com Grão-de-bico 380 kcal 18 pro… | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Aprovado SN Sabor Natural Steak com Batata Doce 560 kcal 42 prot 38… | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Aprovado AC Açaí Club Açaí Proteico 350 kcal 25 prot 42 carb 6 gord | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Aprovado FF FitFood Wrap Integral de Frango 390 kcal 28 prot 36 car… | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Aprovado FF FitFood Tapioca com Ovo e Banana 320 kcal 18 prot 42 ca… | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Aprovado RP Rota Proteica Carne Magra com Arroz Integral 510 kcal 4… | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Aprovado RP Rota Proteica Marmita Bulking 800g 720 kcal 55 prot 68 … | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Aprovado VV Verde Vida Salada Caesar com Frango 340 kcal 32 prot 12… | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Aprovado MT Mar & Terra Tilápia Grelhada com Legumes 370 kcal 36 pr… | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Aprovado FF FitFood Omelete de Claras com Espinafre 280 kcal 32 pro… | REAL | Aba/filtro por status (consulta no servidor) | ☑ |

### 32 · 32-nutri-prescricao — `/nutri/prescricoes/nova` — frente B

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Trocar cliente | REAL | Seleciona outro cliente no editor | ☑ |
| Ver perfil | REAL | Navega para `/nutri/clientes/:id` | ☑ |
| Sem lactose | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Sem glúten | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Vegetariano | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Vegano | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Baixo sódio | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| Diabético | REAL | Filtro/opção que atualiza resultados automaticamente (CE-10) | ☑ |
| input checkbox | REAL | Campo do formulário salvo com o recurso | ☑ |

### 33 · 33-nutri-chat — `/nutri/mensagens` — frente B

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| _Extração automática incompleta (botões em `div`): a frente completa esta lista na 1ª passada_ | | | |

### 34 · 34-nutri-financeiro — `/nutri/financeiro` — frente B

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Exportar | REAL | Download CSV/PDF gerado no backend | ☑ |
| Ver todas | REAL | Navega para a listagem completa da seção | ☑ |
| _Extração automática incompleta (botões em `div`): a frente completa esta lista na 1ª passada_ | | | |

### 35 · 35-nutri-perfil-profissional — `/nutri/perfil` — frente B

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| Salvar alterações | REAL | PUT/POST no recurso da tela (validação Bean Validation) | ☑ |
| _Extração automática incompleta (botões em `div`): a frente completa esta lista na 1ª passada_ | | | |

### 36 · 36-resto-dashboard — `/restaurante` — frente C

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Ver pedidos | REAL | Navega para `/restaurante/pedidos` | ☑ |
| Ver todos | REAL | Navega para `/restaurante/pedidos` | ☑ |
| Novo prato | REAL | Navega para `/restaurante/cardapio/novo` | ☑ |
| Ver cardápio | REAL | Navega para `/restaurante/cardapio` | ☑ |
| Analytics | REAL | Navega para `/restaurante/analytics` | ☑ |
| Financeiro | REAL | Navega para `/restaurante/financeiro` | ☑ |
| Relatórios | REAL | Navega para `/restaurante/relatorios` | ☑ |
| Perfil | REAL | Navega para `/restaurante/perfil` | ☑ |

### 37 · 37-resto-pedidos — `/restaurante/pedidos` — frente C

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| Recusar | REAL | PATCH /api/painel-restaurante/pedidos/{id}/status (Realtime → tela 18) | ☑ |
| Aceitar | REAL | PATCH /api/painel-restaurante/pedidos/{id}/status (Realtime → tela 18) | ☑ |
| Marcar pronto | REAL | PATCH /api/painel-restaurante/pedidos/{id}/status (Realtime → tela 18) | ☑ |
| Confirmar retirada | REAL | PATCH /api/painel-restaurante/pedidos/{id}/status (Realtime → tela 18) | ☑ |
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| Novos | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Preparando | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Pronto | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Entregue | REAL | Aba/filtro por status (consulta no servidor) | ☑ |

### 38 · 38-resto-cardapio — `/restaurante/cardapio` — frente C

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| (ícone) | REAL | Ação do ícone (favoritar, notificações, voltar, fechar, menu) — identificar na tela | ☑ |
| 1 | REAL | Paginação / navegação de período | ☑ |
| 2 | REAL | Paginação / navegação de período | ☑ |
| Novo prato | REAL | Navega para `/restaurante/cardapio/novo` | ☑ |
| _Extração automática incompleta (botões em `div`): a frente completa esta lista na 1ª passada_ | | | |

### 39 · 39-resto-criar-prato — `/restaurante/cardapio/novo` — frente C

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| Salvar prato | REAL | PUT/POST no recurso da tela (validação Bean Validation) | ☑ |
| Cancelar | REAL | Navega para `/restaurante/cardapio` | ☑ |
| _Extração automática incompleta (botões em `div`): a frente completa esta lista na 1ª passada_ | | | |

### 40 · 40-resto-aprovacao — `/restaurante/aprovacao` — frente C

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| Pendente | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Aprovado | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| Rejeitado | REAL | Aba/filtro por status (consulta no servidor) | ☑ |
| _Extração automática incompleta (botões em `div`): a frente completa esta lista na 1ª passada_ | | | |

### 41 · 41-resto-analytics — `/restaurante/analytics` — frente C

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| _Extração automática incompleta (botões em `div`): a frente completa esta lista na 1ª passada_ | | | |

### 42 · 42-resto-financeiro — `/restaurante/financeiro` — frente C

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| Exportar | REAL | Download CSV/PDF gerado no backend | ☑ |
| _Extração automática incompleta (botões em `div`): a frente completa esta lista na 1ª passada_ | | | |

### 43 · 43-resto-relatorios — `/restaurante/relatorios` — frente C

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| Gerar relatório | REAL | Download CSV/PDF gerado no backend | ☑ |
| Baixar | REAL | Download CSV/PDF gerado no backend | ☑ |
| _Extração automática incompleta (botões em `div`): a frente completa esta lista na 1ª passada_ | | | |

### 44 · 44-resto-perfil — `/restaurante/perfil` — frente C

| Elemento | Nível | Ação / endpoint | Feito |
|---|---|---|---|
| Alterar logo / Enviar foto de capa | REAL | POST /api/painel-restaurante/perfil/imagem (Storage `restaurantes`) | ☑ |
| Categorias e tipos de cozinha | REAL | Adiciona/remove categorias do restaurante | ☑ |
| Horário de funcionamento (Seg–Dom) | REAL | Alterna Aberto/Fechado e altera abertura/fechamento | ☑ |
| Entrega e chave PIX | REAL | Atualiza prazos, taxa, pedido mínimo e dados PIX | ☑ |
| Salvar alterações | REAL | PUT /api/painel-restaurante/perfil | ☑ |
