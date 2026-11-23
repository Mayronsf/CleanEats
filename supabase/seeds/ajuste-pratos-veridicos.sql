-- Ajustes de nomes e fotos dos pratos e bebidas para ficarem 100% verídicos e consistentes. Idempotente.
update marmita set imagem_url = '/img/pratos/bowl-mediterraneo.jpg'
  where id = '00000000-0000-4000-b000-000000000015';

update marmita set nome = 'Água de Coco Natural 300ml', imagem_url = '/img/pratos/agua-de-coco.jpg'
  where id = '00000000-0000-4000-b000-000000000023';

update marmita set nome = 'Suco Natural de Laranja 300ml', imagem_url = '/img/pratos/suco-natural.jpg'
  where id = '00000000-0000-4000-b000-000000000024';

update marmita set imagem_url = '/img/pratos/suco-verde-detox.jpg'
  where id = '00000000-0000-4000-b000-000000000022';

update marmita set nome = 'Wrap Integral de Frango Grelhado'
  where id = '00000000-0000-4000-b000-000000000020';

update marmita set nome = 'Açaí Vegano com Chia e Frutas'
  where id = '00000000-0000-4000-b000-000000000005';
