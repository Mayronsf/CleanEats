-- Auto-gerado: nutricionistas parceiros de teste
update nutricionista n
     set especialidades = case
           when coalesce(array_length(n.especialidades, 1), 0) = 0 then array['Nutrição Esportiva', 'Hipertrofia (Bulking)', 'Reeducação Alimentar']
           else n.especialidades
         end,
         bio = coalesce(nullif(trim(n.bio), ''), 'Nutricionista parceira CleanEats especializada em planos semanais práticos com pratos reais e acompanhamento de macros.'),
         anos_experiencia = coalesce(n.anos_experiencia, 6),
         nota_media = case when coalesce(n.nota_media, 0) = 0 then 4.9 else n.nota_media end,
         max_clientes = coalesce(n.max_clientes, 30)
     where n.status_aprovacao = 'APROVADO';

insert into usuario (id, nome, email, telefone, perfil, avatar_url, id_tier, aceite_termos_em, aceite_lgpd_em)
values ('14598122-e35a-49d7-94af-637879b0acc2', 'Dra. Camila Rocha', 'camila.nutri@cleaneats.test', '(81) 99214-3310', 'NUTRICIONISTA', '/img/pessoas/comunidade-1.jpg', 'FREE', now(), now())
on conflict (id) do update set
  nome = excluded.nome,
  telefone = excluded.telefone,
  avatar_url = coalesce(usuario.avatar_url, excluded.avatar_url);

insert into nutricionista (id_usuario, crn, crn_uf, especialidades, bio, anos_experiencia, disponibilidade, max_clientes, status_aprovacao, avaliado_em, nota_media)
values ('14598122-e35a-49d7-94af-637879b0acc2', 'CRN-6 PE 18421/P', 'PE', array['Emagrecimento (Cutting)', 'Reeducação Alimentar', 'Low Carb'], 'Especialista em emagrecimento sustentável e protocolo de Cutting sem terrorismo nutricional. Planos práticos com foco em saciedade e preservação de massa magra.', 9, '[{"dia":1,"inicio":"08:00","fim":"18:00"},{"dia":3,"inicio":"08:00","fim":"18:00"},{"dia":5,"inicio":"08:00","fim":"16:00"}]'::jsonb, 25, 'APROVADO', now(), 4.9)
on conflict (id_usuario) do update set
  especialidades = excluded.especialidades,
  bio = excluded.bio,
  anos_experiencia = excluded.anos_experiencia,
  max_clientes = excluded.max_clientes,
  status_aprovacao = 'APROVADO',
  nota_media = excluded.nota_media;


insert into usuario (id, nome, email, telefone, perfil, avatar_url, id_tier, aceite_termos_em, aceite_lgpd_em)
values ('39632549-300a-45a2-aba1-ae42b12b0bd3', 'Dr. Rafael Mendes', 'rafael.nutri@cleaneats.test', '(81) 99608-4120', 'NUTRICIONISTA', '/img/pessoas/comunidade-2.jpg', 'FREE', now(), now())
on conflict (id) do update set
  nome = excluded.nome,
  telefone = excluded.telefone,
  avatar_url = coalesce(usuario.avatar_url, excluded.avatar_url);

insert into nutricionista (id_usuario, crn, crn_uf, especialidades, bio, anos_experiencia, disponibilidade, max_clientes, status_aprovacao, avaliado_em, nota_media)
values ('39632549-300a-45a2-aba1-ae42b12b0bd3', 'CRN-6 PE 21904/P', 'PE', array['Hipertrofia (Bulking)', 'Nutrição Esportiva', 'Alta Proteína'], 'Nutricionista esportivo focado em Bulking limpo, periodização de carboidratos e ganho de força. Ideal para quem treina musculação, corrida ou crossfit.', 7, '[{"dia":1,"inicio":"08:00","fim":"18:00"},{"dia":3,"inicio":"08:00","fim":"18:00"},{"dia":5,"inicio":"08:00","fim":"16:00"}]'::jsonb, 30, 'APROVADO', now(), 4.8)
on conflict (id_usuario) do update set
  especialidades = excluded.especialidades,
  bio = excluded.bio,
  anos_experiencia = excluded.anos_experiencia,
  max_clientes = excluded.max_clientes,
  status_aprovacao = 'APROVADO',
  nota_media = excluded.nota_media;


