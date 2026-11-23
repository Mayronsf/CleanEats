# Frente B (nutricionista): relatório de entrega, 23/11/2026

Branch `frente-b-nutri`, 8 commits sobre `main` (9489530). Este arquivo diz o que foi feito, como testar e o que falta para a apresentação.

## Resumo

- **Telas:** as 13 telas da nutricionista estão ligadas à API real, sem dado fixo em componente: 06, 26 a 35, `/nutri/prescricoes` e `/nutri/acompanhamento`.
- **Testes:**
  - os 21 testes JUnit da frente B passam (`service/nutri/*Test`);
  - o backend compila e o `tsc --noEmit` passa sem erro;
  - as 12 telas do painel foram abertas no navegador (1440px) logado como `nutri@cleaneats.test`, comparadas com `telas-html/` e corrigidas.
- **NutriBot:** ganhou um segundo provedor, o Google Gemini, com camada gratuita. A conta da Anthropic estava sem crédito, então a tela 25 ficaria fora do ar na apresentação.
- **Banco:** dois seeds novos e idempotentes da frente B, já aplicados no Supabase. Nenhuma migration nova.

## 1. Telas e endpoints

| Tela | Rota no front | Endpoints |
|---|---|---|
| 06 Cadastro | `/cadastro/nutricionista` | `POST /api/cadastro/nutricionista` |
| 26 Dashboard | `/nutri` | `GET /api/nutri/dashboard` |
| 27 Triagens | `/nutri/triagens` | `GET /api/nutri/triagens?status=&ordenacao=`, `POST /api/nutri/triagens/{id}/iniciar`, `POST /api/nutri/triagens/{id}/concluir` |
| 28 Meus clientes | `/nutri/clientes` | `GET /api/nutri/clientes?busca=&tier=&objetivo=&ordem=nome\|adesao\|recentes&pagina=&tamanho=` |
| Acompanhamento | `/nutri/acompanhamento` | o mesmo endpoint da 28, com `ordem=adesao` |
| 29 Perfil do cliente | `/nutri/clientes/:id` | `GET /api/nutri/clientes/{id}`, `GET /api/nutri/clientes/{id}/pedidos`, `POST /api/nutri/clientes/{id}/medicoes` |
| 30 Editor de plano | `/nutri/clientes/:id/plano` | `GET` e `PUT /api/nutri/clientes/{id}/plano` |
| 31 Catálogo | `/nutri/catalogo` | `GET /api/nutri/catalogo?busca=&restaurante=&categoria=&proteina=30-&restricao=&pagina=` |
| 32 Prescrição | `/nutri/prescricoes/nova?cliente=` | `GET /api/nutri/prescricoes/clientes-elegiveis`, `GET /api/nutri/prescricoes/previa?cliente=`, `POST /api/nutri/prescricoes` |
| Histórico de prescrições | `/nutri/prescricoes` | `GET /api/nutri/prescricoes`, `GET /api/nutri/prescricoes/{id}/pdf` (URL assinada) |
| 33 Mensagens | `/nutri/mensagens?cliente=` | `GET /api/nutri/conversas`, `GET` e `POST /api/nutri/conversas/{id}/mensagens`, `POST /api/nutri/conversas/cliente/{idCliente}` |
| 34 Financeiro | `/nutri/financeiro` | `GET /api/nutri/financeiro`, `GET /api/nutri/financeiro/csv` |
| 35 Perfil profissional | `/nutri/perfil` | `GET` e `PUT /api/nutri/perfil`, `POST /api/nutri/perfil/assinatura` (multipart) |

Código: `backend/.../{controller,service}/nutri/`, `frontend/src/features/nutri/**` e `frontend/src/services/nutri/*.ts`. O `NutriContexto` (service.nutri) resolve qual nutricionista está logada e barra o acesso a cliente de outra nutri (devolve 404). Todas as telas usam esse componente.

### Regras implementadas (do `frente-b-nutri.md`)

- **06 Cadastro:**
  - o CRN é validado no formato `CRN-<região> <UF> <número>/<letra>`;
  - a nutricionista nasce `PENDENTE`;
  - enquanto estiver pendente ou rejeitada, o dashboard mostra o status e o motivo.
