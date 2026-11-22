/**
 * Dados de EXEMPLO usados só na vitrine /design-system (copiados das telas HTML).
 * Telas reais nunca importam daqui: tudo vem da API/seed.
 */
import type { PratoResumo, RestauranteResumo, PlanoTier, Mensagem, EventoStatus } from '../../design-system';

export const pratosExemplo: PratoResumo[] = [
  { id: 'exemplo-1', nome: 'Frango Grelhado Fitness', imagemUrl: '/img/pratos/frango-grelhado-fitness.jpg', categoria: 'Alta Proteína', preco: 24.9, nota: 4.9, restaurante: { nome: 'Sabor Natural', distanciaKm: 1.2 }, macros: { calorias: 420, proteinas: 38, carboidratos: 32, gorduras: 12 } },
  { id: 'exemplo-2', nome: 'Bowl Vegano Power', imagemUrl: '/img/pratos/bowl-vegano-power.jpg', categoria: 'Vegano', preco: 22.9, nota: 4.8, restaurante: { nome: 'Verde Vida', distanciaKm: 2.4 }, macros: { calorias: 380, proteinas: 18, carboidratos: 52, gorduras: 8 } },
  { id: 'exemplo-3', nome: 'Salmão com Quinoa', imagemUrl: '/img/pratos/salmao-com-quinoa.jpg', categoria: 'Sem Glúten', preco: 32.9, nota: 4.9, restaurante: { nome: 'Mar & Terra', distanciaKm: 3.1 }, macros: { calorias: 480, proteinas: 35, carboidratos: 28, gorduras: 22 } },
];

export const restauranteExemplo: RestauranteResumo = {
  id: 'exemplo-r1', nome: 'Sabor Natural', sigla: 'SN', capaUrl: '/img/pratos/steak-com-batata-doce.jpg',
  cozinhas: ['Fitness', 'Saudável', 'Low Carb'], nota: 4.9, totalAvaliacoes: 312, distanciaKm: 1.2,
  tempoEntrega: '25-35min', taxaEntrega: 6, pratosDisponiveis: 32, aberto: true, destaque: true,
};

export const restauranteFechadoExemplo: RestauranteResumo = {
  id: 'exemplo-r2', nome: 'Rota Proteica', sigla: 'RP', capaUrl: '/img/pratos/wrap-integral-light.jpg',
  cozinhas: ['Fitness', 'Sem Glúten'], nota: 4.8, totalAvaliacoes: 140, distanciaKm: 2.0,
  tempoEntrega: '30-45min', taxaEntrega: 8, pratosDisponiveis: 26, aberto: false, abreAs: '18:00',
};

export const planosExemplo: PlanoTier[] = [
  { codigo: 'FREE', nome: 'Free', descricao: 'Pra conhecer o marketplace e fazer pedidos avulsos.', precoMensal: 0, precoAnual: 0, tituloInclui: 'Inclui', inclui: ['Marketplace com 120+ restaurantes', 'Filtros básicos (categoria, preço)', 'Histórico dos últimos 10 pedidos', 'Avaliar marmitas consumidas'], naoInclui: ['Plano alimentar personalizado', 'Nutricionista dedicado', 'NutriBot contextualizado'], cta: 'Continuar grátis' },
  { codigo: 'BASIC', nome: 'Basic', descricao: 'Pra quem quer organizar a alimentação com mais controle.', precoMensal: 29.9, precoAnual: 286.8, tituloInclui: 'Tudo do Free, mais', inclui: ['Histórico completo de pedidos', 'Filtros avançados (macros, restrições)', 'Tracking diário de calorias e macros', 'NutriBot básico (5 dúvidas/dia)', 'Lista de favoritos ilimitada'], naoInclui: ['Plano alimentar de nutricionista', 'Prescrição digital'], cta: 'Assinar Basic' },
  { codigo: 'PRO', nome: 'Pro', descricao: 'Plano alimentar montado por nutricionista com CRN.', precoMensal: 59.9, precoAnual: 574.8, tituloInclui: 'Tudo do Basic, mais', inclui: ['Nutricionista dedicado com CRN', 'Plano alimentar semanal personalizado', 'NutriBot contextualizado ilimitado', 'Pedido com 1 clique do plano', 'Mensagem direta com nutri (até 2x/sem)'], naoInclui: [], cta: 'Começar com Pro', etiqueta: 'Mais escolhido' },
  { codigo: 'PREMIUM', nome: 'Premium', descricao: 'Atendimento exclusivo, prescrição digital e descontos.', precoMensal: 89.9, precoAnual: 862.8, tituloInclui: 'Tudo do Pro, mais', inclui: ['Prescrição digital com CRN', '15% de desconto em todos os pedidos', 'Atendimento VIP em até 2h', 'Mensagens ilimitadas com nutri', 'Entrega gratuita em pedidos +R$30'], naoInclui: [], cta: 'Quero ser Premium', etiqueta: 'VIP' },
];

export const mensagensExemplo: Mensagem[] = [
  { id: 'm1', autor: 'usuario', texto: 'Posso comer uma pizza hoje à noite?', em: '2026-11-22T19:02:00-03:00' },
  { id: 'm2', autor: 'outro', contexto: 'Com base no seu plano de hoje', texto: 'Você já consumiu 1.420 de 2.200 kcal e 96 g de 140 g de proteína.\n\nUma fatia de pizza margherita (~280 kcal) cabe no seu dia, mas o ideal é priorizar proteína no jantar. Quer ver opções do seu plano?', em: '2026-11-22T19:02:20-03:00' },
];

export const historicoStatusExemplo: EventoStatus[] = [
  { status: 'NOVO', em: '2026-11-22T12:02:00-03:00' },
  { status: 'ACEITO', em: '2026-11-22T12:04:00-03:00' },
  { status: 'PREPARANDO', em: '2026-11-22T12:10:00-03:00' },
];
