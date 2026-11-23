-- Seed da frente A — cliente (telas 10–25): pedidos e histórico (19), avaliações (12, 20), favoritos, conquistas, consumo do dia (10), componentes do monte sua marmita (15), cupons, faturas da assinatura (23), conversa do NutriBot (25)
-- Só esta frente edita este arquivo. Use os UUIDs fixos de seed.sql para referenciar
-- usuários, restaurantes e pratos do núcleo. Datas em 2026, cidade Recife.

-- Favoritos do Breno (tela 10: coração ativo no Frango Grelhado Fitness)
insert into favorito (id_usuario, id_marmita) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-b000-000000000001'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-b000-000000000003')
on conflict do nothing;
