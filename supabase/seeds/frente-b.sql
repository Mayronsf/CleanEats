-- Seed da frente B — nutricionista (06, 26–35): ~9 clientes da Dra. Ana Souza, triagens (27), plano da semana do Breno (24, 30), prescrições (32), conversas e mensagens (33), medições (29), repasses (34)
-- Só esta frente edita este arquivo. Use os UUIDs fixos de seed.sql para referenciar
-- usuários, restaurantes e pratos do núcleo. Datas em 2026, cidade Recife.
-- Idempotente: ids fixos na faixa 00000000-0000-4000-e000-* com "on conflict do nothing".
-- Datas relativas a now() (como o seed central), para a demo cair sempre em "hoje".
-- Prescrições não entram aqui: o PDF precisa existir no Storage, então o histórico nasce na demo (tela 32).

-- Triagens (tela 27). Clientes da Dra. Ana (nutricionista 9000-...01).
-- AGUARDANDO: Fernanda Barros (virou Pro em 23/11) e Gabriela Nunes; EM_ANDAMENTO: Rafael Mendes e Thales Cunha;
-- CONCLUIDA: Breno e os demais clientes com metas definidas.
insert into triagem (id, id_cliente, id_nutricionista, status, respostas, observacoes, criado_em, iniciada_em, concluida_em) values
  ('00000000-0000-4000-e000-000000000027', '00000000-0000-4000-8000-000000000027', '00000000-0000-4000-9000-000000000001', 'AGUARDANDO',
   '{"rotina": "Atividade leve, caminhada 3x/semana", "condicoes_saude": [], "objetivo_detalhe": "Perder 6 kg até o fim do ano"}', null,
   now() - interval '6 hours', null, null),
  ('00000000-0000-4000-e000-000000000028', '00000000-0000-4000-8000-000000000028', '00000000-0000-4000-9000-000000000001', 'AGUARDANDO',
   '{"rotina": "Treina 5x/semana", "condicoes_saude": ["Diabetes tipo 2"], "objetivo_detalhe": "Controlar a glicemia sem perder massa"}', null,
   now() - interval '2 hours', null, null),
  ('00000000-0000-4000-e000-000000000025', '00000000-0000-4000-8000-000000000025', '00000000-0000-4000-9000-000000000001', 'EM_ANDAMENTO',
   '{"rotina": "Treina 4x/semana", "condicoes_saude": [], "objetivo_detalhe": "Ganhar massa magra"}', 'Aguardando exames de sangue.',
   now() - interval '3 days', now() - interval '2 days', null),
  ('00000000-0000-4000-e000-000000000026', '00000000-0000-4000-8000-000000000026', '00000000-0000-4000-9000-000000000001', 'EM_ANDAMENTO',
   '{"rotina": "Trabalha em turnos, treina 2x/semana", "condicoes_saude": ["Hipertensão"], "objetivo_detalhe": "Reduzir sódio e perder peso"}', null,
   now() - interval '4 days', now() - interval '1 day', null),
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001', 'CONCLUIDA',
   '{"rotina": "Treina 4x/semana", "condicoes_saude": [], "objetivo_detalhe": "Chegar a 82 kg até nov/26"}', 'Metas definidas: 2.200 kcal, 140 g de proteína.',
   date '2026-02-10', date '2026-02-10', date '2026-02-11'),
  ('00000000-0000-4000-e000-000000000021', '00000000-0000-4000-8000-000000000021', '00000000-0000-4000-9000-000000000001', 'CONCLUIDA', '{}', null, date '2026-03-02', date '2026-03-02', date '2026-03-03'),
  ('00000000-0000-4000-e000-000000000022', '00000000-0000-4000-8000-000000000022', '00000000-0000-4000-9000-000000000001', 'CONCLUIDA', '{}', null, date '2026-03-15', date '2026-03-15', date '2026-03-16'),
  ('00000000-0000-4000-e000-000000000023', '00000000-0000-4000-8000-000000000023', '00000000-0000-4000-9000-000000000001', 'CONCLUIDA', '{}', null, date '2026-04-04', date '2026-04-04', date '2026-04-05'),
  ('00000000-0000-4000-e000-000000000024', '00000000-0000-4000-8000-000000000024', '00000000-0000-4000-9000-000000000001', 'CONCLUIDA', '{}', null, date '2026-05-20', date '2026-05-20', date '2026-05-21'),
  ('00000000-0000-4000-e000-000000000031', '00000000-0000-4000-8000-000000000031', '00000000-0000-4000-9000-000000000001', 'CONCLUIDA', '{}', null, date '2026-06-01', date '2026-06-01', date '2026-06-02'),
  ('00000000-0000-4000-e000-000000000032', '00000000-0000-4000-8000-000000000032', '00000000-0000-4000-9000-000000000001', 'CONCLUIDA', '{}', null, date '2026-06-12', date '2026-06-12', date '2026-06-13'),
  ('00000000-0000-4000-e000-000000000033', '00000000-0000-4000-8000-000000000033', '00000000-0000-4000-9000-000000000001', 'CONCLUIDA', '{}', null, date '2026-07-08', date '2026-07-08', date '2026-07-09'),
  ('00000000-0000-4000-e000-000000000034', '00000000-0000-4000-8000-000000000034', '00000000-0000-4000-9000-000000000001', 'CONCLUIDA', '{}', null, date '2026-08-19', date '2026-08-19', date '2026-08-20'),
  ('00000000-0000-4000-e000-000000000035', '00000000-0000-4000-8000-000000000035', '00000000-0000-4000-9000-000000000001', 'CONCLUIDA', '{}', null, date '2026-09-03', date '2026-09-03', date '2026-09-04')
