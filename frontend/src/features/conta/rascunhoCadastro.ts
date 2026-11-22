/**
 * Rascunho do cadastro em 3 etapas (CE-2), guardado no sessionStorage até a etapa 3 gravar no backend.
 * Só dados da própria pessoa — nenhuma senha é guardada aqui.
 */
export type PerfilEscolhido = 'CLIENTE' | 'NUTRICIONISTA' | 'RESTAURANTE';

export interface RascunhoCadastro {
  nome?: string;
  sobrenome?: string;
  email?: string;
  aceiteTermosEm?: string;
  perfil?: PerfilEscolhido;
}

const CHAVE = 'cleaneats.rascunho-cadastro';

export function lerRascunho(): RascunhoCadastro {
  try { return JSON.parse(sessionStorage.getItem(CHAVE) ?? '{}'); } catch { return {}; }
}

export function salvarRascunho(parcial: RascunhoCadastro) {
  try { sessionStorage.setItem(CHAVE, JSON.stringify({ ...lerRascunho(), ...parcial })); } catch { /* navegação privada */ }
}

export function limparRascunho() {
  try { sessionStorage.removeItem(CHAVE); } catch { /* ignora */ }
}

export const ROTA_DO_PERFIL: Record<PerfilEscolhido, string> = {
  CLIENTE: '/cadastro/cliente',
  NUTRICIONISTA: '/cadastro/nutricionista',
  RESTAURANTE: '/cadastro/restaurante',
};

export const ETAPAS_CADASTRO = ['Conta', 'Perfil', 'Objetivo'];
