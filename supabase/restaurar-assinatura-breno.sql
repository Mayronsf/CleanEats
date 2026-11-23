-- Devolve o Breno ao estado da demo: Pro mensal desde 03/02/2026, cartão, renovação em 03/12.
delete from assinatura where id_usuario = '00000000-0000-4000-8000-000000000001' and inicio_em > timestamptz '2026-02-04';
update assinatura set status = 'ATIVA', cancelada_em = null, encerra_em = null, pausada_ate = null, forma_pagamento = 'CARTAO',
  renovacao_em = timestamp '2026-12-03 08:00' at time zone 'America/Recife'
where id_usuario = '00000000-0000-4000-8000-000000000001';
update usuario set id_tier = 'PRO' where id = '00000000-0000-4000-8000-000000000001';
delete from notificacao where id_usuario = '00000000-0000-4000-8000-000000000001' and tipo = 'ASSINATURA' and criado_em > now() - interval '1 day';