on conflict (id) do nothing;

-- Medições (tela 29): evolução do Breno de 75,8 kg (fev/26) a 78,2 kg; meta 82 kg. Mais alguns clientes com 3 pontos.
insert into medicao (id, id_usuario, id_nutricionista, data, peso_kg, gordura_percentual, cintura_cm, observacao) values
  ('00000000-0000-4000-e100-000000000101', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001', date '2026-02-11', 75.8, 15.2, 80, 'Medição inicial'),
  ('00000000-0000-4000-e100-000000000102', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001', date '2026-04-08', 76.6, 14.9, 80, null),
  ('00000000-0000-4000-e100-000000000103', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001', date '2026-06-10', 77.1, 14.6, 81, null),
  ('00000000-0000-4000-e100-000000000104', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001', date '2026-08-26', 77.6, 14.3, 81, null),
  ('00000000-0000-4000-e100-000000000105', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001', date '2026-10-21', 78.2, 14.1, 81, 'Boa evolução de massa'),
  ('00000000-0000-4000-e100-000000002101', '00000000-0000-4000-8000-000000000021', '00000000-0000-4000-9000-000000000001', date '2026-03-03', 71.0, 29.0, 82, 'Medição inicial'),
  ('00000000-0000-4000-e100-000000002102', '00000000-0000-4000-8000-000000000021', '00000000-0000-4000-9000-000000000001', date '2026-07-01', 68.4, 27.1, 79, null),
  ('00000000-0000-4000-e100-000000002103', '00000000-0000-4000-8000-000000000021', '00000000-0000-4000-9000-000000000001', date '2026-10-28', 66.2, 25.8, 76, null),
  ('00000000-0000-4000-e100-000000002201', '00000000-0000-4000-8000-000000000022', '00000000-0000-4000-9000-000000000001', date '2026-03-16', 88.0, 24.0, 96, 'Medição inicial'),
  ('00000000-0000-4000-e100-000000002202', '00000000-0000-4000-8000-000000000022', '00000000-0000-4000-9000-000000000001', date '2026-07-14', 85.1, 22.6, 93, null),
  ('00000000-0000-4000-e100-000000002203', '00000000-0000-4000-8000-000000000022', '00000000-0000-4000-9000-000000000001', date '2026-11-03', 83.9, 21.9, 91, null)
on conflict (id) do nothing;

-- Conversas e mensagens (tela 33): os 5 assinantes da tela 34. A do Breno já existe (criada pela frente A).
insert into conversa (id, id_cliente, id_nutricionista, criado_em) values
  ('00000000-0000-4000-e200-000000000031', '00000000-0000-4000-8000-000000000031', '00000000-0000-4000-9000-000000000001', date '2026-06-02'),
  ('00000000-0000-4000-e200-000000000032', '00000000-0000-4000-8000-000000000032', '00000000-0000-4000-9000-000000000001', date '2026-06-13'),
  ('00000000-0000-4000-e200-000000000033', '00000000-0000-4000-8000-000000000033', '00000000-0000-4000-9000-000000000001', date '2026-07-09'),
  ('00000000-0000-4000-e200-000000000034', '00000000-0000-4000-8000-000000000034', '00000000-0000-4000-9000-000000000001', date '2026-08-20'),
  ('00000000-0000-4000-e200-000000000035', '00000000-0000-4000-8000-000000000035', '00000000-0000-4000-9000-000000000001', date '2026-09-04')
on conflict (id) do nothing;

-- id_autor: cliente = usuário 8000-…NN; Dra. Ana = usuário 8000-…02. Mensagens do cliente sem lida_em contam como não lidas.
insert into mensagem (id, id_conversa, id_autor, texto, lida_em, criado_em) values
  ('00000000-0000-4000-e300-000000003101', '00000000-0000-4000-e200-000000000031', '00000000-0000-4000-8000-000000000031', 'Oi Dra. Ana! Tudo bem? Gostaria de tirar uma dúvida sobre o plano.', now() - interval '50 min', now() - interval '60 min'),
  ('00000000-0000-4000-e300-000000003102', '00000000-0000-4000-e200-000000000031', '00000000-0000-4000-8000-000000000031', 'Posso substituir o frango pelo peixe na refeição de segunda? Quero variar um pouco.', now() - interval '50 min', now() - interval '59 min'),
  ('00000000-0000-4000-e300-000000003103', '00000000-0000-4000-e200-000000000031', '00000000-0000-4000-8000-000000000002', 'Oi Maria! Claro que pode! O peixe é uma excelente opção. Mantém as proporções de macros quase idênticas, principalmente se for tilápia ou merluza.', now() - interval '45 min', now() - interval '57 min'),
  ('00000000-0000-4000-e300-000000003104', '00000000-0000-4000-e200-000000000031', '00000000-0000-4000-8000-000000000031', 'Perfeito! Vou pedir tilápia essa semana então. Obrigada!', null, now() - interval '55 min'),
  ('00000000-0000-4000-e300-000000003105', '00000000-0000-4000-e200-000000000031', '00000000-0000-4000-8000-000000000031', 'Posso substituir o frango pelo peixe também no jantar?', null, now() - interval '2 min'),
  ('00000000-0000-4000-e300-000000003201', '00000000-0000-4000-e200-000000000032', '00000000-0000-4000-8000-000000000032', 'Dúvida sobre as refeições de terça', null, now() - interval '3 hours'),
  ('00000000-0000-4000-e300-000000003301', '00000000-0000-4000-e200-000000000033', '00000000-0000-4000-8000-000000000002', 'Lucia, ajustei o lanche da tarde como combinamos.', now() - interval '1 day 2 hours', now() - interval '1 day 3 hours'),
  ('00000000-0000-4000-e300-000000003302', '00000000-0000-4000-e200-000000000033', '00000000-0000-4000-8000-000000000033', 'Muito obrigada pelas orientações!', now() - interval '1 day', now() - interval '1 day 1 hour'),
  ('00000000-0000-4000-e300-000000003401', '00000000-0000-4000-e200-000000000034', '00000000-0000-4000-8000-000000000034', 'Confirmando próxima consulta', null, now() - interval '3 days'),
  ('00000000-0000-4000-e300-000000003501', '00000000-0000-4000-e200-000000000035', '00000000-0000-4000-8000-000000000002', 'Juliana, sua prescrição foi enviada para o seu e-mail.', now() - interval '6 days', now() - interval '7 days'),
  ('00000000-0000-4000-e300-000000003502', '00000000-0000-4000-e200-000000000035', '00000000-0000-4000-8000-000000000035', 'Recebi a prescrição, obrigada!', now() - interval '6 days', now() - interval '6 days 23 hours')
on conflict (id) do nothing;
