import { Loader2 } from 'lucide-react';

export function CarregandoPagina() {
  return (
    <div role="status" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--green-primary)' }}>
      <Loader2 size={32} aria-hidden style={{ animation: 'girar 0.8s linear infinite' }} />
      <span className="sr-only">Carregando…</span>
      <style>{'@keyframes girar { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