insert into usuario (id, nome, email, telefone, perfil, avatar_url, id_tier, aceite_termos_em, aceite_lgpd_em)
values ('fd0442df-754b-4ac0-98a8-540581e69690', 'Dra. Beatriz Alencar', 'beatriz.nutri@cleaneats.test', '(81) 99122-7745', 'NUTRICIONISTA', '/img/pessoas/comunidade-3.jpg', 'FREE', now(), now())
on conflict (id) do update set
  nome = excluded.nome,
  telefone = excluded.telefone,
  avatar_url = coalesce(usuario.avatar_url, excluded.avatar_url);

insert into nutricionista (id_usuario, crn, crn_uf, especialidades, bio, anos_experiencia, disponibilidade, max_clientes, status_aprovacao, avaliado_em, nota_media)
values ('fd0442df-754b-4ac0-98a8-540581e69690', 'CRN-6 PE 19305/P', 'PE', array['Plant-Based e Vegana', 'Intolerâncias (Glúten/Lactose)', 'Saúde Intestinal'], 'Atuação voltada para dietas vegetarianas/veganas de alta densidade proteica e manejo clínico de intolerâncias alimentares (sem glúten, sem lactose e FODMAPs).', 6, '[{"dia":1,"inicio":"08:00","fim":"18:00"},{"dia":3,"inicio":"08:00","fim":"18:00"},{"dia":5,"inicio":"08:00","fim":"16:00"}]'::jsonb, 20, 'APROVADO', now(), 5)
on conflict (id_usuario) do update set
  especialidades = excluded.especialidades,
  bio = excluded.bio,
  anos_experiencia = excluded.anos_experiencia,
  max_clientes = excluded.max_clientes,
  status_aprovacao = 'APROVADO',
  nota_media = excluded.nota_media;


insert into usuario (id, nome, email, telefone, perfil, avatar_url, id_tier, aceite_termos_em, aceite_lgpd_em)
values ('c7a7d925-bbcd-48f9-bab0-ade96e151bff', 'Dr. Thiago Vasconcelos', 'thiago.nutri@cleaneats.test', '(81) 99455-8890', 'NUTRICIONISTA', '/img/pessoas/comunidade-4.jpg', 'FREE', now(), now())
on conflict (id) do update set
  nome = excluded.nome,
  telefone = excluded.telefone,
  avatar_url = coalesce(usuario.avatar_url, excluded.avatar_url);

insert into nutricionista (id_usuario, crn, crn_uf, especialidades, bio, anos_experiencia, disponibilidade, max_clientes, status_aprovacao, avaliado_em, nota_media)
values ('c7a7d925-bbcd-48f9-bab0-ade96e151bff', 'CRN-6 PE 15890/P', 'PE', array['Nutrição Clínica', 'Dieta Equilibrada', 'Emagrecimento (Cutting)'], 'Mestre em Nutrição Clínica com foco em longevidade, controle glicêmico, melhora de exames laboratoriais e rotina alimentar equilibrada para o dia a dia corrido.', 11, '[{"dia":1,"inicio":"08:00","fim":"18:00"},{"dia":3,"inicio":"08:00","fim":"18:00"},{"dia":5,"inicio":"08:00","fim":"16:00"}]'::jsonb, 35, 'APROVADO', now(), 4.7)
on conflict (id_usuario) do update set
  especialidades = excluded.especialidades,
  bio = excluded.bio,
  anos_experiencia = excluded.anos_experiencia,
  max_clientes = excluded.max_clientes,
  status_aprovacao = 'APROVADO',
  nota_media = excluded.nota_media;
