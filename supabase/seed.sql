-- =====================================================================
-- CleanEats — seed de demonstração (coerente com as telas HTML)
-- Unificado: ano 2026, Recife, restaurante principal "Sabor Natural".
-- Senha de TODOS os usuários de demo: CleanEats@2026
-- NÚCLEO (sessão principal): tiers, restrições, usuários de demo, restaurantes,
-- pratos e perfil do Breno. Cada frente completa os dados das suas telas em
-- supabase/seeds/frente-<x>.sql. Ordem: seed.sql → seeds/frente-a.sql →
-- seeds/frente-b.sql → seeds/frente-c.sql (scripts/aplicar-banco.mjs faz isso).
-- =====================================================================

-- ---------- Tiers (tela 09) ----------
insert into tier (id, nome, preco_mensal, preco_anual, desconto_pedido, limite_nutribot_dia, nutricionista_dedicado, prescricao_digital, entrega_gratis_acima, ordem) values
  ('FREE',    'Free',    0.00,   0.00,  0,  0, false, false, null, 1),
  ('BASIC',   'Basic',  29.90, 286.80,  0,  5, false, false, null, 2),
  ('PRO',     'Pro',    59.90, 574.80,  5, -1, true,  false, null, 3),
  ('PREMIUM', 'Premium',89.90, 862.80, 15, -1, true,  true,  30.00, 4);

insert into restricao_alimentar (slug, nome) values
  ('sem-lactose', 'Sem lactose'), ('sem-gluten', 'Sem glúten'), ('vegano', 'Vegano'),
  ('vegetariano', 'Vegetariano'), ('sem-frutos-do-mar', 'Sem frutos do mar'), ('low-carb', 'Low carb');

-- ---------- Usuários de demo (auth.users + auth.identities) ----------
create or replace function pg_temp.criar_usuario_demo(p_id uuid, p_email text, p_nome text) returns void language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
          crypt('CleanEats@2026', gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('nome', p_nome), now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, 'email',
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true), now(), now(), now());
end $$;

select pg_temp.criar_usuario_demo('00000000-0000-4000-8000-000000000001', 'cliente@cleaneats.test', 'Breno Filho');
select pg_temp.criar_usuario_demo('00000000-0000-4000-8000-000000000002', 'nutri@cleaneats.test', 'Dra. Ana Souza');
select pg_temp.criar_usuario_demo('00000000-0000-4000-8000-000000000003', 'restaurante@cleaneats.test', 'Sabor Natural');
select pg_temp.criar_usuario_demo('00000000-0000-4000-8000-000000000004', 'admin@cleaneats.test', 'Admin CleanEats');
-- donos dos demais restaurantes
select pg_temp.criar_usuario_demo('00000000-0000-4000-8000-000000000011', 'verdevida@cleaneats.test', 'Verde Vida');
select pg_temp.criar_usuario_demo('00000000-0000-4000-8000-000000000012', 'mareterra@cleaneats.test', 'Mar & Terra');
select pg_temp.criar_usuario_demo('00000000-0000-4000-8000-000000000013', 'fitfood@cleaneats.test', 'FitFood');
select pg_temp.criar_usuario_demo('00000000-0000-4000-8000-000000000014', 'acaiclub@cleaneats.test', 'Açaí Club');
select pg_temp.criar_usuario_demo('00000000-0000-4000-8000-000000000015', 'rotaproteica@cleaneats.test', 'Rota Proteica');

