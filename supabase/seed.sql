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
  ('sem-gluten', 'Sem glúten'), ('sem-lactose', 'Sem lactose'), ('vegetariano', 'Vegetariano'), ('vegano', 'Vegano'),
  ('low-carb', 'Low carb'), ('sem-oleaginosas', 'Alérgico a oleaginosas'), ('sem-frutos-do-mar', 'Sem frutos do mar'),
  ('sem-carne-suina', 'Sem carne suína');   -- mesma ordem da tela 05

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

-- ---------- Clientes (tela 28: 9 clientes da Dra. Ana · tela 34: 5 assinantes da Ana · tela 37: clientes do Sabor Natural) ----------
-- Metas dos clientes (exceto o Breno) são estimadas pela regra de bolso abaixo: a nutri ajusta na triagem.  -- macro a confirmar
create or replace function pg_temp.criar_cliente(p_n int, p_nome text, p_email text, p_tier text, p_objetivo text,
                                                 p_idade int, p_peso numeric, p_altura numeric, p_desde date, p_da_nutri boolean)
returns void language plpgsql as $$
declare v_id uuid := ('00000000-0000-4000-8000-0000000000' || lpad(p_n::text, 2, '0'))::uuid;
begin
  perform pg_temp.criar_usuario_demo(v_id, p_email, p_nome);
  insert into usuario (id, nome, email, perfil, id_tier, aceite_termos_em, aceite_lgpd_em, criado_em)
  values (v_id, p_nome, p_email, 'CLIENTE', p_tier, p_desde, p_desde, p_desde);
  insert into perfil_cliente (id_usuario, objetivo_nutricional, data_nascimento, peso_kg, altura_cm, nivel_atividade,
                              meta_calorias, meta_proteinas, meta_carboidratos, meta_gorduras, meta_fibras, meta_agua_ml, id_nutricionista)
  values (v_id, p_objetivo, case when p_idade is null then null else make_date(2026 - p_idade, 6, 15) end, p_peso, p_altura * 100,
          case when p_peso is null then null else 'MODERADO' end,
          case p_objetivo when 'EMAGRECIMENTO' then 1800 when 'GANHO_MASSA' then 2400 else 2000 end,
          round(coalesce(p_peso, 70) * case p_objetivo when 'GANHO_MASSA' then 1.8 else 1.5 end),
          case p_objetivo when 'EMAGRECIMENTO' then 180 when 'GANHO_MASSA' then 270 else 230 end,
          case p_objetivo when 'EMAGRECIMENTO' then 55 when 'GANHO_MASSA' then 75 else 65 end,
          30, round(coalesce(p_peso, 70) * 35),
          case when p_da_nutri then '00000000-0000-4000-9000-000000000001'::uuid end);
  if p_tier <> 'FREE' then
    insert into assinatura (id_usuario, id_tier, ciclo, status, valor, inicio_em, renovacao_em)
    select v_id, p_tier, 'MENSAL', 'ATIVA', t.preco_mensal, p_desde,
           (p_desde + ((date_part('month', age(current_date, p_desde))::int + 1) || ' months')::interval)
    from tier t where t.id = p_tier;
  end if;
end $$;

-- Tela 28 (idade · peso · altura · objetivo · tier · "Cliente desde")
select pg_temp.criar_cliente(21, 'Mariana Costa',   'mariana.costa@cleaneats.test',   'PREMIUM', 'EQUILIBRIO',    31, 62, 1.68, '2026-01-12', true);
select pg_temp.criar_cliente(22, 'Pedro Silva',     'pedro.silva@cleaneats.test',     'PRO',     'GANHO_MASSA',   28, 85, 1.80, '2026-03-04', true);
select pg_temp.criar_cliente(23, 'Juliana Sá',      'juliana.sa@cleaneats.test',      'PREMIUM', 'EMAGRECIMENTO', 34, 70, 1.65, '2026-02-18', true);
select pg_temp.criar_cliente(24, 'Lucas Andrade',   'lucas.andrade@cleaneats.test',   'PRO',     'GANHO_MASSA',   26, 75, 1.76, '2026-02-09', true);
select pg_temp.criar_cliente(25, 'Rafael Mendes',   'rafael.mendes@cleaneats.test',   'PRO',     'EMAGRECIMENTO', 30, 88, 1.82, '2026-03-21', true);
select pg_temp.criar_cliente(26, 'Thales Cunha',    'thales.cunha@cleaneats.test',    'PRO',     'EQUILIBRIO',    27, 72, 1.75, '2026-03-02', true);
-- ATENÇÃO: a tela 28 mostra a Fernanda Barros como Basic, mas o Basic não inclui nutricionista dedicada (tela 09).
-- Mantido como na tela; decidir com o time (ver docs/relatorio-seed.md).
select pg_temp.criar_cliente(27, 'Fernanda Barros', 'fernanda.barros@cleaneats.test', 'BASIC',   'EMAGRECIMENTO', 25, 58, 1.62, '2026-04-07', true);
select pg_temp.criar_cliente(28, 'Gabriela Nunes',  'gabriela.nunes@cleaneats.test',  'PRO',     'EQUILIBRIO',    32, 65, 1.70, '2026-03-15', true);
-- Tela 34 (transações da nutri) — também fazem pedidos no Sabor Natural (tela 37). Tiers da tela 34; preços da tela 09.
select pg_temp.criar_cliente(31, 'Maria Braga',      'maria.braga@cleaneats.test',      'PRO',     'EQUILIBRIO', null, null, null, '2026-04-18', true);
select pg_temp.criar_cliente(32, 'Carlos Jota',      'carlos.jota@cleaneats.test',      'PRO',     'EQUILIBRIO', null, null, null, '2026-04-17', true);
select pg_temp.criar_cliente(33, 'Lucia Silva',      'lucia.silva@cleaneats.test',      'PREMIUM', 'EQUILIBRIO', null, null, null, '2026-04-15', true);
select pg_temp.criar_cliente(34, 'Roberto Oliveira', 'roberto.oliveira@cleaneats.test', 'PRO',     'EQUILIBRIO', null, null, null, '2026-04-14', true);
select pg_temp.criar_cliente(35, 'Juliana Ferraz',   'juliana.ferraz@cleaneats.test',   'PREMIUM', 'EQUILIBRIO', null, null, null, '2026-04-12', true);
-- Tela 37 — clientes avulsos (Free)
select pg_temp.criar_cliente(36, 'Ana Torres',    'ana.torres@cleaneats.test',    'FREE', 'EQUILIBRIO', null, null, null, '2026-06-02', false);
select pg_temp.criar_cliente(37, 'Pedro Mendes',  'pedro.mendes@cleaneats.test',  'FREE', 'EQUILIBRIO', null, null, null, '2026-07-10', false);
select pg_temp.criar_cliente(38, 'Fernanda Lima', 'fernanda.lima@cleaneats.test', 'FREE', 'EQUILIBRIO', null, null, null, '2026-08-21', false);

