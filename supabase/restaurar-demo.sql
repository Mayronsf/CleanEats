-- Reset de ensaio (rode antes da apresentação, depois de npm run banco:hoje): npm run banco:sql supabase/restaurar-demo.sql
-- Devolve o Breno ao estado da demo: Pro mensal desde 03/02/2026, cartão, renovação em 03/12.
delete from assinatura where id_usuario = '00000000-0000-4000-8000-000000000001' and inicio_em > timestamptz '2026-02-04';
update assinatura set status = 'ATIVA', cancelada_em = null, encerra_em = null, pausada_ate = null, forma_pagamento = 'CARTAO',
  renovacao_em = timestamp '2026-12-03 08:00' at time zone 'America/Recife'
where id_usuario = '00000000-0000-4000-8000-000000000001';
update usuario set id_tier = 'PRO' where id = '00000000-0000-4000-8000-000000000001';
delete from notificacao where id_usuario = '00000000-0000-4000-8000-000000000001' and tipo = 'ASSINATURA' and criado_em > now() - interval '1 day';
-- Avaliações feitas pelo Breno em ensaios (as do seed têm datas antigas): o roteiro 4.3 avalia ao vivo.
delete from avaliacao where id_usuario = '00000000-0000-4000-8000-000000000001' and data_avaliacao > now() - interval '2 days';
delete from notificacao where tipo = 'SISTEMA' and titulo = 'Avaliação para moderar' and criado_em > now() - interval '2 days';
-- Fila do admin (/admin e /admin/avaliacoes) volta ao estado da demo
update marmita set status_prato = 'EM_ANALISE', motivo_rejeicao = null, avaliado_por = null, avaliado_em = null
where nome = 'Wrap Integral Frango' and id_restaurante = '00000000-0000-4000-a000-000000000001' and status_prato <> 'APROVADO' and enviado_analise_em is not null;
update nutricionista set status_aprovacao = 'PENDENTE', motivo_rejeicao = null, avaliado_por = null, avaliado_em = null where id_usuario = '00000000-0000-4000-8000-000000000052';
update restaurante set status_aprovacao = 'PENDENTE', motivo_rejeicao = null, avaliado_por = null, avaliado_em = null where id = '00000000-0000-4000-a000-000000000051';
update avaliacao a set status_moderacao = 'PENDENTE' from pedido p where p.id = a.id_pedido and p.codigo in ('CE-5101', 'CE-5102');
update marmita set nota_media = 4.8, total_avaliacoes = 28 where nome = 'Marmita Fit Salmão' and id_restaurante = '00000000-0000-4000-a000-000000000001';
update marmita set nota_media = 4.8, total_avaliacoes = 48 where nome = 'Bowl Proteico Frango' and id_restaurante = '00000000-0000-4000-a000-000000000001';
update restaurante set nota_media = 4.9, total_avaliacoes = 312, comissao_percentual = 8 where id = '00000000-0000-4000-a000-000000000001';
update restaurante set comissao_percentual = 8 where comissao_percentual <> 8;
