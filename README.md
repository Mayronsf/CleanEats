# CleanEats

Plataforma web de alimentação saudável e acompanhamento nutricional — **TRICODE Solutions** · Fábrica de Software · Sistemas de Informação · UNIFACOL (Vitória de Santo Antão - PE).

O **CleanEats** conecta clientes, nutricionistas e restaurantes saudáveis em um único ecossistema:
- **Cliente:** cálculo automático de metas nutricionais (TMB Mifflin-St Jeor + Cutting/Bulking/Manutenção), escolha de nutricionista por especialidade, marketplace de pratos com ficha técnica nutricional e QR Code, montagem de marmita personalizada, pagamento via Pix (QR Code) e Cartão de Crédito (Mercado Pago), acompanhamento de entrega em tempo real no mapa de Vitória de Santo Antão, NutriBot com IA e exportação de faturas/histórico em PDF.
- **Nutricionista:** triagem de novos clientes com metas pré-calculadas, editor de plano alimentar semanal com pratos reais do catálogo, prescrição nutricional em PDF com envio por e-mail, acompanhamento de adesão, chat direto e painel financeiro com relatório em PDF.
- **Restaurante e Admin:** gestão de pedidos em tempo real, cardápio com curadoria nutricional, analytics, painel financeiro e relatórios operacionais em PDF.

## Estrutura do projeto

```text
cleaneats/
├── frontend/     React 18 + Vite + TypeScript + Leaflet
├── backend/      Java 21 + Spring Boot 3 (REST + OpenPDF + Mercado Pago)
├── supabase/     Migrations SQL e seeds do PostgreSQL
└── scripts/      Automação local de banco e inicialização
```

## Pré-requisitos
- Node.js 20+ e npm
- JDK 21+ (Maven incluso via wrapper `./mvnw`)
- Projeto no [Supabase](https://supabase.com)

## Como executar localmente

### 1. Configurar variáveis de ambiente
- Copie `backend/.env.example` para `backend/.env` e preencha as credenciais do Supabase (e, opcionalmente, Mercado Pago, Resend e Gemini/Anthropic).
- Copie `frontend/.env.example` para `frontend/.env.local` com `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_API_URL`.

### 2. Banco de dados (Supabase)
```bash
npm install
npm run banco
```

### 3. Backend (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run   # API em http://localhost:8080/api/saude
./mvnw test              # Testes unitários JUnit
```

### 4. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev              # App em http://localhost:5173
npm run build            # Build de produção
```

Para subir backend e frontend juntos em um único comando a partir da raiz:
```bash
npm run demo
```

## Testes E2E (Playwright)
Com o backend em execução:
```bash
cd frontend
npm run e2e
```

## Deploy
- **Frontend:** Vercel (`frontend/vercel.json`)
- **Backend:** Render (`render.yaml` + `backend/Dockerfile`)
- **Banco e Autenticação:** Supabase (PostgreSQL + Auth / Google OAuth + Realtime)

---
© 2026 CleanEats — TRICODE Solutions · Vitória de Santo Antão - PE · UNIFACOL