-- ---------- Cliente Breno Filho (Pro, ganho de massa, sem lactose, 78 kg / 1,78 m, 23 anos, cliente desde fev/2026) ----------
update usuario set criado_em = '2026-02-03' where id = '00000000-0000-4000-8000-000000000001';
insert into perfil_cliente (id_usuario, objetivo_nutricional, sexo, data_nascimento, peso_kg, altura_cm, nivel_atividade,
                            meta_calorias, meta_proteinas, meta_carboidratos, meta_gorduras, meta_fibras, meta_agua_ml, id_nutricionista) values
  ('00000000-0000-4000-8000-000000000001', 'GANHO_MASSA', 'M', '2003-03-10', 78.0, 178.0, 'INTENSO',
   2200, 140, 240, 70, 30, 3000, '00000000-0000-4000-9000-000000000001');
insert into cliente_restricao (id_usuario, id_restricao)
  select '00000000-0000-4000-8000-000000000001', id from restricao_alimentar where slug = 'sem-lactose';
-- Endereços da tela 16
insert into endereco (id, id_usuario, apelido, cep, logradouro, numero, complemento, bairro, cidade, uf, principal) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-8000-000000000001', 'Casa', '51020040', 'Rua das Acácias', '245', 'Apto 302 · Ref.: ao lado do mercado', 'Boa Viagem', 'Recife', 'PE', true),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-8000-000000000001', 'Trabalho', '51111010', 'Av. Conselheiro Aguiar', '4250', 'Sala 1408', 'Boa Viagem', 'Recife', 'PE', false);
insert into assinatura (id_usuario, id_tier, ciclo, status, valor, inicio_em, renovacao_em) values
  ('00000000-0000-4000-8000-000000000001', 'PRO', 'MENSAL', 'ATIVA', 59.90, '2026-02-03',
   (date '2026-02-03' + ((date_part('month', age(current_date, date '2026-02-03'))::int + 1) || ' months')::interval));

-- ---------- Restaurantes (telas 13 e 14) ----------
insert into restaurante (id, id_usuario, nome, sigla, descricao, cnpj, tipos_cozinha, logradouro, numero, bairro, cep, tempo_entrega_min, tempo_entrega_max, taxa_entrega, pedido_minimo,
                         status_aprovacao, avaliado_por, avaliado_em, nota_media, total_avaliacoes, destaque, capa_url) values
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-8000-000000000003', 'Sabor Natural', 'SN', 'Marmitas saudáveis com proteína de qualidade e tempero da casa. Há 4 anos servindo refeições balanceadas em Recife com ingredientes frescos.', '11111111000101', array['Fitness','Saudável','Low Carb'], 'Av. Boa Viagem', '1820 · Loja 3', 'Boa Viagem', '50030000', 25, 35, 6.00, 25.00, 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.9, 312, true,  '/img/pratos/frango-grelhado-fitness.jpg'),
  ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-8000-000000000011', 'Verde Vida',    'VV', 'Cozinha vegana e vegetariana de bowls coloridos.',          '22222222000102', array['Vegano','Vegetariano','Bowls'], null, null, 'Graças',     null, 30, 45, 8.00, 0, 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.8, 218, false, '/img/pratos/bowl-vegano-power.jpg'),
  ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-8000-000000000012', 'Mar & Terra',   'MT', 'Peixes e frutos do mar com acompanhamentos sem glúten.',    '33333333000103', array['Pescetariano','Saudável','Sem Glúten'], null, null, 'Boa Viagem', null, 35, 50, 10.00, 0, 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.7, 156, false, '/img/pratos/salmao-com-quinoa.jpg'),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-8000-000000000013', 'FitFood',       'FF', 'Refeições práticas e leves para o dia a dia.',             '44444444000104', array['Fitness','Low Carb'], null, null, 'Derby', null, 20, 30, 0.00, 0, 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.9, 201, true,  '/img/pratos/wrap-integral-light.jpg'),
  ('00000000-0000-4000-a000-000000000005', '00000000-0000-4000-8000-000000000014', 'Açaí Club',     'AC', 'Açaí e bowls proteicos.',                                  '55555555000105', array['Bowls','Vegano'], null, null, 'Espinheiro', null, 25, 40, 7.00, 0, 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.6, 97, false, '/img/pratos/acai-proteico.jpg'),
  ('00000000-0000-4000-a000-000000000006', '00000000-0000-4000-8000-000000000015', 'Rota Proteica', 'RP', 'Marmitas de alta proteína sem glúten.',                    '66666666000106', array['Fitness','Sem Glúten'], null, null, 'Madalena', null, 30, 45, 8.00, 0, 'APROVADO', '00000000-0000-4000-8000-000000000004', now(), 4.8, 140, false, '/img/pratos/marmita-bulking.jpg');

-- Horários: Sabor Natural como na tela 14 (seg–qui 08–22, sex 08–23, sáb 11–22, dom fechado);
-- demais seg–sáb 11–22; Rota Proteica abre às 18:00 ("Fechado · abre 18:00" na tela 13)
insert into horario_funcionamento (id_restaurante, dia_semana, abre, fecha) values
  ('00000000-0000-4000-a000-000000000001', 1, '08:00', '22:00'), ('00000000-0000-4000-a000-000000000001', 2, '08:00', '22:00'),
  ('00000000-0000-4000-a000-000000000001', 3, '08:00', '22:00'), ('00000000-0000-4000-a000-000000000001', 4, '08:00', '22:00'),
  ('00000000-0000-4000-a000-000000000001', 5, '08:00', '23:00'), ('00000000-0000-4000-a000-000000000001', 6, '11:00', '22:00');
