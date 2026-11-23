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
