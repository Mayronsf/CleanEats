import { chamarApi } from '../api';

export interface ConversaNutriLinha {
  idConversa: string;
  idCliente: string;
  nome: string;
  avatarUrl: string | null;
  tier: 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM';
  ultimaMensagem: string | null;
  ultimaMensagemEm: string | null;
  naoLidas: number;
}

export interface MensagemNutri {
  id: string;
  idAutor: string;
  texto: string;
  criadoEm: string;
  lidaEm: string | null;
}

export interface ConversaNutriAberta {
  idConversa: string;
  idCliente: string;
  nome: string;
  avatarUrl: string | null;
  tier: ConversaNutriLinha['tier'];
  mensagens: MensagemNutri[];
}

export const listarConversasNutri = (busca: string) =>
  chamarApi<ConversaNutriLinha[]>(`/nutri/conversas${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`);

export const buscarMensagensNutri = (idConversa: string) =>
  chamarApi<MensagemNutri[]>(`/nutri/conversas/${idConversa}/mensagens`);

export const enviarMensagemNutri = (idConversa: string, texto: string) =>
  chamarApi<MensagemNutri>(`/nutri/conversas/${idConversa}/mensagens`, {
    method: 'POST', body: JSON.stringify({ texto }),
  });

export const abrirConversaNutri = (idCliente: string) =>
  chamarApi<ConversaNutriAberta>(`/nutri/conversas/cliente/${idCliente}`, { method: 'POST' });