insert into horario_funcionamento (id_restaurante, dia_semana, abre, fecha)
  select r.id, d, case when r.sigla = 'RP' then '18:00'::time else '11:00'::time end, '22:00'::time
  from restaurante r cross join generate_series(1, 6) d where r.sigla <> 'SN';

-- ---------- Pratos: TODOS os que aparecem nos HTMLs (telas 10, 11, 12, 14, 16, 18, 19, 24, 31, 37, 38, 40) ----------
-- Regra de conflito entre telas: kcal, P, C e preço das telas do CLIENTE (10/11/12/14) > catálogo da nutri (31) > painel do restaurante (37/38/40).
-- Gordura: valor explícito da tela 12 ou 31; sem valor na tela → estimada pelo balanço (kcal − 4P − 4C) / 9 e marcada "-- macro a confirmar".
-- Fibras e sódio só existem na tela 12 (Frango); nos demais são estimados ("-- macro a confirmar").
-- Fotos: as mesmas das telas, baixadas para frontend/public/img/pratos (sem hotlink).
create or replace function pg_temp.prato(p_n int, p_rest int, p_nome text, p_desc text, p_cat text, p_img text, p_preco numeric, p_porcao int,
                                         p_kcal int, p_p numeric, p_c numeric, p_g numeric, p_fibras numeric, p_sodio int,
                                         p_objetivos text[], p_status text default 'APROVADO', p_motivo text default null,
                                         p_nota numeric default 4.7, p_total int default 40, p_selo boolean default false)
returns void language sql as $$
  insert into marmita (id, id_restaurante, nome, descricao, categoria, imagem_url, preco, porcao_g, calorias, proteinas, carboidratos, gorduras,
                       fibras, sodio_mg, objetivos, status_prato, motivo_rejeicao, avaliado_por, avaliado_em, nota_media, total_avaliacoes, aprovado_por_nutri)
  values (('00000000-0000-4000-b000-0000000000' || lpad(p_n::text, 2, '0'))::uuid,
          ('00000000-0000-4000-a000-00000000000' || p_rest)::uuid,
          p_nome, p_desc, p_cat, case when p_img is null then null else '/img/pratos/' || p_img || '.jpg' end, p_preco, p_porcao,
          p_kcal, p_p, p_c, p_g, p_fibras, p_sodio, p_objetivos, p_status, p_motivo,
          case when p_status in ('APROVADO', 'REJEITADO') then '00000000-0000-4000-8000-000000000004'::uuid end,
          case when p_status in ('APROVADO', 'REJEITADO') then now() - interval '10 days' end,
          p_nota, p_total, p_selo)
$$;
-- restaurantes: 1 Sabor Natural · 2 Verde Vida · 3 Mar & Terra · 4 FitFood · 5 Açaí Club · 6 Rota Proteica

-- ===== Os 7 pratos do núcleo (mesmos UUIDs b000-…01 a …07) =====
-- PRATO 1/7 [MACROS EXATOS] tela 12: kcal, P, C, G (12 g), fibras (8 g) e sódio (480 mg).
select pg_temp.prato(1, 1, 'Frango Grelhado Fitness', 'Filé de frango grelhado com batata doce assada, brócolis no vapor e arroz integral. Refeição completa, alta em proteínas, ideal para ganho de massa muscular. Tempero natural sem óleos refinados.',
  'Alta Proteína', 'frango-grelhado-fitness', 24.90, 350, 420, 38, 32, 12, 8, 480, array['GANHO_MASSA','EQUILIBRIO'], 'APROVADO', null, 4.9, 312, true);
-- PRATO 2/7 [GORDURA DA TELA 31] tela 31 chama de "Bowl Vegano com Grão-de-bico" (mesmos macros). Fibras/sódio -- macro a confirmar
select pg_temp.prato(2, 2, 'Bowl Vegano Power', 'Bowl de grão-de-bico, quinoa, legumes assados e tahine.',
  'Vegano', 'bowl-vegano-power', 22.90, 380, 380, 18, 52, 9, 11, 390, array['EMAGRECIMENTO','EQUILIBRIO'], 'APROVADO', null, 4.8, 218, true);
-- PRATO 3/7 [GORDURA DA TELA 31] 18 g (substitui os 22 g derivados antes). Fibras/sódio -- macro a confirmar
select pg_temp.prato(3, 3, 'Salmão com Quinoa', 'Salmão grelhado ao limão, quinoa real, aspargos e abacate. Rico em ômega-3.',
  'Sem Glúten', 'salmao-com-quinoa', 32.90, 360, 480, 35, 28, 18, 6, 420, array['GANHO_MASSA','EQUILIBRIO'], 'APROVADO', null, 4.9, 156, true);
-- PRATO 4/7 [GORDURA DA TELA 31] 22 g. CONFLITOS: tela 31 mostra 560 kcal, tela 14 mostra 28 g de carboidrato — valem 520 kcal / 38 g da tela 11. Fibras/sódio -- macro a confirmar
select pg_temp.prato(4, 1, 'Steak com Batata Doce', 'Filé mignon ao ponto, batata doce caramelizada, salada de folhas e molho da casa.',
  'Low Carb', 'steak-com-batata-doce', 28.90, 380, 520, 42, 38, 22, 7, 510, array['GANHO_MASSA'], 'APROVADO', null, 4.7, 188, false);
-- PRATO 5/7 [GORDURA DA TELA 31] 6 g (o balanço calórico daria ~9 g). Fibras/sódio -- macro a confirmar
select pg_temp.prato(5, 2, 'Açaí Proteico', '300ml com 1 scoop de whey isolado baunilha (zero lactose) + granola sem açúcar. Pré-treino ideal.',
  'Vegano', 'acai-proteico', 18.90, 400, 350, 25, 42, 6, 6, 80, array['GANHO_MASSA','EQUILIBRIO'], 'APROVADO', null, 4.8, 97, false);
