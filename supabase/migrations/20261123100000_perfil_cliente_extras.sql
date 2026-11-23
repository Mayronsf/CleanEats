-- Perfil do cliente (telas 21 e 22): username público, bio, capa, meta de peso e observações alimentares. Dono: frente A.
alter table perfil_cliente
  add column if not exists username text unique check (username ~ '^[a-z0-9_.]{3,30}$'),
  add column if not exists bio text check (length(bio) <= 400),
  add column if not exists capa_url text,
  add column if not exists meta_peso_kg numeric(5,2) check (meta_peso_kg between 20 and 400),
  add column if not exists prazo_meta_meses smallint check (prazo_meta_meses between 1 and 24),
  add column if not exists observacoes_alimentares text check (length(observacoes_alimentares) <= 1000);
