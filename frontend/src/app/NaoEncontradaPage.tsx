import { useNavigate } from 'react-router-dom';
import { EmptyState, Logo } from '../design-system';

export default function NaoEncontradaPage() {
  const navegar = useNavigate();
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '48px 16px', display: 'grid', gap: 32 }}>
      <Logo />
      <EmptyState
        titulo="Página não encontrada"
        descricao="O endereço pode ter mudado ou a página ainda não foi implementada."
        acao={{ rotulo: 'Voltar ao início', onClick: () => navegar('/') }}
      />
    </main>
  );
}
