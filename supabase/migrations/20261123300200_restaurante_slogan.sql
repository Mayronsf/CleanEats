-- Cadastro (07) e perfil (44) do restaurante: slogan curto (card de busca) e complemento do endereço. Dono: frente C.
alter table restaurante
  add column if not exists slogan text check (length(slogan) <= 120),
  add column if not exists complemento text;
