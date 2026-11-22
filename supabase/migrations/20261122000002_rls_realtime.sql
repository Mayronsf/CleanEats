-- =====================================================================
-- CleanEats — Row Level Security + Realtime
-- Regra: RLS ligada em tudo. As escritas passam SEMPRE pelo backend
-- (role postgres, que ignora RLS). O cliente Supabase do navegador só
-- precisa LER: o catálogo público e os próprios dados que chegam por
-- Realtime (status do pedido, mensagens, notificações).
-- =====================================================================

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Catálogo público (marketplace, ficha técnica via QR Code)
create policy tier_leitura_publica on tier for select to anon, authenticated using (true);
create policy restricao_leitura_publica on restricao_alimentar for select to anon, authenticated using (true);
create policy restaurante_publico on restaurante for select to anon, authenticated
  using (status_aprovacao = 'APROVADO');
create policy marmita_publica on marmita for select to anon, authenticated
  using (status_prato = 'APROVADO');
create policy ingrediente_publico on ingrediente_marmita for select to anon, authenticated
  using (exists (select 1 from marmita m where m.id = id_marmita and m.status_prato = 'APROVADO'));

-- Próprio usuário
create policy usuario_proprio on usuario for select to authenticated using (id = auth.uid());
create policy notificacao_propria on notificacao for select to authenticated using (id_usuario = auth.uid());

-- Pedidos: cliente dono ou restaurante do pedido
create policy pedido_participantes on pedido for select to authenticated using (
  id_usuario = auth.uid()
  or exists (select 1 from restaurante r where r.id = id_restaurante and r.id_usuario = auth.uid())
);
create policy historico_pedido_participantes on historico_status_pedido for select to authenticated using (
  exists (
    select 1 from pedido p
    left join restaurante r on r.id = p.id_restaurante
    where p.id = id_pedido and (p.id_usuario = auth.uid() or r.id_usuario = auth.uid())
  )
);

-- Mensagens: só os dois participantes da conversa
create policy conversa_participantes on conversa for select to authenticated using (
  id_cliente = auth.uid()
  or exists (select 1 from nutricionista n where n.id = id_nutricionista and n.id_usuario = auth.uid())
);
create policy mensagem_participantes on mensagem for select to authenticated using (
  exists (
    select 1 from conversa c
    join nutricionista n on n.id = c.id_nutricionista
    where c.id = id_conversa and (c.id_cliente = auth.uid() or n.id_usuario = auth.uid())
  )
);

-- Realtime: tabelas que o front escuta
alter publication supabase_realtime add table pedido, historico_status_pedido, mensagem, notificacao;
