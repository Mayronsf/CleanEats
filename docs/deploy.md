# Publicação e plano B

## Arquitetura publicada
| Parte | Onde | Arquivo de config |
|---|---|---|
| Banco, Auth, Realtime, Storage | Supabase (nuvem, região São Paulo) | `supabase/migrations`, `supabase/seed.sql`, `supabase/seeds/` |
| API Spring Boot | **Render** (Docker) — alternativa: Railway com o mesmo Dockerfile | `backend/Dockerfile`, `render.yaml` |
| Frontend React | **Vercel** | `frontend/vercel.json` |

## 1. Supabase (uma vez)
1. Criar o projeto. **Authentication → Providers**: Email ligado; **Google** ligado (Client ID/Secret do Google Cloud Console, tipo "Web application", redirect `https://<projeto>.supabase.co/auth/v1/callback`).
2. **Authentication → URL Configuration**: Site URL = URL da Vercel; Redirect URLs = `http://localhost:5173/auth/callback`, `https://<app>.vercel.app/auth/callback`.
3. **Authentication → SMTP**: configurar SMTP próprio (ex.: Resend SMTP) — o SMTP padrão só envia para e-mails da equipe e tem limite por hora (afeta a recuperação de senha, tela 08). Template "Reset password" com `{{ .Token }}` (código de 6 dígitos) e expiração de 15 min (Auth → Settings → OTP expiry = 900).
4. **Storage**: buckets `pratos` (público), `avatares` (público), `logos` (público), `prescricoes` (privado).
5. Banco: preencher `backend/.env` e rodar `npm install && npm run banco` na raiz (ou colar migrations + `supabase/seed-completo.sql` no SQL Editor).

## 2. API no Render
1. Dashboard → New → **Blueprint** → este repositório (usa `render.yaml`). Plano **Starter** (o Free hiberna após 15 min e leva ~1 min para acordar — risco na apresentação).
2. Preencher as variáveis (mesmas do `backend/.env.example`). `CORS_ORIGENS` = URL da Vercel (e `http://localhost:5173`, separados por vírgula).
3. Conferir `https://<api>.onrender.com/api/saude`.

## 3. Front na Vercel
1. New Project → este repositório → **Root Directory `frontend`** (framework Vite detectado; `vercel.json` cuida das rotas da SPA).
2. Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL=https://<api>.onrender.com/api`.
3. Deploy e conferir `/dev/conexao` (4 passos verdes) logado com `cliente@cleaneats.test`.

## Plano B — tudo local com um comando
```bash
# na raiz do repositório, com backend/.env e frontend/.env.local preenchidos
npm install          # só na primeira vez (instala o driver do banco para os scripts)
npm run demo         # sobe API :8080 + web :5173; Ctrl+C derruba os dois
```
- Continua usando o Supabase na nuvem (Auth/Realtime/banco). Se a internet do local cair, nada funciona — por isso o **plano C** é o vídeo do ensaio gravado em 24/11.
- Para recomeçar a demo do zero: `npm run banco:resetar` (pede confirmação digitando `resetar`).

## Checklist da véspera (24/11 noite)
- [ ] Deploy de `main` na Render e na Vercel com o commit do corte.
- [ ] `npm run banco:resetar` no Supabase de produção.
- [ ] Roteiro inteiro passando nas duas formas (publicado e `npm run demo`).
- [ ] Vídeo do ensaio gravado.
