import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Plus, Star } from 'lucide-react';
import { useToast } from '../../../design-system';
import { useAuth } from '../../../hooks/useAuth';
import { partesPreco } from '../../../lib/formato';
import { desfavoritar, favoritar, type Prato } from '../../../services/cliente';
import s from './CardPrato.module.css';

/** Card de prato do marketplace (tela 11), também usado no perfil do restaurante (14) e nos similares (12). */
export function CardPrato({ prato, onPedir, layout = 'grade' }: { prato: Prato; onPedir: () => void; layout?: 'grade' | 'lista' }) {
  const { usuario } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const fav = useMutation({
    mutationFn: () => (prato.favorito ? desfavoritar(prato.id) : favoritar(prato.id)),
    onSuccess: () => {
      toast(prato.favorito ? 'Removido dos favoritos' : 'Salvo nos favoritos', 'sucesso');
      return qc.invalidateQueries({ queryKey: ['marmitas'] });
    },
    onError: () => toast('Não foi possível atualizar o favorito', 'erro'),
  });
  const p = Number(prato.macros.proteinas);
  const c = Number(prato.macros.carboidratos);
  const g = Number(prato.macros.gorduras);
  const total = p + c + g || 1;
  const { reais, centavos } = partesPreco(Number(prato.preco));
  const link = `/app/marmitas/${prato.id}`;

  return (
    <article className={`${s.card} ${layout === 'lista' ? s.lista : ''}`}>
      <div className={s.img}>
        {prato.imagemUrl && <img src={prato.imagemUrl} alt={prato.nome} loading="lazy" />}
        <span className={s.tag}>{prato.categoria}</span>
        {usuario && (
          <button type="button" className={`${s.fav} ${prato.favorito ? s.favAtivo : ''}`} onClick={() => fav.mutate()} disabled={fav.isPending}
            aria-pressed={prato.favorito} aria-label={prato.favorito ? `Remover ${prato.nome} dos favoritos` : `Favoritar ${prato.nome}`}>
            <Heart size={17} fill={prato.favorito ? 'currentColor' : 'none'} aria-hidden />
          </button>
        )}
        {prato.totalAvaliacoes > 0 && (
          <span className={s.nota}><Star size={12} fill="currentColor" className={s.estrela} aria-hidden /> {Number(prato.nota).toFixed(1)}</span>
        )}
      </div>
      <div className={s.corpo}>
        <p className={s.rest}><span className={s.restPonto} aria-hidden />{prato.restaurante.nome} · {prato.restaurante.tempoEntregaMin}–{prato.restaurante.tempoEntregaMax} min</p>
        <h3 className={s.nome}><Link to={link}>{prato.nome}</Link></h3>
        <div className={s.barra} role="img" aria-label={`Proteínas ${Math.round((p / total) * 100)}%, carboidratos ${Math.round((c / total) * 100)}%, gorduras ${Math.round((g / total) * 100)}% dos macronutrientes`}>
          <span style={{ width: `${(p / total) * 100}%`, background: 'var(--prot)' }} />
          <span style={{ width: `${(c / total) * 100}%`, background: 'var(--carb)' }} />
          <span style={{ width: `${(g / total) * 100}%`, background: 'var(--fat)' }} />
        </div>
        <div className={s.macros}>
          <span><span className={s.ponto} style={{ background: 'var(--kcal)' }} /><strong>{prato.macros.calorias}kcal</strong></span>
          <span><span className={s.ponto} style={{ background: 'var(--prot)' }} /><strong>{Math.round(Number(prato.macros.proteinas))}g</strong> prot</span>
          <span><span className={s.ponto} style={{ background: 'var(--carb)' }} /><strong>{Math.round(Number(prato.macros.carboidratos))}g</strong> carb</span>
        </div>
        <div className={s.rodape}>
          <p className={s.preco}>R$ {reais}<small>,{centavos}</small></p>
          <button type="button" className={s.cta} onClick={onPedir} aria-label={`Pedir ${prato.nome}`}>Pedir <Plus size={14} aria-hidden /></button>
        </div>
      </div>
    </article>
  );
}
