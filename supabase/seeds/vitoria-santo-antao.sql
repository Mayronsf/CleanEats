-- Posiciona os restaurantes parceiros e endereços de demonstração em locais reais de Vitória de Santo Antão - PE.
-- Idempotente: pode ser executado várias vezes sem duplicar registros.

-- 1) Restaurantes parceiros em pontos reais de Vitória de Santo Antão - PE
update restaurante set
  descricao = 'Marmitas saudáveis com proteína de qualidade e tempero da casa. Há 4 anos servindo refeições balanceadas em Vitória de Santo Antão com ingredientes frescos.',
  logradouro = 'Av. Henrique de Holanda',
  numero = '3000 · Vitória Park Shopping',
  bairro = 'Redenção',
  cidade = 'Vitória de Santo Antão',
  uf = 'PE',
  cep = '55612187',
  latitude = -8.116169,
  longitude = -35.270785
where id = '00000000-0000-4000-a000-000000000001' or nome = 'Sabor Natural';

update restaurante set
  logradouro = 'Praça da Matriz',
  numero = '140',
  bairro = 'Matriz',
  cidade = 'Vitória de Santo Antão',
  uf = 'PE',
  cep = '55602100',
  latitude = -8.116282,
  longitude = -35.292347
where id = '00000000-0000-4000-a000-000000000002' or nome = 'Verde Vida';

update restaurante set
  logradouro = 'Av. Mariana Amália',
  numero = '315',
  bairro = 'Centro',
  cidade = 'Vitória de Santo Antão',
  uf = 'PE',
  cep = '55602010',
  latitude = -8.120137,
  longitude = -35.295750
where id = '00000000-0000-4000-a000-000000000003' or nome = 'Mar & Terra';

update restaurante set
  logradouro = 'Rua do Estudante',
  numero = '85',
  bairro = 'Universitário',
  cidade = 'Vitória de Santo Antão',
  uf = 'PE',
  cep = '55602010',
  latitude = -8.118306,
  longitude = -35.290311
where id = '00000000-0000-4000-a000-000000000004' or nome = 'FitFood';

update restaurante set
  logradouro = 'Av. Henrique de Holanda',
  numero = '1240',
  bairro = 'Redenção',
  cidade = 'Vitória de Santo Antão',
  uf = 'PE',
  cep = '55613660',
  latitude = -8.114345,
  longitude = -35.281293
where id = '00000000-0000-4000-a000-000000000005' or nome = 'Açaí Club';

update restaurante set
  logradouro = 'Rua Eurico Valois',
  numero = '210',
  bairro = 'Maués',
  cidade = 'Vitória de Santo Antão',
  uf = 'PE',
  cep = '55602020',
  latitude = -8.118237,
  longitude = -35.312249
where id = '00000000-0000-4000-a000-000000000006' or nome = 'Rota Proteica';

-- Outros restaurantes de teste ainda marcados em Recife sem coordenadas
update restaurante set
  logradouro = coalesce(nullif(logradouro, ''), 'Av. Silva Jardim'),
  numero = coalesce(nullif(numero, ''), '420'),
  bairro = coalesce(nullif(bairro, ''), 'Matriz'),
  cidade = 'Vitória de Santo Antão',
  uf = 'PE',
  cep = coalesce(nullif(cep, ''), '55602000'),
  latitude = coalesce(latitude, -8.113530),
  longitude = coalesce(longitude, -35.292649)
where cidade = 'Recife' and latitude is null;

-- 2) Endereços de demonstração do seed (Breno) em Vitória de Santo Antão - PE
update endereco set
  cep = '55602020',
  logradouro = 'Rua Melo Verçosa',
  numero = '245',
  complemento = 'Apto 201 · próximo à Praça da Matriz',
  bairro = 'Centro',
  cidade = 'Vitória de Santo Antão',
  uf = 'PE'
where id = '00000000-0000-4000-c000-000000000001';

update endereco set
  cep = '55602010',
  logradouro = 'Rua do Estudante',
  numero = '120',
  complemento = 'Campus UNIFACOL',
  bairro = 'Universitário',
  cidade = 'Vitória de Santo Antão',
  uf = 'PE'
where id = '00000000-0000-4000-c000-000000000002';

-- 3) Padrão da tabela restaurante para novos cadastros
alter table restaurante alter column cidade set default 'Vitória de Santo Antão';