insert into usuario (id, nome, email, telefone, perfil, id_tier, aceite_termos_em, aceite_lgpd_em) values
  ('00000000-0000-4000-8000-000000000001', 'Breno Filho',     'cliente@cleaneats.test',      '(81) 90000-0001', 'CLIENTE',       'PRO',  now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'Dra. Ana Souza',  'nutri@cleaneats.test',        '(81) 90000-0002', 'NUTRICIONISTA', 'FREE', now(), now()),
  ('00000000-0000-4000-8000-000000000003', 'Sabor Natural',   'restaurante@cleaneats.test',  '(81) 90000-0003', 'RESTAURANTE',   'FREE', now(), now()),
  ('00000000-0000-4000-8000-000000000004', 'Admin CleanEats', 'admin@cleaneats.test',        null,              'ADMIN',         'FREE', now(), now()),
  ('00000000-0000-4000-8000-000000000011', 'Verde Vida',      'verdevida@cleaneats.test',    null, 'RESTAURANTE', 'FREE', now(), now()),
  ('00000000-0000-4000-8000-000000000012', 'Mar & Terra',     'mareterra@cleaneats.test',    null, 'RESTAURANTE', 'FREE', now(), now()),
  ('00000000-0000-4000-8000-000000000013', 'FitFood',         'fitfood@cleaneats.test',      null, 'RESTAURANTE', 'FREE', now(), now()),
  ('00000000-0000-4000-8000-000000000014', 'Açaí Club',       'acaiclub@cleaneats.test',     null, 'RESTAURANTE', 'FREE', now(), now()),
  ('00000000-0000-4000-8000-000000000015', 'Rota Proteica',   'rotaproteica@cleaneats.test', null, 'RESTAURANTE', 'FREE', now(), now());

-- ---------- Nutricionista (telas 26–35) ----------
insert into nutricionista (id, id_usuario, crn, crn_uf, especialidades, bio, anos_experiencia, disponibilidade, status_aprovacao, avaliado_por, avaliado_em, nota_media) values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000002', 'CRN-6 PE 12345/P', 'PE',
   array['Nutrição esportiva', 'Hipertrofia', 'Emagrecimento'],
   'Nutricionista esportiva em Recife, focada em planos práticos com pratos reais.', 8,
   '[{"dia":1,"inicio":"08:00","fim":"12:00"},{"dia":3,"inicio":"14:00","fim":"18:00"},{"dia":5,"inicio":"08:00","fim":"12:00"}]',
   'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.9);

-- ---------- Cliente Breno Filho (Pro, ganho de massa, sem lactose, 78 kg / 1,78 m) ----------
insert into perfil_cliente (id_usuario, objetivo_nutricional, sexo, peso_kg, altura_cm, nivel_atividade,
                            meta_calorias, meta_proteinas, meta_carboidratos, meta_gorduras, meta_fibras, meta_agua_ml, id_nutricionista) values
  ('00000000-0000-4000-8000-000000000001', 'GANHO_MASSA', 'M', 78.0, 178.0, 'INTENSO',
   2200, 140, 240, 70, 30, 3000, '00000000-0000-4000-9000-000000000001');
insert into cliente_restricao (id_usuario, id_restricao)
  select '00000000-0000-4000-8000-000000000001', id from restricao_alimentar where slug = 'sem-lactose';
insert into endereco (id_usuario, apelido, cep, logradouro, numero, bairro, cidade, uf, principal) values
  ('00000000-0000-4000-8000-000000000001', 'Casa', '52011000', 'Rua da Aurora', '100', 'Boa Vista', 'Recife', 'PE', true);
insert into assinatura (id_usuario, id_tier, ciclo, status, valor, inicio_em, renovacao_em) values
  ('00000000-0000-4000-8000-000000000001', 'PRO', 'MENSAL', 'ATIVA', 59.90, '2026-09-05', '2026-12-05');

-- ---------- Restaurantes (tela 13) ----------
insert into restaurante (id, id_usuario, nome, sigla, descricao, cnpj, tipos_cozinha, bairro, tempo_entrega_min, tempo_entrega_max, taxa_entrega,
                         status_aprovacao, avaliado_por, avaliado_em, nota_media, total_avaliacoes, destaque, capa_url) values
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-8000-000000000003', 'Sabor Natural', 'SN', 'Comida fitness com tempero natural, sem óleos refinados.', '11111111000101', array['Fitness','Saudável','Low Carb'], 'Boa Vista', 25, 35, 6.00, 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.9, 312, true,  '/img/pratos/frango-grelhado-fitness.jpg'),
  ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-8000-000000000011', 'Verde Vida',    'VV', 'Cozinha vegana e vegetariana de bowls coloridos.',          '22222222000102', array['Vegano','Vegetariano','Bowls'], 'Graças',     30, 45, 8.00, 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.8, 218, false, '/img/pratos/bowl-vegano-power.jpg'),
  ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-8000-000000000012', 'Mar & Terra',   'MT', 'Peixes e frutos do mar com acompanhamentos sem glúten.',    '33333333000103', array['Pescetariano','Saudável','Sem Glúten'], 'Boa Viagem', 35, 50, 10.00, 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.7, 156, false, '/img/pratos/salmao-com-quinoa.jpg'),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-8000-000000000013', 'FitFood',       'FF', 'Refeições práticas e leves para o dia a dia.',             '44444444000104', array['Fitness','Low Carb'], 'Derby', 20, 30, 0.00, 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.9, 201, true,  '/img/pratos/wrap-integral-light.jpg'),
  ('00000000-0000-4000-a000-000000000005', '00000000-0000-4000-8000-000000000014', 'Açaí Club',     'AC', 'Açaí e bowls proteicos.',                                  '55555555000105', array['Bowls','Vegano'], 'Espinheiro', 25, 40, 7.00, 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.6, 97, false, '/img/pratos/acai-proteico.jpg'),
  ('00000000-0000-4000-a000-000000000006', '00000000-0000-4000-8000-000000000015', 'Rota Proteica', 'RP', 'Marmitas de alta proteína sem glúten.',                    '66666666000106', array['Fitness','Sem Glúten'], 'Madalena', 30, 45, 8.00, 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.8, 140, false, '/img/pratos/steak-com-batata-doce.jpg');

