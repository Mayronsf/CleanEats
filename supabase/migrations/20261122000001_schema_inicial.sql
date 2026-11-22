-- =====================================================================
-- CleanEats — schema inicial (Fase 0)
-- Convenções (documentação, seção 4.1.3): tabelas e colunas snake_case,
-- PK "id", FK "id_<entidade>". Tipos enumerados espelham os enums Java.
-- O backend Spring Boot conecta com a role "postgres" (ignora RLS); o
-- frontend só usa o Supabase para Auth e Realtime — por isso RLS fica
-- ativa em TODAS as tabelas e só libera o mínimo necessário.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Enums ----------
create domain perfil_usuario as text check (value in ('CLIENTE', 'NUTRICIONISTA', 'RESTAURANTE', 'ADMIN'));
create domain status_aprovacao as text check (value in ('PENDENTE', 'APROVADO', 'REJEITADO'));
create domain status_prato as text check (value in ('RASCUNHO', 'EM_ANALISE', 'APROVADO', 'REJEITADO', 'PAUSADO'));
create domain status_pedido as text check (value in ('NOVO', 'ACEITO', 'RECUSADO', 'PREPARANDO', 'PRONTO', 'A_CAMINHO', 'ENTREGUE', 'CANCELADO'));
create domain objetivo_nutricional as text check (value in ('EMAGRECIMENTO', 'GANHO_MASSA', 'EQUILIBRIO'));
create domain nivel_atividade as text check (value in ('SEDENTARIO', 'LEVE', 'MODERADO', 'INTENSO', 'ATLETA'));
create domain tier_assinatura as text check (value in ('FREE', 'BASIC', 'PRO', 'PREMIUM'));
create domain ciclo_cobranca as text check (value in ('MENSAL', 'ANUAL'));
create domain status_assinatura as text check (value in ('TRIAL', 'ATIVA', 'PAUSADA', 'CANCELADA', 'EXPIRADA'));
create domain status_fatura as text check (value in ('PENDENTE', 'PAGA', 'FALHOU', 'ESTORNADA'));
create domain tipo_refeicao as text check (value in ('CAFE_DA_MANHA', 'LANCHE_MANHA', 'ALMOCO', 'LANCHE_TARDE', 'JANTAR', 'CEIA'));
create domain status_triagem as text check (value in ('AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA'));
create domain status_moderacao as text check (value in ('PENDENTE', 'PUBLICADA', 'REJEITADA'));
create domain categoria_componente as text check (value in ('PROTEINA', 'CARBOIDRATO', 'VEGETAL', 'ADICIONAL'));
create domain tipo_notificacao as text check (value in ('PEDIDO', 'CARDAPIO', 'NUTRICIONISTA', 'ASSINATURA', 'SISTEMA'));
create domain autor_chatbot as text check (value in ('USUARIO', 'BOT'));
create domain status_repasse as text check (value in ('PREVISTO', 'PAGO'));

-- ---------- Assinaturas: tiers (CE-15, preços da tela 09) ----------
create table tier (
  id                      tier_assinatura primary key,
  nome                    text not null,
  preco_mensal            numeric(10,2) not null,
  preco_anual             numeric(10,2) not null,
  desconto_pedido         numeric(5,2) not null default 0,
  limite_nutribot_dia     integer not null default 0,      -- -1 = ilimitado
  nutricionista_dedicado  boolean not null default false,
  prescricao_digital      boolean not null default false,
  entrega_gratis_acima    numeric(10,2),
  ordem                   smallint not null
);