-- PRATO 6/7 [GORDURA DERIVADA] 22 g P × 18%/32% da barra da tela 11 = 12 g -- macro a confirmar
select pg_temp.prato(6, 4, 'Wrap Integral Light', 'Wrap integral com frango desfiado, folhas e molho de iogurte sem lactose.',
  'Low Carb', 'wrap-integral-light', 19.90, 280, 320, 22, 35, 12, 5, 450, array['EMAGRECIMENTO','EQUILIBRIO'], 'APROVADO', null, 4.6, 74, false);
-- PRATO 7/7 [GORDURA DA TELA 31] 8 g (substitui a estimativa de 9 g). Tela 12 chama de "Tapioca com Ovo". Fibras/sódio -- macro a confirmar
select pg_temp.prato(7, 4, 'Tapioca com Ovo e Banana', 'Tapioca integral com ovos mexidos e banana inteira pra energia matinal.',
  'Café da manhã', 'tapioca-com-ovo-e-banana', 16.90, 250, 320, 18, 42, 8, 3, 260, array['EQUILIBRIO','GANHO_MASSA'], 'APROVADO', null, 4.7, 40, false);

-- ===== Sabor Natural (telas 14, 16/18, 37, 38, 40 — "Sabor & Saúde" no painel virou Sabor Natural) =====
-- Tela 14 também lista o Salmão com Quinoa no Sabor Natural: prato próprio, mesmos macros da tela 11/31.
select pg_temp.prato(8, 1, 'Salmão com Quinoa', 'Salmão grelhado ao limão, quinoa real, aspargos e abacate. Rico em ômega-3.',
  'Sem Glúten', 'salmao-com-quinoa', 32.90, 360, 480, 35, 28, 18, 6, 420, array['GANHO_MASSA','EQUILIBRIO'], 'APROVADO', null, 4.8, 61, true);
-- Tela 14 (vendido como "Wrap Integral" nas telas 37). Gordura (380 − 112 − 120)/9 = 16 g -- macro a confirmar
select pg_temp.prato(9, 1, 'Wrap Integral de Frango', 'Wrap integral recheado com frango desfiado, alface, tomate, cenoura e iogurte natural.',
  'Light', 'wrap-integral-light', 19.90, 300, 380, 28, 30, 16, 5, 430, array['EMAGRECIMENTO','EQUILIBRIO'], 'APROVADO', null, 4.7, 52, false);
-- Tela 14. CONFLITO: telas 38/40 mostram R$ 34,90 · 380 kcal · "Vegetariano" (mas leva frango) — vale a tela 14. Gordura 20 g -- macro a confirmar
select pg_temp.prato(10, 1, 'Bowl Mediterrâneo', 'Quinoa, frango desfiado, tomate cereja, pepino, azeitonas, queijo feta e molho de iogurte.',
  'Bowl', 'bowl-mediterraneo', 26.90, 380, 440, 32, 34, 20, 7, 520, array['EQUILIBRIO'], 'APROVADO', null, 4.8, 35, false);
-- Tela 14. Gordura (380 − 136 − 104)/9 = 16 g -- macro a confirmar
select pg_temp.prato(11, 1, 'Tilápia com Legumes', 'Filé de tilápia grelhada com mix de legumes salteados e batata baroa em cubinhos.',
  'Almoço', 'tilapia-com-legumes', 27.90, 360, 380, 34, 26, 16, 6, 400, array['EMAGRECIMENTO','EQUILIBRIO'], 'APROVADO', null, 4.7, 44, false);
-- Tela 14. Gordura (460 − 144 − 120)/9 = 22 g -- macro a confirmar
select pg_temp.prato(12, 1, 'Carne Magra com Purê', 'Patinho grelhado em iscas com purê de mandioquinha e legumes coloridos.',
  'Almoço', 'carne-magra', 25.90, 380, 460, 36, 30, 22, 5, 480, array['GANHO_MASSA','EQUILIBRIO'], 'APROVADO', null, 4.7, 58, false);
-- Tela 14. Gordura (320 − 160 − 32)/9 = 14 g -- macro a confirmar
select pg_temp.prato(13, 1, 'Omelete Proteico', 'Omelete de 4 claras + 1 ovo inteiro, peito de peru, queijo branco e folhas verdes.',
  'Linha Fit', 'omelete', 21.90, 280, 320, 40, 8, 14, 3, 520, array['EMAGRECIMENTO','GANHO_MASSA'], 'APROVADO', null, 4.6, 29, false);
-- Tela 14 (carboidrato 80 g; a versão do Rota Proteica na tela 31 tem 68 g). Gordura (720 − 220 − 320)/9 = 20 g -- macro a confirmar
select pg_temp.prato(14, 1, 'Marmita Bulking 800g', 'Porção grande: 200g de frango, 150g de arroz, 100g de feijão, batata doce e legumes.',
  'Linha Fit', 'marmita-bulking', 34.90, 800, 720, 55, 80, 20, 12, 760, array['GANHO_MASSA'], 'APROVADO', null, 4.8, 66, false);
-- Telas 37/38/40: só kcal e preço na tela; P/C/G estimados -- macro a confirmar
select pg_temp.prato(15, 1, 'Bowl Proteico Frango', 'Bowl de frango grelhado, arroz integral, feijão fradinho e legumes.',
  'Bowl', 'bowl-vegano-power', 32.90, 400, 420, 40, 36, 13, 6, 460, array['GANHO_MASSA','EQUILIBRIO'], 'APROVADO', null, 4.8, 48, false);