-- Horários (seg–sáb 11:00–22:00; Rota Proteica abre às 18:00, como "Fechado · abre 18:00" na tela 13)
insert into horario_funcionamento (id_restaurante, dia_semana, abre, fecha)
  select r.id, d, case when r.sigla = 'RP' then '18:00'::time else '11:00'::time end, '22:00'::time
  from restaurante r cross join generate_series(1, 6) d;

-- ---------- Pratos (telas 10, 11, 12) — macros e preços iguais aos do HTML ----------
-- Cada prato abaixo traz um marcador [MACROS EXATOS] / [GORDURA DERIVADA] / [GORDURA ESTIMADA].
-- kcal, proteínas, carboidratos e preço vêm direto das telas 10, 11 e 12.
insert into marmita (id, id_restaurante, nome, descricao, categoria, imagem_url, preco, porcao_g, calorias, proteinas, carboidratos, gorduras, fibras, sodio_mg,
                     objetivos, status_prato, avaliado_por, avaliado_em, nota_media, total_avaliacoes, aprovado_por_nutri) values
  -- PRATO 1/7 [MACROS EXATOS] tela 12 mostra kcal, P, C, G (12 g), fibras (8 g) e sódio (480 mg).
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001', 'Frango Grelhado Fitness',
   'Filé de frango grelhado com batata doce assada, brócolis no vapor e arroz integral. Refeição completa, alta em proteínas, ideal para ganho de massa muscular. Tempero natural sem óleos refinados.',
   'Alta Proteína', '/img/pratos/frango-grelhado-fitness.jpg', 24.90, 350, 420, 38, 32, 12, 8, 480,
   array['GANHO_MASSA','EQUILIBRIO']::text[], 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.9, 312, true),
  -- PRATO 2/7 [GORDURA DERIVADA] 18 g P x 11%/24% da barra da tela 11 = 8 g — confirmar com o Verde Vida. Fibras e sódio dos pratos 2–7 também são estimados.
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000002', 'Bowl Vegano Power',
   'Bowl de grão-de-bico, quinoa, legumes assados e tahine.', 'Vegano', '/img/pratos/bowl-vegano-power.jpg', 22.90, 380, 380, 18, 52, 8, 11, 390,
   array['EMAGRECIMENTO','EQUILIBRIO']::text[], 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.8, 218, true),
  -- PRATO 3/7 [GORDURA DERIVADA] 35 g P x 26%/41% da barra da tela 11 = 22 g — confirmar com o Mar & Terra. Fibras e sódio dos pratos 2–7 também são estimados.
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000003', 'Salmão com Quinoa',
   'Salmão grelhado com quinoa e legumes no vapor.', 'Sem Glúten', '/img/pratos/salmao-com-quinoa.jpg', 32.90, 360, 480, 35, 28, 22, 6, 420,
   array['GANHO_MASSA','EQUILIBRIO']::text[], 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.9, 156, true),
  -- PRATO 4/7 [GORDURA DERIVADA] 42 g P x 18%/43% da barra da tela 11 = 18 g — confirmar com o Sabor Natural. Fibras e sódio dos pratos 2–7 também são estimados.
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000001', 'Steak com Batata Doce',
   'Steak de patinho grelhado com batata doce e salada verde.', 'Low Carb', '/img/pratos/steak-com-batata-doce.jpg', 28.90, 380, 520, 42, 38, 18, 7, 510,
   array['GANHO_MASSA']::text[], 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.7, 188, false),
  -- PRATO 5/7 [GORDURA DERIVADA] 25 g P x 10%/28% da barra da tela 11 = 9 g — confirmar com o Verde Vida. Fibras e sódio dos pratos 2–7 também são estimados.
  ('00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000002', 'Açaí Proteico',
   'Açaí com whey vegetal, banana e granola sem açúcar.', 'Vegano', '/img/pratos/acai-proteico.jpg', 18.90, 400, 350, 25, 42, 9, 6, 80,
   array['GANHO_MASSA','EQUILIBRIO']::text[], 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.8, 97, false),
  -- PRATO 6/7 [GORDURA DERIVADA] 22 g P x 18%/32% da barra da tela 11 = 12 g — confirmar com o FitFood. Fibras e sódio dos pratos 2–7 também são estimados.
  ('00000000-0000-4000-b000-000000000006', '00000000-0000-4000-a000-000000000004', 'Wrap Integral Light',
   'Wrap integral com frango desfiado, folhas e molho de iogurte sem lactose.', 'Low Carb', '/img/pratos/wrap-integral-light.jpg', 19.90, 280, 320, 22, 35, 12, 5, 450,
   array['EMAGRECIMENTO','EQUILIBRIO']::text[], 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.6, 74, false),
  -- PRATO 7/7 [GORDURA ESTIMADA] tela 10 não mostra gordura; (320 - 18x4 - 42x4) / 9 = 9 g — confirmar com o FitFood. Fibras e sódio dos pratos 2–7 também são estimados.
  ('00000000-0000-4000-b000-000000000007', '00000000-0000-4000-a000-000000000004', 'Tapioca com Ovo e Banana',
   'Tapioca com ovos mexidos e banana.', 'Café da manhã', null, 16.90, 250, 320, 18, 42, 9, 3, 260,
   array['EQUILIBRIO','GANHO_MASSA']::text[], 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.7, 40, false);