- **27 Triagens:**
  - iniciar põe a triagem `EM_ANDAMENTO`;
  - concluir grava as metas em `perfil_cliente`, põe `CONCLUIDA` e notifica o cliente com link para `/app/meu-plano`;
  - limites aceitos: kcal de 800 a 6000 e água de 500 a 6000 ml.
- **Adesão (28, 29, Acompanhamento e 26):** refeições do plano ativo pedidas (mesma marmita, mesmo dia) ÷ refeições planejadas, nos últimos 7 dias. O cálculo está em `CalculoAdesao`, com teste.
- **30 e 31, catálogo e editor de plano:**
  - só entram pratos `APROVADO` de restaurantes aprovados;
  - cada dia e refeição aceita um prato só, e a observação tem até 300 caracteres;
  - salvar substitui as refeições da semana numa transação e notifica o cliente;
  - a tela 24 do cliente lê as mesmas tabelas.
- **Convenção do dia da semana:** a API do editor usa 1 = segunda … 7 = domingo. O banco (`refeicao_plano.dia_semana`) usa 0 = domingo … 6 = sábado. A conversão fica em `PlanoNutriService.diaParaBanco` e `diaDoBanco`.
- **32 Prescrição:**
  - só cliente Premium recebe; os outros levam 422;
  - sem plano ativo, 422 "Monte o plano antes de prescrever";
  - o PDF é gerado com OpenPDF e traz nome, metas, plano da semana em ordem, nutricionista, CRN e a imagem da assinatura, se houver;
  - o PDF vai para o bucket privado `prescricoes`, e `prescricao` guarda o hash SHA-256;
  - o e-mail sai pelo Resend (`EmailService`). Sem chave, a emissão não falha e a resposta traz `emailEnviado: false`.
- **33 Mensagens:**
  - Realtime em `mensagem`, com refetch de reserva;
  - abrir a conversa marca como lidas as mensagens do cliente;
  - texto de até 4.000 caracteres;
  - cada envio notifica o cliente.
- **34 Financeiro:** a receita é a soma das mensalidades Pro e Premium vigentes (o anual entra dividido por 12). O líquido é 60% (`CalculoFinanceiro.calcularRepasseNutricionista`). O gráfico de 6 meses usa a mesma base e há exportação em CSV.

## 2. NutriBot (tela 25, frente A): provedor Gemini

A chave da Anthropic não serve sem crédito na conta, e a apresentação não pode depender disso. Por isso entrou um provedor alternativo, escolhido no `.env`. **O caminho do Claude continua igual** e é o padrão.

- Arquivos:
  - `service/cliente/NutriBotGemini.java` (novo), que chama a API REST do Gemini em streaming (SSE), sem dependência nova no `pom.xml`;
  - `service/cliente/NutriBotService.java`, que recebeu só o desvio "se `NUTRIBOT_PROVEDOR=gemini`, chama o Gemini". O contexto real do dia, o limite por tier, a recusa de dieta e o histórico continuam iguais;
  - `backend/.env.example`, com as variáveis novas.
- Variáveis no `backend/.env`, e também no Render se a demo for pelo deploy:
  ```
  NUTRIBOT_PROVEDOR=gemini
  GEMINI_API_KEY=<pedir ao João por mensagem privada>
  GEMINI_MODELOS=gemini-3.5-flash-lite,gemini-3.8-flash,gemini-3.6-flash
  ```
  Para voltar ao Claude, use `NUTRIBOT_PROVEDOR=anthropic`. Isso exige crédito em platform.claude.com.
- **Por que uma lista de modelos:** a camada gratuita do Google às vezes responde "alta demanda". O código tenta os modelos em ordem, com 12 s para cada um começar a responder, e passa ao seguinte se falhar. O `maxOutputTokens` é 4096, porque com 1024 o raciocínio interno dos modelos 3.x cortava a resposta.
- **Testado com o Breno:**
  - "Posso comer uma pizza hoje?" teve o primeiro trecho em cerca de 3 s e citou as 953 kcal e os 54 g de proteína restantes, a restrição sem lactose e a próxima refeição do plano;
  - "Monta uma dieta pra mim?" foi recusado e mandado para a Dra. Ana.

