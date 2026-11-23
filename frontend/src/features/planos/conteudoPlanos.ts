import type { PlanoTier } from '../../design-system';
import type { CodigoTier, Tier } from '../../services/planos';

/**
 * Microcopy da tela 09. Os NÚMEROS (preços, desconto, limite do NutriBot, entrega grátis, nutricionista,
 * prescrição) vêm da tabela `tier` via API; aqui ficam só os textos descritivos da tela.
 */
const pct = (v: number) => `${Number(v).toLocaleString('pt-BR')}%`;
const nutribot = (t: Tier) => (t.limiteNutribotDia === -1 ? 'ilimitado' : `${t.limiteNutribotDia} dúvidas/dia`);

const TEXTOS: Record<CodigoTier, { descricao: string; cta: string; tituloInclui: string; etiqueta?: string }> = {
  FREE: { descricao: 'Pra conhecer o marketplace e fazer pedidos avulsos.', cta: 'Continuar grátis', tituloInclui: 'Inclui' },
  BASIC: { descricao: 'Pra quem quer organizar a alimentação com mais controle.', cta: 'Assinar Basic', tituloInclui: 'Tudo do Free, mais' },
  PRO: { descricao: 'Plano alimentar montado por nutricionista com CRN.', cta: 'Começar com Pro', tituloInclui: 'Tudo do Basic, mais', etiqueta: 'Mais escolhido' },
  PREMIUM: { descricao: 'Atendimento exclusivo, prescrição digital e descontos.', cta: 'Quero ser Premium', tituloInclui: 'Tudo do Pro, mais', etiqueta: 'VIP' },
};

function recursos(t: Tier): { inclui: string[]; naoInclui: string[] } {
  switch (t.codigo) {
    case 'FREE':
      return {
        inclui: ['Marketplace com 120+ restaurantes', 'Filtros básicos (categoria, preço)', 'Histórico dos últimos 10 pedidos', 'Avaliar marmitas consumidas'],
        naoInclui: ['Plano alimentar personalizado', 'Nutricionista dedicado', 'NutriBot contextualizado'],
      };
    case 'BASIC':
      return {
        inclui: ['Histórico completo de pedidos', 'Filtros avançados (macros, restrições)', 'Tracking diário de calorias e macros', `NutriBot básico (${nutribot(t)})`, 'Lista de favoritos ilimitada'],
        naoInclui: ['Plano alimentar de nutricionista', 'Prescrição digital'],
      };
    case 'PRO':
      return {
        inclui: [
          ...(t.nutricionistaDedicado ? ['Nutricionista dedicado com CRN', 'Plano alimentar semanal personalizado'] : []),
          `NutriBot contextualizado ${nutribot(t)}`, 'Pedido com 1 clique do plano', 'Mensagem direta com nutri (até 2x/sem)',
          'Acompanhamento de adesão e evolução', 'Suporte prioritário',
        ],
        naoInclui: [],
      };
    case 'PREMIUM':
      return {
        inclui: [
          ...(t.prescricaoDigital ? ['Prescrição digital com CRN'] : []),
          ...(t.descontoPedido > 0 ? [`${pct(t.descontoPedido)} de desconto em todos os pedidos`] : []),
          'Atendimento VIP em até 2h', 'Mensagens ilimitadas com nutri', 'Revisão semanal do plano',
          ...(t.entregaGratisAcima ? [`Entrega gratuita em pedidos +R$${Number(t.entregaGratisAcima).toLocaleString('pt-BR')}`] : []),
          'Relatórios mensais detalhados', 'Acesso antecipado a novos pratos',
        ],
        naoInclui: [],
      };
  }
}

export function montarPlano(t: Tier): PlanoTier {
  const txt = TEXTOS[t.codigo];
  return { codigo: t.codigo, nome: t.nome, precoMensal: Number(t.precoMensal), precoAnual: Number(t.precoAnual), ...txt, ...recursos(t) };
}