-- Ingredientes do Frango Grelhado Fitness (tela 12)
insert into ingrediente_marmita (id_marmita, nome, quantidade, preparo, ordem) values
  ('00000000-0000-4000-b000-000000000001', 'Filé de frango', '150g', 'grelhado', 1),
  ('00000000-0000-4000-b000-000000000001', 'Batata doce', '100g', 'assada', 2),
  ('00000000-0000-4000-b000-000000000001', 'Brócolis', '50g', 'vapor', 3),
  ('00000000-0000-4000-b000-000000000001', 'Arroz integral', '50g', 'cozido', 4),
  ('00000000-0000-4000-b000-000000000001', 'Azeite extra virgem', '5ml', null, 5),
  ('00000000-0000-4000-b000-000000000001', 'Ervas e especiarias', 'a gosto', null, 6);

-- Compatibilidades (CE-6): quais pratos atendem a cada restrição
insert into marmita_compatibilidade (id_marmita, id_restricao)
  select m.id, r.id from marmita m join restricao_alimentar r on
    (r.slug = 'sem-lactose' and m.nome in ('Frango Grelhado Fitness','Bowl Vegano Power','Salmão com Quinoa','Steak com Batata Doce','Açaí Proteico','Wrap Integral Light','Tapioca com Ovo e Banana'))
 or (r.slug = 'sem-gluten'  and m.nome in ('Frango Grelhado Fitness','Bowl Vegano Power','Salmão com Quinoa','Steak com Batata Doce','Açaí Proteico','Tapioca com Ovo e Banana'))
 or (r.slug = 'vegano'      and m.nome in ('Bowl Vegano Power','Açaí Proteico'))
 or (r.slug = 'vegetariano' and m.nome in ('Bowl Vegano Power','Açaí Proteico','Tapioca com Ovo e Banana'))
 or (r.slug = 'sem-frutos-do-mar' and m.nome <> 'Salmão com Quinoa')
 or (r.slug = 'low-carb'    and m.nome in ('Steak com Batata Doce','Wrap Integral Light'));
