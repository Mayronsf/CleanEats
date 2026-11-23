-- Componentes do "monte sua marmita" (tela 15), exatamente os da tela, preparados pelo Sabor Natural (25–35 min). Idempotente.
-- Preço: proteína já inclui a base da marmita; vegetais inclusos; adicionais cobrados à parte. Carboidrato aceita P/M/G.
insert into componente_marmita (id, id_restaurante, categoria, nome, porcao_g, calorias, proteinas, carboidratos, gorduras, fibras, preco, permite_tamanho, ordem, imagem_url) values
  ('00000000-0000-4000-f150-000000000001', '00000000-0000-4000-a000-000000000001', 'PROTEINA',    'Frango Grelhado',   150, 248, 35, 0,  6,  0,   19.90, false, 1, '/img/componentes/frango-grelhado.jpg'),
  ('00000000-0000-4000-f150-000000000002', '00000000-0000-4000-a000-000000000001', 'PROTEINA',    'Filé Mignon',       150, 285, 38, 0,  14, 0,   27.90, false, 2, '/img/componentes/file-mignon.jpg'),
  ('00000000-0000-4000-f150-000000000003', '00000000-0000-4000-a000-000000000001', 'PROTEINA',    'Salmão Grelhado',   150, 310, 32, 0,  19, 0,   29.90, false, 3, '/img/componentes/salmao-grelhado.jpg'),
  ('00000000-0000-4000-f150-000000000004', '00000000-0000-4000-a000-000000000001', 'PROTEINA',    'Carne Magra',       150, 255, 36, 0,  11, 0,   21.90, false, 4, '/img/componentes/carne-magra.jpg'),
  ('00000000-0000-4000-f150-000000000005', '00000000-0000-4000-a000-000000000001', 'PROTEINA',    'Tilápia',           150, 192, 30, 0,  7,  0,   21.90, false, 5, '/img/componentes/tilapia.jpg'),
  ('00000000-0000-4000-f150-000000000006', '00000000-0000-4000-a000-000000000001', 'PROTEINA',    'Tofu Grelhado',     120, 173, 18, 4,  10, 2,   18.90, false, 6, '/img/componentes/tofu-grelhado.jpg'),
  ('00000000-0000-4000-f150-000000000011', '00000000-0000-4000-a000-000000000001', 'CARBOIDRATO', 'Arroz Integral',    100, 124, 3,  28, 1,  2,    4.00, true,  1, '/img/componentes/arroz-integral.jpg'),
  ('00000000-0000-4000-f150-000000000012', '00000000-0000-4000-a000-000000000001', 'CARBOIDRATO', 'Batata Doce',       120, 138, 2,  32, 0,  4,    5.00, true,  2, '/img/componentes/batata-doce.jpg'),
  ('00000000-0000-4000-f150-000000000013', '00000000-0000-4000-a000-000000000001', 'CARBOIDRATO', 'Quinoa',            100, 120, 4,  24, 2,  3,    6.00, true,  3, '/img/componentes/quinoa.jpg'),
  ('00000000-0000-4000-f150-000000000014', '00000000-0000-4000-a000-000000000001', 'CARBOIDRATO', 'Mandioquinha',      120, 130, 1,  30, 0,  3,    5.50, true,  4, '/img/componentes/mandioquinha.jpg'),
  ('00000000-0000-4000-f150-000000000021', '00000000-0000-4000-a000-000000000001', 'VEGETAL',     'Brócolis no vapor',  80,  35, 3,  6,  0,  3,    0.00, false, 1, '/img/componentes/brocolis.jpg'),
  ('00000000-0000-4000-f150-000000000022', '00000000-0000-4000-a000-000000000001', 'VEGETAL',     'Salada de folhas',   60,  20, 1,  3,  0,  2,    0.00, false, 2, '/img/componentes/salada-folhas.jpg'),
  ('00000000-0000-4000-f150-000000000023', '00000000-0000-4000-a000-000000000001', 'VEGETAL',     'Cenoura ralada',     50,  22, 0,  5,  0,  1.5,  0.00, false, 3, '/img/componentes/cenoura.jpg'),
  ('00000000-0000-4000-f150-000000000024', '00000000-0000-4000-a000-000000000001', 'VEGETAL',     'Abobrinha',          70,  18, 1,  3,  0,  1,    0.00, false, 4, '/img/componentes/abobrinha.jpg'),
  ('00000000-0000-4000-f150-000000000031', '00000000-0000-4000-a000-000000000001', 'ADICIONAL',   'Abacate (50g)',      50,  80, 1,  4,  7,  3,    3.50, false, 1, null),
  ('00000000-0000-4000-f150-000000000032', '00000000-0000-4000-a000-000000000001', 'ADICIONAL',   'Ovo cozido',         50,  70, 6,  1,  5,  0,    2.00, false, 2, '/img/componentes/ovo-cozido.jpg'),
  ('00000000-0000-4000-f150-000000000033', '00000000-0000-4000-a000-000000000001', 'ADICIONAL',   'Queijo cottage',     50,  60, 6,  2,  2,  0,    4.00, false, 3, '/img/componentes/queijo-cottage.jpg'),
  ('00000000-0000-4000-f150-000000000034', '00000000-0000-4000-a000-000000000001', 'ADICIONAL',   'Chia / sementes',    10,  40, 2,  4,  3,  3,    2.50, false, 4, null)
on conflict (id) do nothing;
