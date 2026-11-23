import { chamarApi } from './api';

export type CodigoTier = 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM';
export type Ciclo = 'MENSAL' | 'ANUAL';
export type FormaPagamento = 'PIX' | 'CARTAO';

export interface Tier {
  codigo: CodigoTier;
  nome: string;
  precoMensal: number;
  precoAnual: number;
  descontoPedido: number;
  limiteNutribotDia: number;   // -1 = ilimitado, 0 = indisponível
  nutricionistaDedicado: boolean;
  prescricaoDigital: boolean;
  entregaGratisAcima: number | null;
}

/** GET /api/tiers (sessão principal). */
export const buscarTiers = () => chamarApi<Tier[]>('/tiers');

/**
 * POST /api/assinatura — implementado pela FRENTE A (tela 23). Contrato: assina ou troca de plano com
 * pagamento SIMULADO (aprova na hora, gera fatura PAGA) e atualiza usuario.id_tier imediatamente (CE-15).
 */
export const assinarPlano = (tier: CodigoTier, ciclo: Ciclo, formaPagamento: FormaPagamento) =>
  chamarApi<{ tier: CodigoTier; ciclo: Ciclo; renovacaoEm: string }>('/assinatura', {
    method: 'POST', body: JSON.stringify({ tier, ciclo, formaPagamento }),
  });

/** Economia anual máxima entre os planos (selo "Economize até R$ X/ano"). */
export const economiaAnualMaxima = (tiers: Tier[]) =>
  Math.max(0, ...tiers.map((t) => t.precoMensal * 12 - t.precoAnual));
