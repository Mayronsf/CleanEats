-- Histórico de vendas para Analytics (41), Financeiro (42), Relatórios (43) e o dashboard (36): pedidos ENTREGUES do Sabor Natural
-- de 01/06/2026 até ontem (~6/dia, mais no meio da semana), alguns cancelados, histórico de status completo e repasses semanais.
-- Outros restaurantes recebem ~1 pedido/dia (números do admin). Códigos CE-700001+ (não colidem com a demo). Idempotente. Dono: frente C.
do $$
declare
  inicio date := date '2026-06-01';
  fim date := (now() at time zone 'America/Recife')::date - 1;
  dia date;
  n int := 0;
  qtd int;
  i int;
  v_rest uuid;
  v_cli uuid;
  v_pedido uuid;
  v_hora timestamptz;
  v_status text;
  v_sub numeric;
  v_com numeric;
  clientes uuid[];
  restaurantes uuid[];
begin
  if exists (select 1 from pedido where codigo = 'CE-700001') then return; end if;
  perform setseed(0.2026);
  select array_agg(id order by id) into clientes from usuario
   where perfil = 'CLIENTE' and id <> '00000000-0000-4000-8000-000000000001' and anonimizado_em is null;
  select array_agg(id order by id) into restaurantes from restaurante where status_aprovacao = 'APROVADO' and id <> '00000000-0000-4000-a000-000000000001';

  create temp table novos_pedidos (id uuid, status text, criado timestamptz) on commit drop;
  dia := inicio;
  while dia <= fim loop
    -- Sabor Natural: 3–9 pedidos (pico qui/sex), demais: 0–2 no total
    qtd := 3 + floor(random() * 5)::int + case extract(isodow from dia) when 4 then 2 when 5 then 3 when 7 then -2 else 0 end;
    for i in 1 .. greatest(qtd, 1) + floor(random() * 3)::int loop
      n := n + 1;
      v_rest := case when i <= greatest(qtd, 1) then '00000000-0000-4000-a000-000000000001'::uuid else restaurantes[1 + floor(random() * array_length(restaurantes, 1))::int] end;
      v_cli := clientes[1 + floor(random() * array_length(clientes, 1))::int];
      v_hora := (dia + time '11:00' + (random() * interval '10 hours')) at time zone 'America/Recife';
      v_status := case when random() < 0.04 then 'CANCELADO' else 'ENTREGUE' end;
      insert into pedido (codigo, id_usuario, id_restaurante, status, subtotal, desconto, taxa_entrega, total, comissao_percentual, valor_comissao,
                          forma_pagamento, confirmado_em, entregue_em, criado_em, atualizado_em, entregador_nome)
      values ('CE-' || (700000 + n), v_cli, v_rest, v_status, 0, 0, 6.00, 0, 8, 0,
              (array['PIX','PIX','CREDITO','CREDITO','DINHEIRO'])[1 + floor(random() * 5)::int], v_hora,
              case when v_status = 'ENTREGUE' then v_hora + interval '42 min' + random() * interval '15 min' end, v_hora, v_hora,
              case when v_status = 'ENTREGUE' then (array['Ricardo Alves','Juliana Matos','Pedro Henrique','Camila Rocha','Diego Ferraz'])[1 + floor(random() * 5)::int] || ' (entregador simulado)' end)
      returning id into v_pedido;
      insert into item_pedido (id_pedido, id_marmita, nome, quantidade, preco_unitario, calorias, proteinas, carboidratos, gorduras)
      select v_pedido, m.id, m.nome, case when random() < 0.15 then 2 else 1 end, m.preco, m.calorias, m.proteinas, m.carboidratos, m.gorduras
      from (select * from marmita where id_restaurante = v_rest and status_prato = 'APROVADO' and calorias is not null order by random() limit (1 + floor(random() * 2))::int) m;
      select coalesce(sum(preco_unitario * quantidade), 0) into v_sub from item_pedido where id_pedido = v_pedido;
      if v_sub = 0 then delete from pedido where id = v_pedido; continue; end if;
      v_com := round(v_sub * 0.08, 2);
      update pedido set subtotal = v_sub, total = v_sub + 6.00, valor_comissao = v_com where id = v_pedido;
      insert into novos_pedidos values (v_pedido, v_status, v_hora);
    end loop;
    dia := dia + 1;
  end loop;

  -- Histórico de status nos horários certos (a trigger gravou um registro "agora"; troca pelos reais)
  delete from historico_status_pedido h using novos_pedidos p where h.id_pedido = p.id;
  insert into historico_status_pedido (id_pedido, status, em)
  select p.id, s.passo, p.criado + s.minutos * interval '1 min'
  from novos_pedidos p cross join lateral unnest(
         case when p.status = 'ENTREGUE' then array['NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO','ENTREGUE'] else array['NOVO','CANCELADO'] end,
         case when p.status = 'ENTREGUE' then array[0, 2, 4, 18 + floor(random() * 8)::int, 24 + floor(random() * 6)::int, 45] else array[0, 5] end) as s(passo, minutos);
end $$;

-- Repasses semanais do Sabor Natural (seg–dom): pagos na quarta seguinte; a semana atual fica PREVISTA
insert into repasse (id_restaurante, periodo_inicio, periodo_fim, valor_bruto, valor_comissao, valor_liquido, status, previsto_para, pago_em)
select '00000000-0000-4000-a000-000000000001', s.ini, s.ini + 6, s.bruto, s.comissao, s.bruto - s.comissao,
       case when s.ini + 9 <= (now() at time zone 'America/Recife')::date then 'PAGO' else 'PREVISTO' end, s.ini + 9,
       case when s.ini + 9 <= (now() at time zone 'America/Recife')::date then (s.ini + 9 + time '10:00') at time zone 'America/Recife' end
from (
  select date_trunc('week', p.criado_em at time zone 'America/Recife')::date as ini,
         sum(p.subtotal - p.desconto) as bruto, sum(p.valor_comissao) as comissao
  from pedido p
  where p.id_restaurante = '00000000-0000-4000-a000-000000000001' and p.status = 'ENTREGUE'
    and p.criado_em >= timestamptz '2026-06-01'
  group by 1
) s
where not exists (select 1 from repasse r where r.id_restaurante = '00000000-0000-4000-a000-000000000001' and r.periodo_inicio = s.ini);
