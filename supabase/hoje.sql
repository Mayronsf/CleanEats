-- Dados "de hoje" da demo (idempotente; NÃO apaga nada). Rode no dia da apresentação:  npm run banco:hoje
-- 1) Consumo do Breno hoje = tela 10 (1.247 kcal · 86 g P · 142 g C · 42 g G · 18 g F · 1,4 L)
insert into consumo_diario (id_usuario, data, calorias, proteinas, carboidratos, gorduras, fibras, agua_ml)
values ('00000000-0000-4000-8000-000000000001', (now() at time zone 'America/Recife')::date, 1247, 86, 142, 42, 18, 1400)
on conflict (id_usuario, data) do update
  set calorias = excluded.calorias, proteinas = excluded.proteinas, carboidratos = excluded.carboidratos,
      gorduras = excluded.gorduras, fibras = excluded.fibras, agua_ml = excluded.agua_ml;
-- 2) Plano do Breno começa na segunda-feira desta semana
update plano_alimentar set semana_inicio = date_trunc('week', (now() at time zone 'America/Recife')::date)::date
where id = '00000000-0000-4000-d000-000000000001';
-- 3) Café e almoço de hoje já entregues (tela 10/24: "Consumido"). Códigos fixos da demo: recriados a cada execução.
delete from pedido where codigo in ('CE-4830', 'CE-4831');
insert into pedido (codigo, id_usuario, id_restaurante, id_endereco, status, subtotal, desconto, taxa_entrega, total,
                    comissao_percentual, valor_comissao, forma_pagamento, confirmado_em, entregue_em, criado_em)
select x.codigo, '00000000-0000-4000-8000-000000000001', m.id_restaurante, '00000000-0000-4000-c000-000000000001', 'ENTREGUE',
       m.preco, round(m.preco * 0.05, 2), 0, m.preco - round(m.preco * 0.05, 2), 8, round((m.preco - round(m.preco * 0.05, 2)) * 0.08, 2),
       'PIX', x.quando, x.quando + interval '35 min', x.quando
from (values ('CE-4830', '00000000-0000-4000-b000-000000000007'::uuid, ((now() at time zone 'America/Recife')::date + time '06:25') at time zone 'America/Recife'),
             ('CE-4831', '00000000-0000-4000-b000-000000000001'::uuid, ((now() at time zone 'America/Recife')::date + time '11:50') at time zone 'America/Recife')) as x(codigo, marmita, quando)
join marmita m on m.id = x.marmita;
insert into item_pedido (id_pedido, id_marmita, nome, quantidade, preco_unitario, calorias, proteinas, carboidratos, gorduras)
select p.id, m.id, m.nome, 1, m.preco, m.calorias, m.proteinas, m.carboidratos, m.gorduras
from pedido p join marmita m on m.id = case p.codigo when 'CE-4830' then '00000000-0000-4000-b000-000000000007'::uuid else '00000000-0000-4000-b000-000000000001'::uuid end
where p.codigo in ('CE-4830', 'CE-4831');
-- 4) Tela 37: pedidos do Sabor Natural (CE-1035 a CE-1042) voltam para "agora", com os status e idades da tela
--    (5 a 60 min). Desfaz o que um ensaio tiver mudado. O histórico de status é refeito (as telas 18 e 37 leem dele).
create temp table alvo_37 (codigo text, minutos int, status text, passos text[], offsets int[]) on commit drop;
insert into alvo_37 values
  ('CE-1042',  5, 'NOVO',       array['NOVO'], array[0]),
  ('CE-1041', 12, 'NOVO',       array['NOVO'], array[0]),
  ('CE-1040', 18, 'PREPARANDO', array['NOVO','ACEITO','PREPARANDO'], array[0,1,4]),
  ('CE-1039', 25, 'PREPARANDO', array['NOVO','ACEITO','PREPARANDO'], array[0,2,6]),
  ('CE-1038', 32, 'PREPARANDO', array['NOVO','ACEITO','PREPARANDO'], array[0,2,9]),
  ('CE-1037', 40, 'PRONTO',     array['NOVO','ACEITO','PREPARANDO','PRONTO'], array[0,2,6,22]),
  ('CE-1036', 45, 'PRONTO',     array['NOVO','ACEITO','PREPARANDO','PRONTO'], array[0,1,5,24]),
  ('CE-1035', 60, 'ENTREGUE',   array['NOVO','ACEITO','PREPARANDO','PRONTO','A_CAMINHO','ENTREGUE'], array[0,1,6,18,21,38]);
update pedido p set status = a.status, motivo_recusa = null, previsao_entrega_em = null,
       criado_em = now() - a.minutos * interval '1 min', confirmado_em = now() - a.minutos * interval '1 min', atualizado_em = now(),
       entregue_em = case when a.status = 'ENTREGUE' then now() - (a.minutos - 38) * interval '1 min' end,
       entregador_nome = case when a.status = 'ENTREGUE' then 'Ricardo (entregador simulado)' end
from alvo_37 a where p.codigo = a.codigo;
delete from historico_status_pedido h using pedido p, alvo_37 a where h.id_pedido = p.id and p.codigo = a.codigo;
insert into historico_status_pedido (id_pedido, status, em)
select p.id, s.passo, now() - a.minutos * interval '1 min' + s.offset_min * interval '1 min'
from alvo_37 a join pedido p on p.codigo = a.codigo cross join lateral unnest(a.passos, a.offsets) as s(passo, offset_min);
