# CleanEats

Ecossistema web de alimentação saudável — **TRICODE Solutions** · Fábrica de Software · Sistemas de Informação · UNIFACOL.

Clientes pedem marmitas com macros transparentes e seguem o plano da nutricionista; nutricionistas montam planos com pratos reais do catálogo; restaurantes gerenciam cardápio e pedidos em tempo real.

```
cleaneats/
├── frontend/     React + Vite + TypeScript
├── backend/      Java 21 + Spring Boot 3 (MVC)
├── supabase/     migrations SQL + seed
├── docs/         documentação, inventário, schema, API, decisões
└── telas-html/   telas aprovadas (referência, somente leitura)
```

## Pré-requisitos
- Node 20+ e npm
- JDK 21+ (o Maven vem pelo wrapper `./mvnw`)
- Um projeto gratuito no [Supabase](https://supabase.com)

## 1. Supabase
1. Crie um projeto (região São Paulo).
2. Preencha `backend/.env` e rode `npm install && npm run banco` na raiz (aplica migrations + seeds). Ou, no **SQL Editor**, rode nesta ordem:
   1. `supabase/migrations/20261122000001_schema_inicial.sql`
   2. `supabase/migrations/20261122000002_rls_realtime.sql`
   3. `supabase/migrations/20261122000003_escopo_completo.sql` (e as migrations das frentes, em ordem)
   4. `supabase/seed-completo.sql` (gerado por `npm run seed:sql`: núcleo + seeds das frentes)
   (Com a Supabase CLI: `supabase link --project-ref <ref>` e `supabase db push`, depois rode o seed.)
3. Anote em **Project Settings → API**: URL do projeto e chave `anon`/publishable. Em **Connect → Session pooler**: string JDBC, usuário e senha do banco.

## 2. Backend
```bash
cd backend
cp .env.example .env          # preencha com os dados do passo 1 (o Spring lê o .env sozinho)
./mvnw spring-boot:run        # http://localhost:8080/api/saude
./mvnw test                   # testes de regra (status do pedido, tiers, comissão)
```
O backend valida o JWT do Supabase (JWKS; ou HS256 se `SUPABASE_JWT_SECRET` estiver definido) e lê o perfil na tabela `usuario`.

## 3. Frontend
```bash
cd frontend
cp .env.example .env.local    # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm install
npm run dev                   # http://localhost:5173
npm test                      # Vitest + Testing Library
npm run build
```

### Um comando só (plano B da demo)
`npm install` e depois `npm run demo` na raiz sobem API e web juntos. Publicação (Vercel + Render): `docs/deploy.md`.

## 4. Conferir ponta a ponta
Abra **http://localhost:5173/dev/conexao** e entre com um usuário de demo. Os 4 passos devem ficar verdes (Supabase configurado → API no ar → login → backend leu o perfil). A vitrine do design system fica em **/design-system**.

### Testes E2E do roteiro (Playwright)
Com o backend rodando (porta de `VITE_API_URL`, CORS liberado para `http://localhost:5180`):
```bash
cd frontend && npm run e2e     # sobe o Vite na 5180 e roda e2e/*.spec.ts no Chrome instalado
```
Os testes usam o Supabase real; o de cadastro cria um usuário já confirmado e o apaga no fim.

## Usuários de demonstração
Senha de todos: **`CleanEats@2026`**

| Perfil | E-mail | Observação |
|---|---|---|
| Cliente | `cliente@cleaneats.test` | Breno Filho · Pro · ganho de massa · sem lactose · 2.200 kcal / 140 g P |
| Nutricionista | `nutri@cleaneats.test` | Dra. Ana Souza · CRN-6 PE 12345/P |
| Restaurante | `restaurante@cleaneats.test` | Sabor Natural |
| Admin | `admin@cleaneats.test` | Aprovações e comissões |

## Documentação
- `CLAUDE.md` — regras, decisões e convenções do projeto
- `PRODUCT.md` / `DESIGN.md` — produto e design system
- `docs/inventario-telas.md` — 44 telas × rotas × fases
- `docs/schema.md` — modelo de dados · `docs/api-endpoints.md` — API REST
- `docs/relatorio-fase-0.md` — relatório da Fase 0
- `docs/matriz-funcionalidades.md` — CE-1 a CE-21 e cada botão de cada tela (REAL/SIMULADA)
- `docs/roteiro-demo.md` — roteiro da apresentação
- `docs/frentes/` — execução em paralelo (instruções por frente)
- `docs/deploy.md` — publicação e plano B

---
© 2026 CleanEats — TRICODE Solutions · Recife · Brasil · v1.0 · MVP · UNIFACOL