-- ---------- Usuário (id = auth.users.id) ----------
create table usuario (
  id                uuid primary key references auth.users(id) on delete cascade,
  nome              text not null,
  email             text not null unique,
  telefone          text,
  perfil            perfil_usuario not null,
  avatar_url        text,
  id_tier           tier_assinatura not null default 'FREE' references tier(id),
  aceite_termos_em  timestamptz,
  aceite_lgpd_em    timestamptz,
  anonimizado_em    timestamptz,                             -- LGPD: exclusão de conta
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

create table restricao_alimentar (
  id    smallserial primary key,
  slug  text not null unique,
  nome  text not null
);

-- ---------- Nutricionista (CE-18) ----------
create table nutricionista (
  id                      uuid primary key default gen_random_uuid(),
  id_usuario              uuid not null unique references usuario(id) on delete cascade,
  crn                     text not null unique,            -- ex.: CRN-6 PE 12345/P
  crn_uf                  char(2) not null,
  especialidades          text[] not null default '{}',
  bio                     text,
  anos_experiencia        smallint,
  disponibilidade         jsonb not null default '[]',     -- [{dia: 1, inicio: "08:00", fim: "12:00"}]
  max_clientes            smallint default 30,
  assinatura_digital_url  text,
  chave_pix               text,
  status_aprovacao        status_aprovacao not null default 'PENDENTE',
  motivo_rejeicao         text,
  avaliado_por            uuid references usuario(id),
  avaliado_em             timestamptz,
  nota_media              numeric(2,1) not null default 0,
  criado_em               timestamptz not null default now()
);

-- ---------- Perfil do cliente (tela 05 / 22) ----------
create table perfil_cliente (
  id_usuario            uuid primary key references usuario(id) on delete cascade,
  objetivo_nutricional  objetivo_nutricional not null default 'EQUILIBRIO',
  sexo                  char(1) check (sexo in ('F', 'M', 'O')),
  data_nascimento       date,
  peso_kg               numeric(5,2) check (peso_kg between 20 and 400),
  altura_cm             numeric(5,1) check (altura_cm between 80 and 250),
  nivel_atividade       nivel_atividade,
  meta_calorias         integer,
  meta_proteinas        integer,
  meta_carboidratos     integer,
  meta_gorduras         integer,
  meta_fibras           integer,
  meta_agua_ml          integer,
  id_nutricionista      uuid references nutricionista(id) on delete set null
);

create table cliente_restricao (
  id_usuario   uuid not null references usuario(id) on delete cascade,
  id_restricao smallint not null references restricao_alimentar(id),
  primary key (id_usuario, id_restricao)
);

create table endereco (
  id           uuid primary key default gen_random_uuid(),
  id_usuario   uuid not null references usuario(id) on delete cascade,
  apelido      text not null default 'Casa',
  cep          char(8) not null,
  logradouro   text not null,
  numero       text not null,
  complemento  text,
  bairro       text not null,
  cidade       text not null,
  uf           char(2) not null,
  principal    boolean not null default false,
  criado_em    timestamptz not null default now()
);

-- ---------- Restaurante (CE-3, CE-5) ----------
create table restaurante (
  id                    uuid primary key default gen_random_uuid(),
  id_usuario            uuid not null unique references usuario(id) on delete cascade,
  nome                  text not null,
  sigla                 text not null,
  descricao             text,
  cnpj                  char(14) not null unique,
  razao_social          text,
  telefone              text,
  logo_url              text,
  capa_url              text,
  tipos_cozinha         text[] not null default '{}',
  cep                   char(8),
  logradouro            text,
  numero                text,
  bairro                text,
  cidade                text not null default 'Recife',
  uf                    char(2) not null default 'PE',
  latitude              numeric(9,6),
  longitude             numeric(9,6),
  tempo_entrega_min     smallint not null default 30,
  tempo_entrega_max     smallint not null default 45,
  taxa_entrega          numeric(10,2) not null default 0,
  pedido_minimo         numeric(10,2) not null default 0,
  comissao_percentual   numeric(5,2) not null default 8.00 check (comissao_percentual between 0 and 100),
  status_aprovacao      status_aprovacao not null default 'PENDENTE',
  motivo_rejeicao       text,
  avaliado_por          uuid references usuario(id),
  avaliado_em           timestamptz,
  nota_media            numeric(2,1) not null default 0,
  total_avaliacoes      integer not null default 0,
  destaque              boolean not null default false,
  criado_em             timestamptz not null default now()
);

create table horario_funcionamento (
  id              uuid primary key default gen_random_uuid(),
  id_restaurante  uuid not null references restaurante(id) on delete cascade,
  dia_semana      smallint not null check (dia_semana between 0 and 6),  -- 0 = domingo
  abre            time not null,
  fecha           time not null,
  unique (id_restaurante, dia_semana, abre)
);

-- ---------- Marmita / prato (CE-3, CE-4, CE-10) ----------
create table marmita (
  id                uuid primary key default gen_random_uuid(),
  id_restaurante    uuid not null references restaurante(id) on delete cascade,
  nome              text not null,
  descricao         text,
  categoria         text not null,                       -- Alta Proteína, Low Carb, Vegano...
  imagem_url        text,
  preco             numeric(10,2) not null check (preco > 0),
  porcao_g          integer,
  calorias          integer,
  proteinas         numeric(6,1),
  carboidratos      numeric(6,1),
  gorduras          numeric(6,1),
  fibras            numeric(6,1),
  sodio_mg          integer,
  objetivos         text[] not null default '{}' check (objetivos <@ array['EMAGRECIMENTO','GANHO_MASSA','EQUILIBRIO']),   -- CE-6
  status_prato      status_prato not null default 'RASCUNHO',
  motivo_rejeicao   text,
  avaliado_por      uuid references usuario(id),
  avaliado_em       timestamptz,
  nota_media        numeric(2,1) not null default 0,
  total_avaliacoes  integer not null default 0,
  aprovado_por_nutri boolean not null default false,               -- selo "Aprovado por nutricionista"
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  -- Ficha nutricional é obrigatória para enviar à curadoria ou publicar (CE-3)
  constraint ficha_nutricional_obrigatoria check (
    status_prato in ('RASCUNHO', 'REJEITADO')
    or (calorias is not null and proteinas is not null and carboidratos is not null
        and gorduras is not null and porcao_g is not null)
  )
);
create index idx_marmita_publicada on marmita (id_restaurante) where status_prato = 'APROVADO';
create index idx_marmita_categoria on marmita (categoria) where status_prato = 'APROVADO';

create table ingrediente_marmita (
  id          uuid primary key default gen_random_uuid(),
  id_marmita  uuid not null references marmita(id) on delete cascade,
  nome        text not null,
  quantidade  text,
  preparo     text,
  ordem       smallint not null default 0
);

-- Restrições com as quais o prato É compatível (ex.: sem-lactose). CE-6: o que não for compatível é escondido.
create table marmita_compatibilidade (
  id_marmita    uuid not null references marmita(id) on delete cascade,
  id_restricao  smallint not null references restricao_alimentar(id),
  primary key (id_marmita, id_restricao)
);

-- Monte sua marmita (tela 15)
create table componente_marmita (
  id               uuid primary key default gen_random_uuid(),
  id_restaurante   uuid references restaurante(id) on delete cascade,   -- null = componente da plataforma
  categoria        categoria_componente not null,
  nome             text not null,
  porcao_g         integer not null,
  calorias         integer not null,
  proteinas        numeric(6,1) not null,
  carboidratos     numeric(6,1) not null,
  gorduras         numeric(6,1) not null,
  preco            numeric(10,2) not null default 0,
  permite_tamanho  boolean not null default false,     -- carboidrato P/M/G
  ativo            boolean not null default true,
  ordem            smallint not null default 0
);

create table favorito (
  id_usuario  uuid not null references usuario(id) on delete cascade,
  id_marmita  uuid not null references marmita(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  primary key (id_usuario, id_marmita)
);

create table cupom (
  id           uuid primary key default gen_random_uuid(),
  codigo       text not null unique,
  descricao    text,
  percentual   numeric(5,2),
  valor_fixo   numeric(10,2),
  valido_ate   date,
  uso_maximo   integer,
  ativo        boolean not null default true,
  check (percentual is not null or valor_fixo is not null)
);

-- ---------- Assinatura e faturas (CE-15, CE-16) ----------
create table assinatura (
  id             uuid primary key default gen_random_uuid(),
  id_usuario     uuid not null references usuario(id) on delete cascade,
  id_tier        tier_assinatura not null references tier(id),
  ciclo          ciclo_cobranca not null default 'MENSAL',
  status         status_assinatura not null default 'ATIVA',
  valor          numeric(10,2) not null,
  inicio_em      timestamptz not null default now(),
  trial_ate      timestamptz,
  renovacao_em   timestamptz,
  cancelada_em   timestamptz,
  encerra_em     timestamptz,           -- depois desta data volta ao FREE, sem perder histórico
  pausada_ate    timestamptz,
  gateway        text not null default 'SIMULADO',
  id_externo     text,
  criado_em      timestamptz not null default now()
);
create unique index uq_assinatura_vigente on assinatura (id_usuario) where status in ('TRIAL', 'ATIVA', 'PAUSADA');

create table fatura (
  id             uuid primary key default gen_random_uuid(),
  id_assinatura  uuid not null references assinatura(id) on delete cascade,
  referencia     text not null,           -- ex.: 11/2026
  valor          numeric(10,2) not null,
  status         status_fatura not null default 'PENDENTE',
  vencimento     date not null,
  paga_em        timestamptz,
  criado_em      timestamptz not null default now()
);

-- ---------- Pedidos (CE-9, CE-14, CE-7) ----------
create sequence pedido_codigo_seq start 4900;

create table pedido (
  id                   uuid primary key default gen_random_uuid(),
  codigo               text not null unique default ('CE-' || nextval('pedido_codigo_seq')),
  id_usuario           uuid not null references usuario(id),
  id_restaurante       uuid not null references restaurante(id),
  id_endereco          uuid references endereco(id) on delete set null,
  id_cupom             uuid references cupom(id),
  status               status_pedido not null default 'NOVO',
  subtotal             numeric(10,2) not null,
  desconto             numeric(10,2) not null default 0,
  taxa_entrega         numeric(10,2) not null default 0,
  total                numeric(10,2) not null,
  comissao_percentual  numeric(5,2) not null,           -- congelada no momento do pedido
  valor_comissao       numeric(10,2) not null,
  forma_pagamento      text not null default 'PIX',
  observacao           text,
  motivo_recusa        text,
  confirmado_em        timestamptz not null default now(),
  entregue_em          timestamptz,
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now()
);
create index idx_pedido_usuario on pedido (id_usuario, criado_em desc);
create index idx_pedido_restaurante on pedido (id_restaurante, criado_em desc);

-- Itens com snapshot dos macros e do preço no momento da compra
create table item_pedido (
  id              uuid primary key default gen_random_uuid(),
  id_pedido       uuid not null references pedido(id) on delete cascade,
  id_marmita      uuid references marmita(id) on delete set null,   -- null = "monte sua marmita"
  nome            text not null,
  quantidade      smallint not null check (quantidade > 0),
  preco_unitario  numeric(10,2) not null,
  calorias        integer not null,
  proteinas       numeric(6,1) not null,
  carboidratos    numeric(6,1) not null,
  gorduras        numeric(6,1) not null,
  personalizacao  jsonb                                                -- componentes escolhidos
);

create table historico_status_pedido (
  id          bigserial primary key,
  id_pedido   uuid not null references pedido(id) on delete cascade,
  status      status_pedido not null,
  id_autor    uuid references usuario(id),
  em          timestamptz not null default now()
);

-- ---------- Avaliações (CE-11) ----------
create table avaliacao (
  id                uuid primary key default gen_random_uuid(),
  id_pedido         uuid not null references pedido(id) on delete cascade,
  id_marmita        uuid references marmita(id) on delete set null,
  id_usuario        uuid not null references usuario(id) on delete cascade,
  nota              smallint not null check (nota between 1 and 5),
  nota_sabor        smallint check (nota_sabor between 1 and 5),
  nota_porcao       smallint check (nota_porcao between 1 and 5),
  nota_embalagem    smallint check (nota_embalagem between 1 and 5),
  nota_entrega      smallint check (nota_entrega between 1 and 5),
  comentario        text,
  tags              text[] not null default '{}',
  status_moderacao  status_moderacao not null default 'PENDENTE',
  data_avaliacao    timestamptz not null default now(),
  unique (id_pedido, id_marmita)
);

-- ---------- Consumo (HistoricoConsumo) ----------
create table consumo_diario (
  id            uuid primary key default gen_random_uuid(),
  id_usuario    uuid not null references usuario(id) on delete cascade,
  data          date not null,
  calorias      integer not null default 0,
  proteinas     numeric(6,1) not null default 0,
  carboidratos  numeric(6,1) not null default 0,
  gorduras      numeric(6,1) not null default 0,
  fibras        numeric(6,1) not null default 0,
  agua_ml       integer not null default 0,
  unique (id_usuario, data)
);

-- ---------- Nutrição: triagem, plano, prescrição (CE-19, CE-20) ----------
create table triagem (
  id                uuid primary key default gen_random_uuid(),
  id_cliente        uuid not null references usuario(id) on delete cascade,
  id_nutricionista  uuid not null references nutricionista(id),
  status            status_triagem not null default 'AGUARDANDO',
  respostas         jsonb not null default '{}',
  observacoes       text,
  criado_em         timestamptz not null default now(),
  iniciada_em       timestamptz,
  concluida_em      timestamptz
);

create table plano_alimentar (
  id                 uuid primary key default gen_random_uuid(),
  id_usuario         uuid not null references usuario(id) on delete cascade,
  id_nutricionista   uuid not null references nutricionista(id),
  semana_inicio      date not null,
  ativo              boolean not null default true,
  observacoes        text,
  meta_calorias      integer,
  meta_proteinas     integer,
  meta_carboidratos  integer,
  meta_gorduras      integer,
  meta_fibras        integer,
  meta_agua_ml       integer,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);
create unique index uq_plano_ativo on plano_alimentar (id_usuario) where ativo;

create table refeicao_plano (
  id                  uuid primary key default gen_random_uuid(),
  id_plano_alimentar  uuid not null references plano_alimentar(id) on delete cascade,
  dia_semana          smallint not null check (dia_semana between 0 and 6),
  tipo_refeicao       tipo_refeicao not null,
  horario             time,
  id_marmita          uuid not null references marmita(id),   -- prato REAL do catálogo aprovado (validado no service)
  observacao          text,
  unique (id_plano_alimentar, dia_semana, tipo_refeicao)
);

create table prescricao (
  id                  uuid primary key default gen_random_uuid(),
  id_plano_alimentar  uuid not null references plano_alimentar(id),
  id_nutricionista    uuid not null references nutricionista(id),
  id_cliente          uuid not null references usuario(id) on delete cascade,
  pdf_url             text not null,
  hash_documento      text not null,
  enviada_email_em    timestamptz,
  emitida_em          timestamptz not null default now()
);

-- ---------- Mensagens nutri ↔ cliente (Realtime) ----------
create table conversa (
  id                uuid primary key default gen_random_uuid(),
  id_cliente        uuid not null references usuario(id) on delete cascade,
  id_nutricionista  uuid not null references nutricionista(id) on delete cascade,
  criado_em         timestamptz not null default now(),
  unique (id_cliente, id_nutricionista)
);

create table mensagem (
  id           uuid primary key default gen_random_uuid(),
  id_conversa  uuid not null references conversa(id) on delete cascade,
  id_autor     uuid not null references usuario(id),
  texto        text not null check (length(texto) between 1 and 4000),
  lida_em      timestamptz,
  criado_em    timestamptz not null default now()
);
create index idx_mensagem_conversa on mensagem (id_conversa, criado_em);

-- ---------- NutriBot (CE-8, CE-21) ----------
create table conversa_chatbot (
  id          uuid primary key default gen_random_uuid(),
  id_usuario  uuid not null references usuario(id) on delete cascade,
  criado_em   timestamptz not null default now()
);

create table mensagem_chatbot (
  id                   uuid primary key default gen_random_uuid(),
  id_conversa_chatbot  uuid not null references conversa_chatbot(id) on delete cascade,
  autor                autor_chatbot not null,
  texto                text not null,
  contexto             jsonb,          -- snapshot do contexto usado (plano, consumo, metas) — auditoria
  criado_em            timestamptz not null default now()
);

-- ---------- Notificações (CE-13) ----------
create table notificacao (
  id          uuid primary key default gen_random_uuid(),
  id_usuario  uuid not null references usuario(id) on delete cascade,
  tipo        tipo_notificacao not null,
  titulo      text not null,
  corpo       text,
  link        text,
  lida_em     timestamptz,
  criado_em   timestamptz not null default now()
);
create index idx_notificacao_usuario on notificacao (id_usuario, criado_em desc);

-- ---------- Financeiro (CE-17) ----------
create table repasse (
  id                uuid primary key default gen_random_uuid(),
  id_restaurante    uuid references restaurante(id) on delete cascade,
  id_nutricionista  uuid references nutricionista(id) on delete cascade,
  periodo_inicio    date not null,
  periodo_fim       date not null,
  valor_bruto       numeric(12,2) not null,
  valor_comissao    numeric(12,2) not null,
  valor_liquido     numeric(12,2) not null,
  status            status_repasse not null default 'PREVISTO',
  previsto_para     date,
  pago_em           timestamptz,
  check ((id_restaurante is null) <> (id_nutricionista is null))
);

-- ---------- Conquistas ----------
create table conquista (
  id         smallserial primary key,
  codigo     text not null unique,
  nome       text not null,
  descricao  text not null,
  icone      text not null
);

create table conquista_usuario (
  id_usuario    uuid not null references usuario(id) on delete cascade,
  id_conquista  smallint not null references conquista(id),
  obtida_em     timestamptz not null default now(),
  primary key (id_usuario, id_conquista)
);

-- ---------- CE-5: só restaurantes aprovados com >= 1 prato aprovado ----------
create view vw_restaurante_publico with (security_invoker = true) as
select r.*
from restaurante r
where r.status_aprovacao = 'APROVADO'
  and exists (select 1 from marmita m where m.id_restaurante = r.id and m.status_prato = 'APROVADO');

-- ---------- atualizado_em automático ----------
create or replace function tocar_atualizado_em() returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;

create trigger trg_usuario_atualizado before update on usuario for each row execute function tocar_atualizado_em();
create trigger trg_marmita_atualizado before update on marmita for each row execute function tocar_atualizado_em();
create trigger trg_pedido_atualizado before update on pedido for each row execute function tocar_atualizado_em();
create trigger trg_plano_atualizado before update on plano_alimentar for each row execute function tocar_atualizado_em();

-- Toda mudança de status do pedido entra no histórico (alimenta a timeline da tela 18)
create or replace function registrar_status_pedido() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into historico_status_pedido (id_pedido, status) values (new.id, new.status);
  end if;
  return new;
end $$;
create trigger trg_pedido_status after insert or update of status on pedido
  for each row execute function registrar_status_pedido();
