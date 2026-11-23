-- Forma de pagamento da assinatura (tela 23: "Próxima cobrança" e "Trocar"). Cobrança SIMULADA: só registra a escolha.
alter table assinatura add column if not exists forma_pagamento text not null default 'CARTAO'
  check (forma_pagamento in ('PIX', 'CARTAO'));