-- Tela 38/40 R$ 38,90 · 450 kcal (o pedido #1041 da tela 37 mostra R$ 32,90). Tela 40 mostra "Em análise", mas a 37/38 mostram o prato vendido e ativo → APROVADO. -- macro a confirmar
select pg_temp.prato(16, 1, 'Marmita Fit Salmão', 'Salmão grelhado, arroz negro e legumes no vapor. Fonte de ômega-3.',
  'Marmita', 'marmita-fit-salmao', 38.90, 380, 450, 34, 30, 21, 5, 410, array['EQUILIBRIO','GANHO_MASSA'], 'APROVADO', null, 4.8, 28, false);
-- Telas 38/40: R$ 36,90 · 350 kcal -- macro a confirmar
select pg_temp.prato(17, 1, 'Marmita Low Carb', 'Frango, abobrinha, brócolis e couve-flor gratinada. Baixo carboidrato.',
  'Marmita', 'marmita-low-carb', 36.90, 350, 350, 35, 12, 18, 6, 430, array['EMAGRECIMENTO'], 'APROVADO', null, 4.7, 22, false);
-- Telas 38/40: R$ 29,90 · 320 kcal -- macro a confirmar
select pg_temp.prato(18, 1, 'Bowl Vegano', 'Grão-de-bico, quinoa, legumes assados e homus.',
  'Bowl', 'bowl-vegano', 29.90, 350, 320, 14, 44, 10, 10, 350, array['EMAGRECIMENTO','EQUILIBRIO'], 'APROVADO', null, 4.6, 18, false);
-- Tela 40: "Sopa Detox Premium" REJEITADA ("Informação nutricional incompleta"); tela 38 lista "Sopa Detox" inativa → mesmo prato. -- macro a confirmar
select pg_temp.prato(19, 1, 'Sopa Detox Premium', 'Sopa de legumes verdes com gengibre.',
  'Sopa', 'sopa-detox', 24.90, 400, 180, 8, 22, 6, 7, 620, array['EMAGRECIMENTO'], 'REJEITADO', 'Informação nutricional incompleta', 0, 0, false);
-- Tela 40: "Wrap Integral Frango" R$ 28,90 · 390 kcal EM ANÁLISE. P/C/G iguais ao "Wrap Integral de Frango" da tela 31. -- macro a confirmar
select pg_temp.prato(20, 1, 'Wrap Integral Frango', 'Nova versão do wrap integral com frango desfiado e molho de iogurte.',
  'Wrap', 'wrap-integral-frango', 28.90, 320, 390, 28, 36, 14, 5, 440, array['EQUILIBRIO'], 'EM_ANALISE', null, 0, 0, false);
-- Tela 40 "Açaí Fit Proteico" R$ 22,90 · 280 kcal (vendido como "Açaí Fit" na tela 37) -- macro a confirmar
select pg_temp.prato(21, 1, 'Açaí Fit Proteico', 'Açaí sem açúcar com proteína vegetal e frutas vermelhas.',
  'Sobremesa', 'acai-fit-proteico', 22.90, 300, 280, 20, 30, 8, 5, 60, array['EQUILIBRIO','GANHO_MASSA'], 'APROVADO', null, 4.7, 31, false);
-- Bebidas da tela 37 (categoria "Sucos" da tela 38). Preço do Suco Verde = 54,80 − 32,90 (pedido #1042); Suco Natural = 48,80 − 29,90 (#1038).
-- Água de Coco: preço e macros sem fonte na tela. -- macro a confirmar / preço a confirmar
select pg_temp.prato(22, 1, 'Suco Verde Detox', 'Couve, maçã verde, gengibre e limão.', 'Sucos', null, 21.90, 400, 120, 2, 26, 1, 3, 30, array['EMAGRECIMENTO','EQUILIBRIO'], 'APROVADO', null, 4.6, 20, false);
select pg_temp.prato(23, 1, 'Água de Coco', 'Água de coco natural 500ml.', 'Sucos', null, 9.90, 500, 90, 1, 21, 0, 0, 120, array['EQUILIBRIO'], 'APROVADO', null, 4.8, 12, false);
select pg_temp.prato(24, 1, 'Suco Natural', 'Suco de laranja ou abacaxi com hortelã, sem açúcar.', 'Sucos', null, 18.90, 400, 110, 1, 26, 0, 1, 10, array['EQUILIBRIO'], 'APROVADO', null, 4.5, 9, false);
-- Tela 37 (#1037: 2x = R$ 65,80) -- macro a confirmar
select pg_temp.prato(25, 1, 'Marmita Fit Frango', 'Frango grelhado, arroz integral, feijão e salada. Sem glúten.',
  'Marmita', 'frango-grelhado-fitness', 32.90, 380, 420, 40, 38, 12, 7, 470, array['GANHO_MASSA','EQUILIBRIO'], 'APROVADO', null, 4.7, 26, false);
-- Tela 37 (#1036 R$ 38,90) -- macro a confirmar
select pg_temp.prato(26, 1, 'Bowl Proteico Carne', 'Iscas de patinho, arroz integral, feijão preto e legumes.',
  'Bowl', 'carne-magra', 38.90, 420, 480, 42, 36, 18, 6, 520, array['GANHO_MASSA'], 'APROVADO', null, 4.8, 19, false);
-- Telas 16/18/19: o pedido CE-4823 é do Sabor Natural com Açaí e Tapioca → o Sabor Natural também vende os dois (mesmos macros das telas 11/31).
select pg_temp.prato(27, 1, 'Açaí Proteico', '300ml com 1 scoop de whey isolado baunilha (zero lactose) + granola sem açúcar. Pré-treino ideal.',
  'Sobremesa', 'acai-proteico', 18.90, 400, 350, 25, 42, 6, 6, 80, array['GANHO_MASSA','EQUILIBRIO'], 'APROVADO', null, 4.8, 54, false);
select pg_temp.prato(28, 1, 'Tapioca com Ovo e Banana', 'Tapioca integral com ovos mexidos e banana inteira pra energia matinal.',
  'Café da manhã', 'tapioca-com-ovo-e-banana', 16.90, 250, 320, 18, 42, 8, 3, 260, array['EQUILIBRIO','GANHO_MASSA'], 'APROVADO', null, 4.7, 47, false);

-- ===== Mar & Terra (tela 31). Preço sem fonte na tela. -- preço a confirmar
select pg_temp.prato(29, 3, 'Tilápia Grelhada com Legumes', 'Tilápia grelhada com legumes salteados no azeite.',
  'Sem Glúten', 'tilapia-com-legumes', 29.90, 360, 370, 36, 22, 12, 6, 390, array['EMAGRECIMENTO','EQUILIBRIO'], 'APROVADO', null, 4.7, 33, true);
-- ===== Verde Vida (tela 31). -- preço a confirmar
select pg_temp.prato(30, 2, 'Salada Caesar com Frango', 'Alface romana, frango grelhado, croutons integrais e molho caesar light.',
  'Saladas', 'salada-caesar', 24.90, 320, 340, 32, 12, 18, 4, 610, array['EMAGRECIMENTO','EQUILIBRIO'], 'APROVADO', null, 4.6, 27, false);
-- ===== FitFood (tela 31: "Wrap Integral de Frango" 390 kcal, diferente do wrap do Sabor Natural). -- preço a confirmar
select pg_temp.prato(31, 4, 'Wrap Integral de Frango', 'Wrap integral com frango desfiado, folhas e molho de iogurte.',
  'Low Carb', 'wrap-integral-frango', 28.90, 320, 390, 28, 36, 14, 5, 440, array['EQUILIBRIO'], 'APROVADO', null, 4.6, 38, false);
select pg_temp.prato(32, 4, 'Omelete de Claras com Espinafre', 'Omelete de claras com espinafre refogado e tomate.',
  'Café da manhã', 'omelete', 19.90, 250, 280, 32, 8, 14, 3, 380, array['EMAGRECIMENTO','GANHO_MASSA'], 'APROVADO', null, 4.7, 30, false);
-- ===== Açaí Club (tela 31 lista o Açaí Proteico no Açaí Club; tela 19 tem "Açaí 500ml + Whey + Granola" R$ 28,50 · 520 kcal · 32 g P)
select pg_temp.prato(33, 5, 'Açaí Proteico', '300ml com 1 scoop de whey isolado baunilha (zero lactose) + granola sem açúcar.',
  'Açaí', 'acai-proteico', 18.90, 400, 350, 25, 42, 6, 6, 80, array['GANHO_MASSA','EQUILIBRIO'], 'APROVADO', null, 4.6, 51, false);
-- carboidrato e gordura estimados -- macro a confirmar
select pg_temp.prato(34, 5, 'Açaí 500ml com Whey e Granola', 'Açaí 500ml, 1 scoop de whey e granola sem açúcar.',
  'Açaí', 'acai-proteico', 28.50, 550, 520, 32, 62, 14, 8, 90, array['GANHO_MASSA'], 'APROVADO', null, 4.6, 46, false);
-- ===== Rota Proteica (tela 31; Marmita Bulking também na tela 19, R$ 34,90). -- preço a confirmar (Carne Magra)
select pg_temp.prato(35, 6, 'Carne Magra com Arroz Integral', 'Patinho grelhado, arroz integral, feijão e legumes.',
  'Fitness', 'carne-magra', 27.90, 400, 510, 45, 42, 16, 7, 500, array['GANHO_MASSA','EQUILIBRIO'], 'APROVADO', null, 4.8, 62, false);
select pg_temp.prato(36, 6, 'Marmita Bulking 800g', 'Porção grande de frango, arroz, feijão, batata doce e legumes.',
  'Fitness', 'marmita-bulking', 34.90, 800, 720, 55, 68, 22, 11, 740, array['GANHO_MASSA'], 'APROVADO', null, 4.8, 78, false);

-- Ingredientes do Frango Grelhado Fitness (tela 12). Os demais: seeds/frente-c.sql
insert into ingrediente_marmita (id_marmita, nome, quantidade, preparo, ordem) values
  ('00000000-0000-4000-b000-000000000001', 'Filé de frango', '150g', 'grelhado', 1),
  ('00000000-0000-4000-b000-000000000001', 'Batata doce', '100g', 'assada', 2),
  ('00000000-0000-4000-b000-000000000001', 'Brócolis', '50g', 'vapor', 3),
  ('00000000-0000-4000-b000-000000000001', 'Arroz integral', '50g', 'cozido', 4),
  ('00000000-0000-4000-b000-000000000001', 'Azeite extra virgem', '5ml', null, 5),
  ('00000000-0000-4000-b000-000000000001', 'Ervas e especiarias', 'a gosto', null, 6);

-- Compatibilidades (CE-6) por palavra-chave do nome/descrição; ajuste fino em seeds/frente-c.sql
insert into marmita_compatibilidade (id_marmita, id_restricao)
  select m.id, r.id from marmita m join restricao_alimentar r on
    (r.slug = 'sem-lactose'  and m.descricao !~* '(queijo|feta|cottage|iogurte natural|gratinad)' and not (m.descricao ~* 'whey' and m.descricao !~* 'zero lactose'))
 or (r.slug = 'sem-gluten'   and m.descricao !~* '(wrap|crouton|granola|tapioca)' and m.nome !~* 'wrap')
 or (r.slug = 'vegano'       and m.descricao !~* '(whey|ovo|frango|queijo|iogurte)' and (m.categoria = 'Vegano' or m.nome in ('Bowl Vegano', 'Suco Verde Detox', 'Suco Natural', 'Água de Coco')))
 or (r.slug = 'vegetariano'  and m.descricao !~* '(frango|salmão|patinho|carne|tilápia|filé|peru|peixe)' and m.nome !~* '(frango|salmão|carne|steak|tilápia|bulking)')
 or (r.slug = 'sem-frutos-do-mar' and m.nome !~* '(salmão|tilápia)')
 or (r.slug = 'low-carb'     and m.carboidratos <= 15)
 or (r.slug = 'sem-oleaginosas' and m.descricao !~* '(granola|castanha|amêndoa|amendoim|nozes|tahine)')
 or (r.slug = 'sem-carne-suina' and m.descricao !~* '(porco|suín|bacon|lombo|linguiça|presunto)');

-- ---------- Pedidos (telas 19 e 37) ----------
-- Datas RELATIVAS ao momento do seed (o "hoje" da tela vira o dia da demo). Totais iguais às telas:
-- a diferença entre a soma dos itens e o total mostrado vira taxa de entrega (se positiva) ou desconto (se negativa).
-- O trigger de histórico fica desligado durante a carga; o histórico de status é gravado explicitamente.
alter table pedido disable trigger trg_pedido_status;

create or replace function pg_temp.pedido(p_codigo text, p_cliente int, p_rest int, p_status text, p_criado timestamptz,
                                          p_endereco int default null, p_obs text default null, p_motivo text default null)
returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid(); v_com numeric;
begin
  select comissao_percentual into v_com from restaurante where id = ('00000000-0000-4000-a000-00000000000' || p_rest)::uuid;
  insert into pedido (id, codigo, id_usuario, id_restaurante, id_endereco, status, subtotal, total, comissao_percentual, valor_comissao,
                      forma_pagamento, observacao, motivo_recusa, confirmado_em, criado_em, atualizado_em, entregue_em)
  values (v_id, p_codigo, ('00000000-0000-4000-8000-0000000000' || lpad(p_cliente::text, 2, '0'))::uuid,
          ('00000000-0000-4000-a000-00000000000' || p_rest)::uuid,
          case when p_endereco is null then null else ('00000000-0000-4000-c000-00000000000' || p_endereco)::uuid end,
          p_status, 0, 0, v_com, 0, 'PIX', p_obs, p_motivo, p_criado, p_criado, p_criado,
          case when p_status = 'ENTREGUE' then p_criado + interval '40 min' end);
  return v_id;
end $$;

-- item com snapshot do prato (preço pode ser sobrescrito: preço da época do pedido)
create or replace function pg_temp.item(p_pedido uuid, p_prato int, p_qtd int default 1, p_preco numeric default null, p_obs text default null)
returns void language sql as $$
  insert into item_pedido (id_pedido, id_marmita, nome, quantidade, preco_unitario, calorias, proteinas, carboidratos, gorduras, personalizacao)
  select p_pedido, m.id, m.nome, p_qtd, coalesce(p_preco, m.preco), m.calorias, m.proteinas, m.carboidratos, m.gorduras,
         case when p_obs is null then null else jsonb_build_object('observacao', p_obs) end
  from marmita m where m.id = ('00000000-0000-4000-b000-0000000000' || lpad(p_prato::text, 2, '0'))::uuid
$$;

-- fecha valores: total da tela (ou soma + taxa do restaurante) e comissão congelada sobre produtos − desconto
create or replace function pg_temp.fechar(p_pedido uuid, p_total_tela numeric default null, p_taxa numeric default null) returns void language plpgsql as $$
declare v_sub numeric; v_taxa numeric; v_desc numeric := 0; v_total numeric;
begin
  select sum(preco_unitario * quantidade) into v_sub from item_pedido where id_pedido = p_pedido;
  if p_total_tela is null then
    select r.taxa_entrega into v_taxa from pedido p join restaurante r on r.id = p.id_restaurante where p.id = p_pedido;
    v_total := v_sub + v_taxa;
  elsif p_taxa is not null then
    v_taxa := p_taxa;                                  -- taxa da tela; o resto vira desconto (cupom + desconto do tier)
    v_desc := v_sub + p_taxa - p_total_tela;
    v_total := p_total_tela;
  else
    v_taxa := greatest(p_total_tela - v_sub, 0);
    v_desc := greatest(v_sub - p_total_tela, 0);
    v_total := p_total_tela;
  end if;
  update pedido set subtotal = v_sub, desconto = v_desc, taxa_entrega = v_taxa, total = v_total,
                    valor_comissao = round((v_sub - v_desc) * comissao_percentual / 100, 2)
  where id = p_pedido;
end $$;

-- histórico: lista de status com minutos depois da criação
create or replace function pg_temp.historico(p_pedido uuid, p_status text[], p_minutos int[]) returns void language sql as $$
  insert into historico_status_pedido (id_pedido, status, em)
  select p_pedido, s, p.criado_em + make_interval(mins => m)
  from pedido p, unnest(p_status, p_minutos) as u(s, m) where p.id = p_pedido
$$;

do $$
declare v uuid; hoje timestamptz := date_trunc('minute', now());
begin
  -- ===== Tela 19 — pedidos explícitos do Breno (cliente 01) =====
  -- CE-4823 EM ANDAMENTO (telas 16/18/19): confirmado há 35 min; "a caminho" com o entregador simulado Carlos Eduardo.
  -- Total pago R$ 75,87 (tela 18). Itens da tela 16: Frango porção média + ovo (R$ 26,90), Açaí 300ml, Tapioca integral 2x; cupom NUTRI15.
  -- ATENÇÃO: a tela 19 mostra 119 g de proteína, mas os itens somam 99 g; o app soma os itens.
  v := pg_temp.pedido('CE-4823', 1, 1, 'A_CAMINHO', hoje - interval '35 min', 1, 'Cupom NUTRI15');
  perform pg_temp.item(v, 1, 1, 26.90, 'Porção média + Ovo cozido');
  perform pg_temp.item(v, 27, 1, null, '300ml + whey baunilha + granola');
  perform pg_temp.item(v, 28, 2, null, 'Tapioca integral');
  perform pg_temp.fechar(v, 75.87, 6.00);   -- taxa R$ 6,00 (tela 16); desconto = cupom NUTRI15 R$ 8,15 + 5% Pro
  update pedido set entregador_nome = 'Carlos Eduardo', previsao_entrega_em = hoje + interval '8 min' where id = v;
  perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO'], array[0,1,7,25,27]);

  v := pg_temp.pedido('CE-4756', 1, 2, 'ENTREGUE', hoje - interval '4 days' - interval '2 h', 1);
  perform pg_temp.item(v, 2); perform pg_temp.item(v, 5); perform pg_temp.fechar(v, 41.80);
  perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO','ENTREGUE'], array[0,2,6,20,24,40]);

  v := pg_temp.pedido('CE-4701', 1, 3, 'ENTREGUE', hoje - interval '8 days' + interval '5 h', 1);
  perform pg_temp.item(v, 3); perform pg_temp.fechar(v, 32.90);
  perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO','ENTREGUE'], array[0,3,8,25,28,45]);

  -- CE-4612 "Wrap, Tapioca, Frango... +1": FitFood não vende frango; itens que somam ~1.620 kcal / ~128 g P da tela
  v := pg_temp.pedido('CE-4612', 1, 4, 'ENTREGUE', hoje - interval '16 days' - interval '1 h', 2);
  perform pg_temp.item(v, 6, 2); perform pg_temp.item(v, 7); perform pg_temp.item(v, 31); perform pg_temp.item(v, 32);
  perform pg_temp.fechar(v, 89.40);
  perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO','ENTREGUE'], array[0,2,6,18,21,35]);

  v := pg_temp.pedido('CE-4554', 1, 1, 'ENTREGUE', hoje - interval '22 days' - interval '2 h', 2);
  perform pg_temp.item(v, 4); perform pg_temp.item(v, 27); perform pg_temp.fechar(v, 47.80);
  perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO','ENTREGUE'], array[0,2,7,22,25,41]);

  v := pg_temp.pedido('CE-4488', 1, 6, 'CANCELADO', hoje - interval '29 days' + interval '6 h', 1, null, 'Restaurante fechado · reembolsado');
  perform pg_temp.item(v, 36); perform pg_temp.fechar(v, 34.90);
  perform pg_temp.historico(v, array['NOVO','CANCELADO'], array[0,6]);

  v := pg_temp.pedido('CE-4321', 1, 5, 'ENTREGUE', hoje - interval '54 days' - interval '2 h', 2);
  perform pg_temp.item(v, 34); perform pg_temp.fechar(v, 28.50);
  perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO','ENTREGUE'], array[0,2,5,12,15,33]);

  v := pg_temp.pedido('CE-4256', 1, 1, 'ENTREGUE', hoje - interval '61 days' + interval '5 h', 1);
  perform pg_temp.item(v, 12); perform pg_temp.item(v, 28); perform pg_temp.fechar(v, 42.80);
  perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO','ENTREGUE'], array[0,1,6,20,24,38]);

  -- ===== Tela 37 — pedidos de hoje do Sabor Natural (#1035–#1042 viram CE-1035–CE-1042) =====
  -- PRONTO há mais de 10 min: o job de entrega simulada (frente C) não mexe neles; esperam "Confirmar retirada".
  v := pg_temp.pedido('CE-1042', 31, 1, 'NOVO', hoje - interval '5 min');
  perform pg_temp.item(v, 15); perform pg_temp.item(v, 22); perform pg_temp.fechar(v, 54.80);
  perform pg_temp.historico(v, array['NOVO'], array[0]);

  -- tela 37 mostra R$ 32,90 para a Marmita Fit Salmão (cardápio: R$ 38,90) → preço da época no item
  v := pg_temp.pedido('CE-1041', 32, 1, 'NOVO', hoje - interval '12 min', null, 'Sem lactose');
  perform pg_temp.item(v, 16, 1, 32.90); perform pg_temp.fechar(v, 32.90);
  perform pg_temp.historico(v, array['NOVO'], array[0]);

  v := pg_temp.pedido('CE-1040', 33, 1, 'PREPARANDO', hoje - interval '18 min');
  perform pg_temp.item(v, 10); perform pg_temp.item(v, 9); perform pg_temp.item(v, 23); perform pg_temp.fechar(v, 89.70);
  perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO'], array[0,1,4]);

  v := pg_temp.pedido('CE-1039', 34, 1, 'PREPARANDO', hoje - interval '25 min');
  perform pg_temp.item(v, 17); perform pg_temp.fechar(v, 36.90);
  perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO'], array[0,2,6]);

  v := pg_temp.pedido('CE-1038', 35, 1, 'PREPARANDO', hoje - interval '32 min');
  perform pg_temp.item(v, 18); perform pg_temp.item(v, 24); perform pg_temp.fechar(v, 48.80);
  perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO'], array[0,2,9]);

  v := pg_temp.pedido('CE-1037', 36, 1, 'PRONTO', hoje - interval '40 min', null, 'Sem glúten');
  perform pg_temp.item(v, 25, 2); perform pg_temp.fechar(v, 65.80);
  perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO','PRONTO'], array[0,2,6,22]);

  v := pg_temp.pedido('CE-1036', 37, 1, 'PRONTO', hoje - interval '45 min');
  perform pg_temp.item(v, 26); perform pg_temp.fechar(v, 38.90);
  perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO','PRONTO'], array[0,1,5,24]);

  v := pg_temp.pedido('CE-1035', 38, 1, 'ENTREGUE', hoje - interval '60 min');
  perform pg_temp.item(v, 9); perform pg_temp.item(v, 21); perform pg_temp.fechar(v, 42.80);
  perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO','ENTREGUE'], array[0,1,6,18,21,38]);
end $$;

-- ===== Tela 19 — completa os 42 pedidos do Breno (38 entregues, 3 cancelados, 1 em andamento) =====
-- 34 pedidos gerados de forma determinística entre fev/2026 e hoje, com pratos aprovados de cada restaurante.
select setseed(0.2026);
do $$
declare
  v uuid; i int; r int; n_itens int; prato uuid; dias int; cancelado boolean;
  rests int[] := array[1,1,1,2,3,4,5,6];   -- o Sabor Natural é o favorito do Breno
begin
  for i in 1..34 loop
    r := rests[1 + floor(random() * array_length(rests, 1))::int];
    dias := 9 + floor(random() * 255)::int;   -- entre 9 dias e ~fev/2026
    cancelado := i in (7, 23);
    v := pg_temp.pedido('CE-' || (4000 + i * 7), 1, r, case when cancelado then 'CANCELADO' else 'ENTREGUE' end,
                        date_trunc('minute', now()) - make_interval(days => dias) + make_interval(hours => 11 + floor(random() * 9)::int),
                        1 + (i % 2), null, case when cancelado then 'Cancelado pelo cliente' end);
    n_itens := 1 + floor(random() * 2)::int;
    for prato in
      select m.id from marmita m
      where m.id_restaurante = ('00000000-0000-4000-a000-00000000000' || r)::uuid and m.status_prato = 'APROVADO' and m.categoria <> 'Sucos'
      order by random() limit n_itens
    loop
      insert into item_pedido (id_pedido, id_marmita, nome, quantidade, preco_unitario, calorias, proteinas, carboidratos, gorduras)
      select v, m.id, m.nome, 1, m.preco, m.calorias, m.proteinas, m.carboidratos, m.gorduras from marmita m where m.id = prato;
    end loop;
    perform pg_temp.fechar(v);
    if cancelado then
      perform pg_temp.historico(v, array['NOVO','CANCELADO'], array[0,4]);
    else
      perform pg_temp.historico(v, array['NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO','ENTREGUE'], array[0,2,6,20,24,40]);
    end if;
  end loop;
end $$;

alter table pedido enable trigger trg_pedido_status;
