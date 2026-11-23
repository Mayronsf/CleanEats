-- Prato (telas 38-40): alérgenos, tempo de preparo, porções, tags, observações internas e data do envio à curadoria. Dono: frente C.
alter table marmita
  add column if not exists alergenos text[] not null default '{}',
  add column if not exists tempo_preparo_min smallint check (tempo_preparo_min between 1 and 240),
  add column if not exists serve_pessoas smallint not null default 1 check (serve_pessoas between 1 and 10),
  add column if not exists tags text[] not null default '{}',
  add column if not exists observacoes_internas text,
  add column if not exists enviado_analise_em timestamptz;
update marmita set enviado_analise_em = coalesce(avaliado_em, criado_em) where enviado_analise_em is null and status_prato <> 'RASCUNHO';
