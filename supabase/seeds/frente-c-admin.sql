-- Fila do admin (/admin e /admin/avaliacoes): 1 restaurante e 1 nutricionista PENDENTES, com login, e avaliações PENDENTES.
-- Idempotente. Senha dos logins: CleanEats@2026. Dono: frente C.
create or replace function pg_temp.usuario_auth(p_id uuid, p_email text, p_nome text, p_perfil text) returns boolean language plpgsql as $$
begin
  if exists (select 1 from usuario where id = p_id) then return false; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
          crypt('CleanEats@2026', gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('nome', p_nome), now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, 'email',
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true), now(), now(), now());
  insert into usuario (id, nome, email, telefone, perfil, id_tier, aceite_termos_em, aceite_lgpd_em, criado_em)
  values (p_id, p_nome, p_email, '(81) 98877-1020', p_perfil, 'FREE', now() - interval '2 days', now() - interval '2 days', now() - interval '2 days');
  return true;
end $$;

-- Restaurante pendente (CNPJ com dígito verificador válido)
do $$ begin
  if pg_temp.usuario_auth('00000000-0000-4000-8000-000000000051', 'graos.recife@cleaneats.test', 'Camila Duarte', 'RESTAURANTE') then
    insert into restaurante (id, id_usuario, nome, sigla, descricao, cnpj, tipos_cozinha, logradouro, numero, bairro, cep,
                             tempo_entrega_min, tempo_entrega_max, taxa_entrega, pedido_minimo, status_aprovacao, criado_em)
    values ('00000000-0000-4000-a000-000000000051', '00000000-0000-4000-8000-000000000051', 'Grãos & Cia', 'GC',
            'Marmitas integrais e bowls com grãos ancestrais, feitas no Espinheiro.', '11222333000181', array['Integral','Bowls','Vegetariano'],
            'Rua do Espinheiro', '410', 'Espinheiro', '52020020', 30, 45, 7.00, 30.00, 'PENDENTE', now() - interval '2 days');
  end if;
end $$;

-- Nutricionista pendente (CRN a validar)
do $$ begin
  if pg_temp.usuario_auth('00000000-0000-4000-8000-000000000052', 'rafaela.nutri@cleaneats.test', 'Rafaela Moura', 'NUTRICIONISTA') then
    insert into nutricionista (id_usuario, crn, crn_uf, especialidades, bio, anos_experiencia, disponibilidade, status_aprovacao, criado_em)
    values ('00000000-0000-4000-8000-000000000052', 'CRN-6 PE 23871/P', 'PE', array['Nutrição Esportiva','Reeducação Alimentar'],
            'Nutricionista esportiva com foco em hipertrofia e performance. Atendo atletas amadores em Recife.', 5,
            '[{"dia":1,"inicio":"08:00","fim":"12:00"},{"dia":3,"inicio":"14:00","fim":"18:00"}]', 'PENDENTE', now() - interval '1 day');
  end if;
end $$;

-- Avaliações pendentes de moderação: Marina e Júlia (clientes do seed da frente A) avaliam pratos de pedidos entregues novos
do $$ declare v uuid; begin
  if not exists (select 1 from pedido where codigo = 'CE-5101') then
    insert into pedido (codigo, id_usuario, id_restaurante, status, subtotal, desconto, taxa_entrega, total, comissao_percentual, valor_comissao,
                        forma_pagamento, confirmado_em, entregue_em, criado_em)
    values ('CE-5101', '00000000-0000-4000-8000-000000000041', '00000000-0000-4000-a000-000000000001', 'ENTREGUE', 38.90, 0, 6.00, 44.90, 8, 3.11,
            'PIX', now() - interval '1 day', now() - interval '23 hours', now() - interval '1 day') returning id into v;
    insert into item_pedido (id_pedido, id_marmita, nome, quantidade, preco_unitario, calorias, proteinas, carboidratos, gorduras)
    select v, m.id, m.nome, 1, m.preco, m.calorias, m.proteinas, m.carboidratos, m.gorduras from marmita m where m.nome = 'Marmita Fit Salmão' and m.id_restaurante = '00000000-0000-4000-a000-000000000001';
    insert into avaliacao (id_pedido, id_marmita, id_usuario, nota, nota_sabor, nota_porcao, nota_entrega, comentario, tags, status_moderacao, data_avaliacao)
    select v, m.id, '00000000-0000-4000-8000-000000000041', 5, 5, 4, 5, 'Salmão suculento e a porção de legumes generosa. Chegou quentinho!',
           array['Bem temperado','Entrega rápida'], 'PENDENTE', now() - interval '20 hours'
    from marmita m where m.nome = 'Marmita Fit Salmão' and m.id_restaurante = '00000000-0000-4000-a000-000000000001';
  end if;
  if not exists (select 1 from pedido where codigo = 'CE-5102') then
    insert into pedido (codigo, id_usuario, id_restaurante, status, subtotal, desconto, taxa_entrega, total, comissao_percentual, valor_comissao,
                        forma_pagamento, confirmado_em, entregue_em, criado_em)
    values ('CE-5102', '00000000-0000-4000-8000-000000000042', '00000000-0000-4000-a000-000000000001', 'ENTREGUE', 32.90, 0, 6.00, 38.90, 8, 2.63,
            'CREDITO', now() - interval '2 days', now() - interval '47 hours', now() - interval '2 days') returning id into v;
    insert into item_pedido (id_pedido, id_marmita, nome, quantidade, preco_unitario, calorias, proteinas, carboidratos, gorduras)
    select v, m.id, m.nome, 1, m.preco, m.calorias, m.proteinas, m.carboidratos, m.gorduras from marmita m where m.nome = 'Bowl Proteico Frango';
    insert into avaliacao (id_pedido, id_marmita, id_usuario, nota, nota_sabor, nota_porcao, nota_entrega, comentario, tags, status_moderacao, data_avaliacao)
    select v, m.id, '00000000-0000-4000-8000-000000000042', 2, 2, 3, 2, 'Veio frio e o frango estava seco. Esperava mais pelo preço.',
           array[]::text[], 'PENDENTE', now() - interval '40 hours'
    from marmita m where m.nome = 'Bowl Proteico Frango';
  end if;
end $$;
