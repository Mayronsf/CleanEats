-- Faturas da assinatura Pro mensal do Breno (tela 23), uma por mês desde 03/02/2026 até o ciclo atual. Idempotente.
insert into fatura (id_assinatura, referencia, valor, status, vencimento, paga_em, criado_em)
select a.id, to_char(m, 'MM/YYYY'), a.valor, 'PAGA', m::date, m + time '08:00', m + time '08:00'
from assinatura a
cross join generate_series(date '2026-02-03', (now() at time zone 'America/Recife')::date, interval '1 month') as m
where a.id_usuario = '00000000-0000-4000-8000-000000000001' and a.status = 'ATIVA'
  and not exists (select 1 from fatura f where f.id_assinatura = a.id and f.referencia = to_char(m, 'MM/YYYY'));
-- Renovação às 08h de Recife (evita aparecer no dia anterior por causa do fuso)
update assinatura set renovacao_em = (renovacao_em at time zone 'UTC')::date + time '08:00' at time zone 'America/Recife'
where id_usuario = '00000000-0000-4000-8000-000000000001' and status = 'ATIVA' and extract(hour from renovacao_em at time zone 'America/Recife') <> 8;
