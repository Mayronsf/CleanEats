import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { MacrosApi, Prato, RestauranteMini } from '../../services/cliente';

/**
 * Carrinho do cliente (tela 16). Persistido no navegador por usuário. Um pedido = um restaurante
 * (a tabela `pedido` tem um id_restaurante), então adicionar de outro restaurante pede para trocar.
 * O preço aqui é só exibição: o backend recalcula tudo na prévia e na confirmação (CE-9).
 */
export interface ItemCarrinho {
  chave: string;                 // id do prato, ou "monte-<uuid>" para marmita personalizada
  idMarmita: string | null;
  nome: string;
  imagemUrl: string | null;
  precoUnitario: number;
  quantidade: number;
  macros: MacrosApi;
  observacao?: string;
  personalizacao?: Record<string, unknown>;
}

export type ResultadoAdicao = 'adicionado' | 'outro-restaurante';

interface Estado { restaurante: RestauranteMini | null; itens: ItemCarrinho[] }

interface CarrinhoCtx extends Estado {
  totalItens: number;
  subtotal: number;
  adicionarPrato: (prato: Prato, quantidade?: number, opcoes?: { substituir?: boolean; observacao?: string }) => ResultadoAdicao;
  adicionarItem: (restaurante: RestauranteMini, item: ItemCarrinho, substituir?: boolean) => ResultadoAdicao;
  alterarQuantidade: (chave: string, quantidade: number) => void;
  remover: (chave: string) => void;
  limpar: () => void;
}

const VAZIO: Estado = { restaurante: null, itens: [] };
const Ctx = createContext<CarrinhoCtx | null>(null);

function ler(chave: string): Estado {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as Estado) : VAZIO;
  } catch { return VAZIO; }
}

export function CarrinhoProvider({ idUsuario, children }: { idUsuario: string | undefined; children: ReactNode }) {
  const chaveStorage = `cleaneats.carrinho.${idUsuario ?? 'anonimo'}`;
  const [estado, setEstado] = useState<Estado>(() => ler(chaveStorage));
  const atualRef = useRef(estado);
  atualRef.current = estado;

  useEffect(() => { setEstado(ler(chaveStorage)); }, [chaveStorage]);
  useEffect(() => {
    try { localStorage.setItem(chaveStorage, JSON.stringify(estado)); } catch { /* modo privado: segue só em memória */ }
  }, [chaveStorage, estado]);

  const adicionarItem = useCallback((restaurante: RestauranteMini, item: ItemCarrinho, substituir = false): ResultadoAdicao => {
    const agora = atualRef.current;
    if (agora.restaurante && agora.restaurante.id !== restaurante.id && agora.itens.length > 0 && !substituir) return 'outro-restaurante';
    setEstado((atual) => {
      const outro = atual.restaurante && atual.restaurante.id !== restaurante.id;
      const base = outro ? [] : atual.itens;
      const existente = base.find((i) => i.chave === item.chave);
      const itens = existente
        ? base.map((i) => (i.chave === item.chave ? { ...i, quantidade: Math.min(20, i.quantidade + item.quantidade), observacao: item.observacao ?? i.observacao } : i))
        : [...base, item];
      return { restaurante, itens };
    });
    return 'adicionado';
  }, []);

  const adicionarPrato = useCallback<CarrinhoCtx['adicionarPrato']>((prato, quantidade = 1, opcoes = {}) =>
    adicionarItem(prato.restaurante, {
      chave: prato.id, idMarmita: prato.id, nome: prato.nome, imagemUrl: prato.imagemUrl, precoUnitario: Number(prato.preco),
      quantidade, macros: prato.macros, observacao: opcoes.observacao,
    }, opcoes.substituir), [adicionarItem]);

  const valor = useMemo<CarrinhoCtx>(() => ({
    ...estado,
    totalItens: estado.itens.reduce((s, i) => s + i.quantidade, 0),
    subtotal: Math.round(estado.itens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0) * 100) / 100,
    adicionarPrato,
    adicionarItem,
    alterarQuantidade: (chave, quantidade) => setEstado((a) => ({
      ...a, itens: a.itens.map((i) => (i.chave === chave ? { ...i, quantidade: Math.max(1, Math.min(20, quantidade)) } : i)),
    })),
    remover: (chave) => setEstado((a) => {
      const itens = a.itens.filter((i) => i.chave !== chave);
      return { restaurante: itens.length ? a.restaurante : null, itens };
    }),
    limpar: () => setEstado(VAZIO),
  }), [estado, adicionarPrato, adicionarItem]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useCarrinho() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCarrinho precisa estar dentro de <CarrinhoProvider>');
  return ctx;
}
