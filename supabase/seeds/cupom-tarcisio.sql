-- Cupom promocional (30% de desconto nos pratos). Idempotente.
insert into cupom (codigo, descricao, percentual, valor_fixo, valido_ate, uso_maximo, ativo)
values ('TARCISIOAPROVA', 'Desconto especial de 30%', 30.00, null, '2027-12-31', null, true)
on conflict (codigo) do update
  set descricao  = excluded.descricao,
      percentual = excluded.percentual,
      valor_fixo = null,
      valido_ate = excluded.valido_ate,
      uso_maximo = null,
      ativo      = true;
