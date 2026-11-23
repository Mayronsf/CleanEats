-- Avaliação (tela 20, CE-11): critérios de apresentação e temperatura, anonimato e fotos (bucket avaliacoes). Dono: frente A.
alter table avaliacao
  add column if not exists nota_apresentacao smallint check (nota_apresentacao between 1 and 5),
  add column if not exists nota_temperatura smallint check (nota_temperatura between 1 and 5),
  add column if not exists anonima boolean not null default false,
  add column if not exists fotos text[] not null default '{}' check (cardinality(fotos) <= 4);