## 3. Banco (Supabase `awktnlswurcxkehpzoch`)

Foram aplicados com `npm run banco:sql`. Os dois são idempotentes:

- **`supabase/seeds/frente-b.sql`** (UUIDs na faixa `00000000-0000-4000-e…`):
  - 14 triagens. As 3 aguardando são Fernanda, Gabriela e a conta de teste do Mayron, que já existia. Em andamento estão Rafael e Thales, e as outras 9 estão concluídas;
  - 11 medições: a evolução do Breno, de 75,8 kg a 78,2 kg, mais dois clientes;
  - 5 conversas novas com as mensagens da tela 33 (Maria Braga, Carlos, Lucia, Roberto e Juliana Ferraz).
- **`supabase/seeds/frente-b-adesao.sql`:** planos e pedidos entregues para que o Acompanhamento ordene pela menor adesão (roteiro 5.4). A ordem fica Juliana Sá 0%, Mariana 14%, Lucas 43%, Breno 50% e Pedro 86%. Usa pratos da FitFood e da Rota Proteica, para não mexer nos números do Sabor Natural (telas 41 a 43). Os códigos de pedido começam com `CE-8`.
- **Prescrições:** o seed não cria nenhuma, porque o PDF precisa existir no Storage. O histórico nasce na demo, no passo 5.8.
- **Dados de teste:** tudo o que foi criado durante os testes (plano e prescrição da Mariana, o PDF, notificações e a triagem da Gabriela) foi desfeito.
- **Sobras do esquema anterior:** o schema `private`, com 7 funções que apontam para tabelas que não existem mais, e 6 políticas de Storage que permitem upload pelo navegador. Não atrapalham a demo. Se quiser limpar, dá para fazer numa migration pequena depois da apresentação.

## 4. O que falta ou precisa de atenção

1. **E-mail da prescrição (roteiro 5.8):** `RESEND_API_KEY` e `EMAIL_REDIRECIONAR_PARA` estão vazios no `.env`. Sem eles o PDF é gerado e baixa normalmente, mas a tela avisa que o e-mail não foi enviado. Para a demo, preencher com a chave do Resend e o e-mail do dono da conta.
2. **Breno precisa ser Premium antes do Ato 5:** o roteiro faz o upgrade no 4.5. Sem isso, a tela 32 deixa "Emitir" desabilitado, que é o comportamento correto.
3. **Telas sem teste ponta a ponta:**
   - **06 (cadastro da nutri):** a tela compila e o endpoint tem teste unitário de CRN. Ela não foi aberta logada, para não criar conta de teste no banco compartilhado. Vale testar o roteiro 1.12 (Dr. Paulo Reis) uma vez antes.
   - **Realtime da tela 33:** a mensagem do cliente chegando "na hora" (5.10) depende da RLS de `mensagem` liberar SELECT para a nutri. Se o evento não chegar, a tela atualiza a cada 5 s.
4. **Documentação compartilhada:** as rotas acima ainda não estão em `docs/api-endpoints.md`, e as linhas da frente B não foram marcadas em `docs/matriz-funcionalidades.md`. A tabela da seção 1 serve de base.
5. **Fotos do catálogo:** alguns pratos mostram foto que não combina (pizza no "Bowl Proteico Carne"). Isso vem do `imagem_url` do `seed.sql` central.
6. **Pontos de integração:** a frente B mexeu fora de `nutri/` só em `NutriBotService.java` e `backend/.env.example` (seção 2). O resto está nos pacotes e pastas da frente B.

## 5. Como rodar e conferir

```bash
git fetch && git checkout frente-b-nutri
cd backend && ./mvnw test -Dtest='com.tricode.cleaneats.service.nutri.*Test'   # 21 testes
cd backend && ./mvnw spring-boot:run
cd frontend && npx tsc --noEmit -p . && npx vite --port 5180
```
Login `nutri@cleaneats.test` / `CleanEats@2026`. Para refazer só os dados da frente B: `npm run banco:sql supabase/seeds/frente-b.sql` e `npm run banco:sql supabase/seeds/frente-b-adesao.sql`.
