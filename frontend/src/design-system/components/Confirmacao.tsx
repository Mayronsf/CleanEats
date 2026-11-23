import { useEffect, useRef, type ReactNode } from 'react';
import { Botao } from './Botao';
import s from './Confirmacao.module.css';

/**
 * Diálogo de confirmação (modal nativo <dialog>: foco preso, Esc fecha).
 * Usado em ações que precisam de confirmação: trocar restaurante do carrinho, cancelar pedido, excluir conta (CE-9).
 */
export function Confirmacao({
  aberto, titulo, children, rotuloConfirmar = 'Confirmar', rotuloCancelar = 'Voltar', perigo = false, carregando = false,
  onConfirmar, onCancelar,
}: {
  aberto: boolean; titulo: string; children?: ReactNode; rotuloConfirmar?: string; rotuloCancelar?: string;
  perigo?: boolean; carregando?: boolean; onConfirmar: () => void; onCancelar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal?.();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog ref={ref} className={s.dialogo} aria-labelledby="confirmacao-titulo" onCancel={(e) => { e.preventDefault(); onCancelar(); }}>
      <div className={s.corpo}>
        <h2 id="confirmacao-titulo" className={s.titulo}>{titulo}</h2>
        {children && <div className={s.texto}>{children}</div>}
      </div>
      <div className={s.acoes}>
        <Botao variante="secundario" onClick={onCancelar} disabled={carregando}>{rotuloCancelar}</Botao>
        <Botao variante={perigo ? 'perigo' : 'primario'} onClick={onConfirmar} carregando={carregando}>{rotuloConfirmar}</Botao>
      </div>
    </dialog>
  );
}
