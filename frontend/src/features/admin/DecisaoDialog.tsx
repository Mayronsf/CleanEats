import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import s from './Admin.module.css';

/** Diálogo de rejeição com motivo obrigatório (curadoria e moderação). O motivo chega ao dono por notificação. */
export function DecisaoDialog({ aberto, titulo, sugestoes, carregando, onFechar, onConfirmar }: {
  aberto: boolean; titulo: string; sugestoes: string[]; carregando: boolean; onFechar: () => void; onConfirmar: (motivo: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [motivo, setMotivo] = useState('');
  useEffect(() => { if (aberto) { setMotivo(''); ref.current?.showModal?.(); } else ref.current?.close?.(); }, [aberto]);
  return (
    <dialog ref={ref} className={s.dialogo} aria-labelledby="decisao-titulo" onCancel={(e) => { e.preventDefault(); onFechar(); }}>
      <div className={s.dialogoTopo}><h2 id="decisao-titulo">{titulo}</h2><button type="button" onClick={onFechar} aria-label="Fechar"><X size={18} aria-hidden /></button></div>
      <p className={s.dialogoSub}>O motivo é enviado ao responsável para que ele possa corrigir.</p>
      <div className={s.sugestoes}>{sugestoes.map((m) => <button key={m} type="button" className={motivo === m ? s.sugestaoAtiva : undefined} onClick={() => setMotivo(m)}>{m}</button>)}</div>
      <label htmlFor="motivo-decisao" className={s.rotulo}>Motivo</label>
      <textarea id="motivo-decisao" rows={3} maxLength={400} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <div className={s.dialogoAcoes}>
        <button type="button" className={s.botaoClaro} onClick={onFechar}>Voltar</button>
        <button type="button" className={s.botaoPerigo} disabled={motivo.trim().length < 5 || carregando} onClick={() => onConfirmar(motivo.trim())}>{carregando ? 'Enviando…' : 'Rejeitar'}</button>
      </div>
    </dialog>
  );
}
