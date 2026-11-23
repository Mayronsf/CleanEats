import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Confirmacao, useToast } from '../../design-system';
import { useCarrinho } from '../../hooks/cliente/useCarrinho';
import type { Prato } from '../../services/cliente';

/**
 * Adiciona um prato ao carrinho a partir de qualquer tela (home, marketplace, detalhe, meu plano).
 * Se o carrinho tem itens de outro restaurante, pergunta antes de trocar. Renderize `dialogo` na página.
 */
export function useAdicionarAoCarrinho() {
  const carrinho = useCarrinho();
  const toast = useToast();
  const navegar = useNavigate();
  const [pendente, setPendente] = useState<{ prato: Prato; quantidade: number; irParaCarrinho: boolean; observacao?: string } | null>(null);

  function concluir(prato: Prato, quantidade: number, irParaCarrinho: boolean) {
    if (irParaCarrinho) navegar('/app/carrinho');
    else toast(`${quantidade > 1 ? `${quantidade}× ` : ''}${prato.nome} no carrinho`, 'sucesso');
  }

  function adicionar(prato: Prato, opcoes: { quantidade?: number; irParaCarrinho?: boolean; observacao?: string } = {}) {
    const quantidade = opcoes.quantidade ?? 1;
    const irParaCarrinho = opcoes.irParaCarrinho ?? false;
    const r = carrinho.adicionarPrato(prato, quantidade, { observacao: opcoes.observacao });
    if (r === 'outro-restaurante') setPendente({ prato, quantidade, irParaCarrinho, observacao: opcoes.observacao });
    else concluir(prato, quantidade, irParaCarrinho);
  }

  const dialogo = (
    <Confirmacao
      aberto={pendente !== null}
      titulo="Trocar de restaurante?"
      rotuloConfirmar="Esvaziar e adicionar"
      onCancelar={() => setPendente(null)}
      onConfirmar={() => {
        if (!pendente) return;
        carrinho.adicionarPrato(pendente.prato, pendente.quantidade, { substituir: true, observacao: pendente.observacao });
        concluir(pendente.prato, pendente.quantidade, pendente.irParaCarrinho);
        setPendente(null);
      }}
    >
      Seu carrinho tem itens do <strong>{carrinho.restaurante?.nome}</strong>. Cada pedido é de um restaurante só:
      ao continuar, o carrinho é esvaziado e o <strong>{pendente?.prato.nome}</strong> do {pendente?.prato.restaurante.nome} entra no lugar.
    </Confirmacao>
  );

  return { adicionar, dialogo };
}
