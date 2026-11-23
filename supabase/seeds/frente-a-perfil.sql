-- Perfil do Breno (telas 21/22) e catálogo de conquistas (tela 21). Idempotente.
update perfil_cliente set username = 'brenofilho',
  bio = 'Estudante de Sistemas de Informação na UNIFACOL e fã de musculação. Tô usando o CleanEats pra organizar a alimentação durante a semana de aulas e treino.',
  meta_peso_kg = 82, prazo_meta_meses = 6,
  observacoes_alimentares = 'Sem lactose pode ser leve (manteiga e queijos curados ok). Evito alimentos muito picantes.'
where id_usuario = '00000000-0000-4000-8000-000000000001' and username is null;

insert into conquista (codigo, nome, descricao, icone) values
  ('PRIMEIRO_PEDIDO',    'Primeiro Pedido',    'Comece sua jornada saudável',          'sprout'),
  ('SEMANA_CONSISTENTE', 'Semana Consistente', '7 dias registrando refeições',         'zap'),
  ('MESTRE_PROTEINA',    'Mestre da Proteína', 'Meta de proteína batida em 30 dias',   'activity'),
  ('AVALIADOR_TOP',      'Avaliador Top',      '30+ avaliações dadas',                 'star'),
  ('MARATONISTA_FIT',    'Maratonista Fit',    '40+ pedidos no app',                   'heart-pulse'),
  ('FORCA_TOTAL',        'Força Total',        '2 kg de proteína consumida',           'dumbbell'),
  ('ATIRADOR',           'Atirador',           '10 metas de calorias batidas no mês',  'target'),
  ('VETERANO',           'Veterano',           '1 ano de CleanEats',                   'crown')
on conflict (codigo) do nothing;
