import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { useToast } from '../../design-system';
import { LayoutPainel } from '../../app/layouts/LayoutPainel';
import { menuRestaurante } from './menu';
import { buscarResumoPainel } from '../../services/restaurante';

/**
 * Layout do painel do restaurante: contador de pedidos em andamento na sidebar e Realtime da tabela `pedido`
 * (novo pedido → aviso + telas 36/37 se atualizam sozinhas, CE-14).
 */
export function LayoutRestaurante() {
  const { usuario } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const ehRestaurante = usuario?.perfil === 'RESTAURANTE';
  const resumo = useQuery({ queryKey: ['restaurante', 'resumo'], queryFn: buscarResumoPainel, enabled: ehRestaurante, refetchInterval: 60_000 });
  const idRestaurante = resumo.data?.restaurante.id;

  useRealtime<{ codigo?: string; status?: string }>('pedido', idRestaurante ? `id_restaurante=eq.${idRestaurante}` : undefined, (linha, evento) => {
    void qc.invalidateQueries({ queryKey: ['restaurante'] });
    if (evento === 'INSERT') toast(`Novo pedido${linha.codigo ? ` ${linha.codigo}` : ''} chegou!`, 'info');
  }, '*', !!idRestaurante);

  const grupos = menuRestaurante.map((g) => ({
    ...g,
    itens: g.itens.map((i) => (i.para === '/restaurante/pedidos' && resumo.data?.emAndamento ? { ...i, contador: resumo.data.emAndamento } : i)),
  }));
  return <LayoutPainel variante="restaurante" grupos={grupos} subtitulo={resumo.data ? `${resumo.data.restaurante.nome} · parceiro` : 'Restaurante parceiro'} />;
}
