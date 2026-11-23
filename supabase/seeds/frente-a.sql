-- Seed da frente A — cliente (telas 10–25): pedidos e histórico (19), avaliações (12, 20), favoritos, conquistas, consumo do dia (10), componentes do monte sua marmita (15), cupons, faturas da assinatura (23), conversa do NutriBot (25)
-- Só esta frente edita este arquivo. Use os UUIDs fixos de seed.sql para referenciar
-- usuários, restaurantes e pratos do núcleo. Datas em 2026, cidade Recife.

-- Favoritos do Breno (tela 10: coração ativo no Frango Grelhado Fitness)
insert into favorito (id_usuario, id_marmita) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-b000-000000000001'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-b000-000000000003')
on conflict do nothing;

-- ---------- Avaliações publicadas da tela 12 (Frango Grelhado Fitness) ----------
-- Marina S. e Júlia P. são clientes novas; Rafael M. é o Rafael Mendes da tela 28. Pedidos com códigos livres CE-47xx/48xx.
create or replace function pg_temp.cliente_avaliadora(p_id uuid, p_email text, p_nome text) returns void language plpgsql as $$
begin
  if exists (select 1 from usuario where id = p_id) then return; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
          crypt('CleanEats@2026', gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('nome', p_nome), now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, 'email',
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true), now(), now(), now());
  insert into usuario (id, nome, email, perfil, id_tier, aceite_termos_em, aceite_lgpd_em, criado_em)
  values (p_id, p_nome, p_email, 'CLIENTE', 'FREE', '2026-06-01', '2026-06-01', '2026-06-01');
  insert into perfil_cliente (id_usuario, objetivo_nutricional, meta_calorias, meta_proteinas, meta_carboidratos, meta_gorduras, meta_fibras, meta_agua_ml)
  values (p_id, 'EQUILIBRIO', 2000, 105, 230, 65, 30, 2450);   -- macro a confirmar
end $$;
select pg_temp.cliente_avaliadora('00000000-0000-4000-8000-000000000041', 'marina.santos@cleaneats.test', 'Marina Santos');
select pg_temp.cliente_avaliadora('00000000-0000-4000-8000-000000000042', 'julia.prado@cleaneats.test', 'Júlia Prado');

do $$
declare
  a record;
  v_pedido uuid;
begin
  for a in select * from (values
      ('CE-4790', '00000000-0000-4000-8000-000000000041'::uuid, 3, 5, 'Sabor incrível, porção generosa e dentro dos macros que minha nutri pediu. Já é meu almoço fixo da semana!', array['Saboroso','Porção generosa']),
      ('CE-4801', '00000000-0000-4000-8000-000000000025'::uuid, 5, 5, 'Frango sempre no ponto, brócolis crocante. E o melhor: 38g de proteína sem precisar contar nada eu mesmo.', array['No ponto','Macros certos']),
      ('CE-4760', '00000000-0000-4000-8000-000000000042'::uuid, 7, 4, 'Muito gostoso. Achei a porção de arroz um pouco pequena pro meu objetivo, mas no geral excelente custo-benefício.', array['Custo-benefício'])
    ) as x(codigo, cliente, dias, nota, comentario, tags)
  loop
    if exists (select 1 from pedido where codigo = a.codigo) then continue; end if;
    insert into pedido (codigo, id_usuario, id_restaurante, status, subtotal, desconto, taxa_entrega, total, comissao_percentual, valor_comissao,
                        forma_pagamento, confirmado_em, entregue_em, criado_em)
    values (a.codigo, a.cliente, '00000000-0000-4000-a000-000000000001', 'ENTREGUE', 24.90, 0, 6.00, 30.90, 8, 1.99, 'PIX',
            now() - (a.dias || ' days')::interval - interval '1 hour', now() - (a.dias || ' days')::interval - interval '20 min',
            now() - (a.dias || ' days')::interval - interval '1 hour')
    returning id into v_pedido;
    insert into item_pedido (id_pedido, id_marmita, nome, quantidade, preco_unitario, calorias, proteinas, carboidratos, gorduras)
    values (v_pedido, '00000000-0000-4000-b000-000000000001', 'Frango Grelhado Fitness', 1, 24.90, 420, 38, 32, 12);
    insert into avaliacao (id_pedido, id_marmita, id_usuario, nota, nota_sabor, nota_porcao, nota_embalagem, nota_entrega, comentario, tags,
                           status_moderacao, data_avaliacao)
    values (v_pedido, '00000000-0000-4000-b000-000000000001', a.cliente, a.nota, 5, a.nota, 5, 5, a.comentario, a.tags, 'PUBLICADA',
            now() - (a.dias || ' days')::interval + interval '2 hours');
  end loop;
end $$;

-- ---------- Cupons (tela 16). NUTRI15 = 10% como no rótulo da tela ("Cupom NUTRI15 (−10%)") ----------
insert into cupom (codigo, descricao, percentual, valor_fixo, valido_ate, uso_maximo, ativo) values
  ('NUTRI15', 'Cupom da sua nutricionista', 10, null, '2026-12-31', null, true),
  ('BEMVINDO10', 'R$ 10 no primeiro pedido', null, 10.00, '2026-12-31', 500, true),
  ('VERAO2025', 'Campanha encerrada', 15, null, '2025-03-31', null, true)
on conflict (codigo) do nothing;
update pedido set id_cupom = (select id from cupom where codigo = 'NUTRI15') where codigo = 'CE-4823' and id_cupom is null;

-- Telefones dos restaurantes (telas 17 e 18)
update restaurante set telefone = '(81) 3344-5566' where id = '00000000-0000-4000-a000-000000000001' and telefone is null;
update restaurante set telefone = '(81) 3221-0987' where id = '00000000-0000-4000-a000-000000000002' and telefone is null;
update restaurante set telefone = '(81) 3465-1200' where id = '00000000-0000-4000-a000-000000000003' and telefone is null;
update restaurante set telefone = '(81) 3031-4455' where id = '00000000-0000-4000-a000-000000000004' and telefone is null;
update restaurante set telefone = '(81) 3088-7766' where id = '00000000-0000-4000-a000-000000000005' and telefone is null;
update restaurante set telefone = '(81) 3092-3344' where id = '00000000-0000-4000-a000-000000000006' and telefone is null;

-- ---------- Avaliações do Breno (tela 19: "avaliado" com estrelas; 4,8 de média) ----------
-- Pedidos entregues com mais de 4 dias, menos o CE-4701 (a tela mostra "não avaliado"). Publicadas.
insert into avaliacao (id_pedido, id_marmita, id_usuario, nota, nota_sabor, nota_porcao, nota_embalagem, nota_entrega, comentario, tags, status_moderacao, data_avaliacao)
select p.id, (select i.id_marmita from item_pedido i where i.id_pedido = p.id and i.id_marmita is not null order by i.nome limit 1),
       p.id_usuario, case when row_number() over (order by p.criado_em) % 5 = 0 then 4 else 5 end, 5, 5, 5, 5,
       null, array['Saboroso'], 'PUBLICADA', p.criado_em + interval '2 hours'
from pedido p
where p.id_usuario = '00000000-0000-4000-8000-000000000001' and p.status = 'ENTREGUE'
  and p.criado_em < now() - interval '4 days' and p.codigo <> 'CE-4701'
  and not exists (select 1 from avaliacao a where a.id_pedido = p.id);
