import { chamarApi } from './api';

/** Serviços do admin (/admin*). Dono: frente C. */
export interface NutriPendente { id: string; nome: string; email: string; crn: string; uf: string; especialidades: string[]; bio: string | null; anosExperiencia: number | null; criadoEm: string; status: string; motivo: string | null }
export interface RestaurantePendente { id: string; nome: string; dono: string; email: string; cnpj: string; cozinhas: string[]; endereco: string; criadoEm: string; status: string; motivo: string | null; cnpjValido: boolean }
export interface PratoPendente {
  id: string; nome: string; restaurante: string; categoria: string; imagemUrl: string | null; preco: number; porcaoG: number | null; calorias: number | null;
  proteinas: number | null; carboidratos: number | null; gorduras: number | null; ingredientes: string[]; alergenos: string[]; enviadoEm: string | null; macrosCoerentes: boolean;
}
export interface Aprovacoes { nutricionistas: NutriPendente[]; restaurantes: RestaurantePendente[]; pratos: PratoPendente[] }
export interface AvaliacaoAdmin {
  id: string; prato: string | null; restaurante: string; cliente: string; codigoPedido: string; nota: number; notaSabor: number | null; notaPorcao: number | null;
  notaEntrega: number | null; comentario: string | null; tags: string[]; fotos: string[]; anonima: boolean; status: string; data: string;
}
export interface Contato { id: string; nome: string; email: string; assunto: string; mensagem: string; criadoEm: string; respondidoEm: string | null }
export interface RestauranteAdmin { id: string; nome: string; status: string; comissaoPercentual: number; pedidosMes: number; vendasMes: number; comissaoMes: number; notaMedia: number }
export interface Plataforma { restaurantes: RestauranteAdmin[]; assinaturas: { ativas: number; canceladas: number; pausadas: number; receitaMensal: number } }
export interface Renovacao { dataSimulada: string; renovadas: number; expiradas: number; retomadas: number; faturado: number }
export type TipoAprovacao = 'nutricionistas' | 'restaurantes' | 'pratos';

const decidir = (caminho: string, aprovado: boolean, motivo?: string) =>
  chamarApi<void>(caminho, { method: 'POST', body: JSON.stringify({ aprovado, motivo }) });

export const buscarAprovacoes = () => chamarApi<Aprovacoes>('/admin/aprovacoes');
export const avaliarCadastro = (tipo: TipoAprovacao, id: string, aprovado: boolean, motivo?: string) => decidir(`/admin/${tipo}/${id}/avaliacao`, aprovado, motivo);
export const buscarAvaliacoesAdmin = (status: string) => chamarApi<{ avaliacoes: AvaliacaoAdmin[]; contagens: Record<string, number> }>(`/admin/avaliacoes?status=${status}`);
export const moderarAvaliacao = (id: string, aprovado: boolean, motivo?: string) => decidir(`/admin/avaliacoes/${id}/moderacao`, aprovado, motivo);
export const buscarContatos = (abertos: boolean) => chamarApi<Contato[]>(`/admin/contatos?abertos=${abertos}`);
export const marcarContato = (id: string, respondido: boolean) => chamarApi<void>(`/admin/contatos/${id}`, { method: 'PATCH', body: JSON.stringify({ respondido }) });
export const buscarPlataforma = () => chamarApi<Plataforma>('/admin/plataforma');
export const definirComissao = (id: string, percentual: number) => chamarApi<RestauranteAdmin>(`/admin/restaurantes/${id}/comissao`, { method: 'PUT', body: JSON.stringify({ percentual }) });
export const simularRenovacao = (ate: string) => chamarApi<Renovacao>('/admin/assinaturas/simular-renovacao', { method: 'POST', body: JSON.stringify({ ate }) });