/** Linhas da tabela "Compare todos os recursos" — valores numéricos vindos da API. */
export type Celula = boolean | string;
export interface LinhaComparativo { recurso: string; valores: (t: Tier) => Celula }
export const COMPARATIVO: { categoria: string; linhas: LinhaComparativo[] }[] = [
  { categoria: 'Marketplace', linhas: [
    { recurso: 'Acesso ao marketplace completo', valores: () => true },
    { recurso: 'Filtros avançados (macros, restrições)', valores: (t) => t.codigo !== 'FREE' },
    { recurso: 'Desconto em pedidos', valores: (t) => (t.descontoPedido > 0 ? pct(t.descontoPedido) : false) },
    { recurso: 'Entrega gratuita acima de R$30', valores: (t) => !!t.entregaGratisAcima },
  ] },
  { categoria: 'Nutrição', linhas: [
    { recurso: 'Tracking de macros', valores: (t) => t.codigo !== 'FREE' },
    { recurso: 'Nutricionista dedicado com CRN', valores: (t) => t.nutricionistaDedicado },
    { recurso: 'Plano alimentar personalizado', valores: (t) => (t.codigo === 'PREMIUM' ? 'Semanal + revisões' : t.nutricionistaDedicado ? 'Semanal' : false) },
    { recurso: 'Prescrição digital com CRN', valores: (t) => t.prescricaoDigital },
  ] },
  { categoria: 'NutriBot', linhas: [
    { recurso: 'NutriBot disponível', valores: (t) => (t.limiteNutribotDia === 0 ? false : t.limiteNutribotDia === -1 ? 'Ilimitado' : `${t.limiteNutribotDia} dúvidas/dia`) },
    { recurso: 'Contexto do seu plano nas respostas', valores: (t) => t.nutricionistaDedicado },
  ] },
  { categoria: 'Suporte', linhas: [
    { recurso: 'Tempo de resposta', valores: (t) => ({ FREE: '72h', BASIC: '24h', PRO: '4h', PREMIUM: '2h (VIP)' })[t.codigo] },
    { recurso: 'Mensagens diretas com nutri', valores: (t) => (t.codigo === 'PREMIUM' ? 'Ilimitadas' : t.nutricionistaDedicado ? '2x/semana' : false) },
  ] },
];

export const FAQ: { pergunta: string; resposta: string }[] = [
  { pergunta: 'Posso mudar de plano depois?', resposta: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento. No upgrade, ajustamos a cobrança proporcional. No downgrade, o novo plano vale a partir do próximo ciclo.' },
  { pergunta: 'Como funciona o trial de 7 dias?', resposta: 'Você testa o plano completo por 7 dias sem cobrança. Se cancelar antes do fim do período, não cobramos nada. Após 7 dias, a cobrança é automática conforme o plano escolhido.' },
  { pergunta: 'Qual a diferença entre Basic e Pro?', resposta: 'O Basic é pra quem quer organizar a alimentação por conta própria (com tracking e NutriBot básico). O Pro adiciona um nutricionista real com CRN, que monta seu plano alimentar semanal com pratos do marketplace.' },
  { pergunta: 'O Premium vale a pena?', resposta: 'Se você pede 3+ vezes por semana, o desconto de 15% e entrega gratuita já pagam o plano. Além disso, ganha prescrição digital, atendimento VIP e revisões semanais do plano.' },
  { pergunta: 'Existe cobrança extra por restaurante?', resposta: 'Não. Sua assinatura cobre acesso ao marketplace e funcionalidades. Você paga separadamente apenas pelos pedidos feitos — com desconto nos planos Pro e Premium.' },
  { pergunta: 'Como cancelo minha assinatura?', resposta: 'É bem simples: vá em Configurações → Assinatura → Cancelar. Você mantém os benefícios até o fim do período pago. Sem perguntas, sem retenção forçada.' },
];
