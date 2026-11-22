-- =====================================================================
-- CleanEats — ajustes compartilhados para o escopo completo (22/11/2026)
-- Origem: docs/matriz-funcionalidades.md (botões que exigem dados novos).
-- Migrations compartilhadas só são criadas pela sessão principal.
-- =====================================================================

-- Preferências de notificação (tela 21: "Notificações Push, email e SMS")
alter table usuario
  add column preferencias_notificacao jsonb not null
    default '{"pedido": true, "cardapio": true, "nutricionista": true, "email": true}';

-- Entrega agendada (tela 16: "Agendar") e entrega simulada (tela 18)
alter table pedido
  add column agendado_para        timestamptz,
  add column entregador_nome      text,             -- SIMULADO
  add column previsao_entrega_em  timestamptz;

-- Medições do cliente registradas pela nutri (tela 29: "Registrar nova medição")
create table medicao (
  id                uuid primary key default gen_random_uuid(),
  id_usuario        uuid not null references usuario(id) on delete cascade,
  id_nutricionista  uuid references nutricionista(id) on delete set null,
  data              date not null default current_date,
  peso_kg           numeric(5,2) check (peso_kg between 20 and 400),
  gordura_percentual numeric(4,1) check (gordura_percentual between 2 and 70),
  cintura_cm        numeric(5,1),
  observacao        text,
  criado_em         timestamptz not null default now()
);
create index idx_medicao_usuario on medicao (id_usuario, data desc);

-- "Falar com suporte" / "Ajuda e suporte" (telas 02, 17, 18, 21) → fila no /admin
create table contato_suporte (
  id           uuid primary key default gen_random_uuid(),
  id_usuario   uuid references usuario(id) on delete set null,
  email        text not null,
  assunto      text not null,
  mensagem     text not null check (length(mensagem) between 1 and 4000),
  respondido_em timestamptz,
  criado_em    timestamptz not null default now()
);

alter table medicao enable row level security;
alter table contato_suporte enable row level security;
