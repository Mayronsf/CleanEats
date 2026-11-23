-- Monte sua marmita (tela 15): foto e fibras dos componentes. Dono: frente A.
alter table componente_marmita
  add column if not exists imagem_url text,
  add column if not exists fibras numeric(6,1) not null default 0;
