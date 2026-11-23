-- Financeiro (42) e perfil (44): recebimento só por chave PIX (sem dados bancários completos). Relatórios gerados (43). Dono: frente C.
alter table restaurante
  add column if not exists chave_pix text,
  add column if not exists tipo_chave_pix text check (tipo_chave_pix in ('CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA')),
  add column if not exists titular_pix text;

create table if not exists relatorio_gerado (
  id              uuid primary key default gen_random_uuid(),
  id_restaurante  uuid not null references restaurante(id) on delete cascade,
  tipo            text not null check (tipo in ('VENDAS', 'FINANCEIRO', 'AVALIACOES', 'CLIENTES', 'CARDAPIO', 'OPERACIONAL')),
  formato         text not null check (formato in ('PDF', 'CSV')),
  inicio          date not null,
  fim             date not null,
  gerado_em       timestamptz not null default now()
);
create index if not exists idx_relatorio_restaurante on relatorio_gerado (id_restaurante, gerado_em desc);
alter table relatorio_gerado enable row level security;

update restaurante set chave_pix = '11.111.111/0001-01', tipo_chave_pix = 'CNPJ', titular_pix = 'Sabor Natural Alimentação Saudável Ltda'
where id = '00000000-0000-4000-a000-000000000001' and chave_pix is null;
