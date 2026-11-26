import { API_URL, chamarApi, ErroApi } from '../api';
import { supabase } from '../supabase';

export interface IndicadorNutri { titulo: string; valor: string; detalhe: string }
export interface LinhaDashboardNutri { id: string; nome: string; resumo: string; data: string | null; tipo: string; avatarUrl: string | null }
export interface DashboardNutri { nome: string; statusAprovacao: string; motivoRejeicao: string | null; indicadores: IndicadorNutri[]; triagens: LinhaDashboardNutri[]; mensagens: LinhaDashboardNutri[]; clientes: LinhaDashboardNutri[] }
export interface AssinanteNutri { id: string; nome: string; tier: string; mensalidade: number; repasse: number; inicioEm: string; status: string }
export interface FinanceiroNutri { bruto: number; liquido: number; clientesPagantes: number; ticketMedio: number; meses: { mes: string; bruto: number; liquido: number }[]; assinantes: AssinanteNutri[]; chavePix: string | null }
export interface HorarioNutri { dia: number; inicio: string; fim: string }
export interface PerfilNutri { nome: string; email: string; telefone: string | null; crn: string; crnUf: string; statusAprovacao: string; motivoRejeicao: string | null; bio: string | null; especialidades: string[]; anosExperiencia: number | null; disponibilidade: HorarioNutri[]; maxClientes: number | null; chavePix: string | null; assinaturaDigitalUrl: string | null }
export type PerfilEdicaoNutri = Pick<PerfilNutri, 'nome'|'telefone'|'bio'|'especialidades'|'anosExperiencia'|'disponibilidade'|'maxClientes'|'chavePix'>;

export const buscarDashboardNutri = () => chamarApi<DashboardNutri>('/nutri/dashboard');
export const buscarFinanceiroNutri = () => chamarApi<FinanceiroNutri>('/nutri/financeiro');
export const buscarPerfilNutri = () => chamarApi<PerfilNutri>('/nutri/perfil');
export const salvarPerfilNutri = (dados: PerfilEdicaoNutri) => chamarApi<PerfilNutri>('/nutri/perfil', { method: 'PUT', body: JSON.stringify(dados) });
export const enviarAssinaturaNutri = (arquivo: File) => { const form=new FormData(); form.append('arquivo',arquivo); return chamarApi<{url:string}>('/nutri/perfil/assinatura',{method:'POST',body:form}); };
export const baixarFinanceiroNutri = async () => {
  const { data } = await supabase.auth.getSession();
  const resposta = await fetch(`${API_URL}/nutri/financeiro/pdf`, { headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {} });
  if (!resposta.ok) { const erro=await resposta.json().catch(()=>null); throw new ErroApi(resposta.status,erro?.codigo??'ERRO',erro?.mensagem??'Não foi possível exportar o financeiro em PDF.'); }
  const url=URL.createObjectURL(await resposta.blob()); const a=document.createElement('a'); a.href=url; a.download='financeiro-nutri.pdf'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
};
