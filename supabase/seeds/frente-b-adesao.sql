-- Seed da frente B: adesão variada para /nutri/acompanhamento (roteiro 5.4, "clientes com menor adesão primeiro").
-- Quatro clientes da Dra. Ana ganham um plano ativo (almoço todos os dias, começando na segunda passada) e pedidos
-- ENTREGUES do mesmo prato em alguns dos últimos 7 dias:
--   Pedro Silva (22) 6/7 ≈ 86% · Lucas Andrade (24) 3/7 ≈ 43% · Mariana Costa (21) 1/7 ≈ 14% · Juliana Sá (23) 0/7 = 0%
-- O Breno (01) mantém o plano do seed central. Pratos de FitFood e Rota Proteica, para não mexer nos números do
-- Sabor Natural (telas 41–43). Idempotente: ids derivados de md5 + "on conflict do nothing". As datas são relativas ao
-- dia em que o arquivo roda; para trazê-las para outro dia, apague os registros com o prefixo de código CE-8 e rode de novo.
do $$
declare
  v_nutri constant uuid := '00000000-0000-4000-9000-000000000001';
  v_segunda date := (date_trunc('week', now() at time zone 'America/Recife'))::date - 7;
  v_hoje date := (now() at time zone 'America/Recife')::date;
  r record;
  v_plano uuid;
  v_pedido uuid;
  v_dia int;
  v_preco numeric;
  v_comissao numeric;
  v_seq int := 0;
begin
  for r in
    select * from (values
      ('00000000-0000-4000-8000-000000000022'::uuid, '00000000-0000-4000-b000-000000000031'::uuid, array[0,1,2,3,4,5]),
      ('00000000-0000-4000-8000-000000000024'::uuid, '00000000-0000-4000-b000-000000000032'::uuid, array[1,3,5]),
      ('00000000-0000-4000-8000-000000000021'::uuid, '00000000-0000-4000-b000-000000000035'::uuid, array[2]),
      ('00000000-0000-4000-8000-000000000023'::uuid, '00000000-0000-4000-b000-000000000036'::uuid, array[]::int[])
    ) as t(id_cliente, id_marmita, dias_pedidos)
  loop
    v_seq := v_seq + 1;
    -- Plano ativo só se o cliente ainda não tiver um (não sobrescreve o que a nutri montar na demo).
    if not exists (select 1 from plano_alimentar where id_usuario = r.id_cliente and ativo) then
      v_plano := md5('frente-b-adesao-plano-' || r.id_cliente)::uuid;
      insert into plano_alimentar (id, id_usuario, id_nutricionista, semana_inicio, ativo,
                                   meta_calorias, meta_proteinas, meta_carboidratos, meta_gorduras, meta_fibras)
      select v_plano, r.id_cliente, v_nutri, v_segunda, true,
             pc.meta_calorias, pc.meta_proteinas, pc.meta_carboidratos, pc.meta_gorduras, pc.meta_fibras
      from perfil_cliente pc where pc.id_usuario = r.id_cliente
      on conflict (id) do nothing;
      -- dia_semana do banco: 0 = domingo … 6 = sábado
      for v_dia in 0..6 loop
        insert into refeicao_plano (id, id_plano_alimentar, dia_semana, tipo_refeicao, horario, id_marmita, observacao)
        values (md5('frente-b-adesao-refeicao-' || r.id_cliente || '-' || v_dia)::uuid, v_plano, v_dia, 'ALMOCO', '12:30', r.id_marmita, null)
        on conflict (id) do nothing;
      end loop;
    end if;

    -- Pedidos entregues do prato do plano, "j" dias atrás, às 12:30 de Recife.
    select m.preco, rs.comissao_percentual into v_preco, v_comissao
    from marmita m join restaurante rs on rs.id = m.id_restaurante where m.id = r.id_marmita;
    for v_dia in select unnest(r.dias_pedidos) loop
      v_pedido := md5('frente-b-adesao-pedido-' || r.id_cliente || '-' || v_dia)::uuid;
      insert into pedido (id, codigo, id_usuario, id_restaurante, status, subtotal, desconto, taxa_entrega, total,
                          comissao_percentual, valor_comissao, forma_pagamento, confirmado_em, entregue_em, criado_em)
      select v_pedido, 'CE-8' || lpad((v_seq * 10 + v_dia)::text, 5, '0'), r.id_cliente, m.id_restaurante, 'ENTREGUE',
             v_preco, 0, 5.00, v_preco + 5.00, v_comissao, round(v_preco * v_comissao / 100, 2), 'CARTAO',
             ((v_hoje - v_dia) + time '12:20') at time zone 'America/Recife',
             ((v_hoje - v_dia) + time '12:55') at time zone 'America/Recife',
             ((v_hoje - v_dia) + time '12:15') at time zone 'America/Recife'
      from marmita m where m.id = r.id_marmita
      on conflict (id) do nothing;
      insert into item_pedido (id, id_pedido, id_marmita, nome, quantidade, preco_unitario, calorias, proteinas, carboidratos, gorduras)
      select md5('frente-b-adesao-item-' || r.id_cliente || '-' || v_dia)::uuid, v_pedido, m.id, m.nome, 1, m.preco,
             coalesce(m.calorias, 0), coalesce(m.proteinas, 0), coalesce(m.carboidratos, 0), coalesce(m.gorduras, 0)
      from marmita m where m.id = r.id_marmita
      on conflict (id) do nothing;
    end loop;
  end loop;
end $$;
