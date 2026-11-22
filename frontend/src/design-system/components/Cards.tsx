import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bike, Clock, Heart, MapPin } from 'lucide-react';
import { MacroBar, type Macros } from './Macros';
import { Preco, RatingStars } from './Basicos';
import s from './Cards.module.css';

/* ---------- MarketplaceCard / PratoCard ---------- */
export interface PratoResumo {
  id: string;
  nome: string;
  imagemUrl: string;
  categoria: string;
  preco: number;
  nota: number;
  restaurante: { nome: string; distanciaKm?: number };
  macros: Macros;
}

export function MarketplaceCard({ prato, favorito = false, onFavoritar, onPedir }: {
  prato: PratoResumo; favorito?: boolean; onFavoritar?: () => void; onPedir?: () => void;
}) {
  const link = `/app/marmitas/${prato.id}`;
  return (
    <article className={s.prato}>
      <div className={s.pratoImg}>
        <img src={prato.imagemUrl} alt={prato.nome} loading="lazy" />
        <span className={s.pratoTag}>{prato.categoria}</span>
        {onFavoritar && (
          <button type="button" className={`${s.fav} ${favorito ? s.favAtivo : ''}`} onClick={onFavoritar}
            aria-pressed={favorito} aria-label={favorito ? `Remover ${prato.nome} dos favoritos` : `Favoritar ${prato.nome}`}>
            <Heart size={18} aria-hidden fill={favorito ? 'currentColor' : 'none'} />
          </button>
        )}
        <span className={s.notaBadge}><RatingStars nota={prato.nota} /></span>
      </div>
      <p className={s.pratoRest}>
        <span className={s.pontoVerde} aria-hidden />
        {prato.restaurante.nome}{prato.restaurante.distanciaKm !== undefined && ` · ${prato.restaurante.distanciaKm.toLocaleString('pt-BR')}km`}
      </p>
      <h3 className={s.pratoNome}><Link to={link}>{prato.nome}</Link></h3>
      <MacroBar macros={prato.macros} />
      <div className={s.pratoRodape}>
        <Preco valor={prato.preco} />
        {onPedir
          ? <button type="button" className={s.cta} onClick={onPedir}>Pedir +</button>
          : <Link to={link} className={s.cta}>Pedir +</Link>}
      </div>
    </article>
  );
}
export const PratoCard = MarketplaceCard;

/* ---------- RestauranteCard ---------- */
export interface RestauranteResumo {
  id: string;
  nome: string;
  sigla: string;
  capaUrl: string;
  cozinhas: string[];
  nota: number;
  totalAvaliacoes: number;
  distanciaKm: number;
  tempoEntrega: string;
  taxaEntrega: number;
  pratosDisponiveis: number;
  aberto: boolean;
  abreAs?: string;
  destaque?: boolean;
}

export function RestauranteCard({ restaurante: r }: { restaurante: RestauranteResumo }) {
  return (
    <Link to={`/app/restaurantes/${r.id}`} className={s.rest}>
      <div className={s.restCapa}>
        <img src={r.capaUrl} alt="" loading="lazy" />
        <div className={s.restTags}>
          {r.destaque && <span className={`${s.restTag} ${s.restTagDestaque}`}>Destaque</span>}
          <span className={s.restTag}>{r.cozinhas[0]}</span>
        </div>
        <span className={`${s.restStatus} ${r.aberto ? '' : s.fechado}`}>
          <span className={s.restStatusPonto} aria-hidden />
          {r.aberto ? 'Aberto' : `Fechado${r.abreAs ? ` · abre ${r.abreAs}` : ''}`}
        </span>
      </div>
      <div className={s.restCorpo}>
        <div className={s.restNomeLinha}>
          <span className={s.restLogo} aria-hidden>{r.sigla}</span>
          <h3 className={s.restNome}>{r.nome}</h3>
          <span className={s.restNota}><RatingStars nota={r.nota} /></span>
        </div>
        <div className={s.restMeta}>
          <span><MapPin size={13} aria-hidden /> {r.distanciaKm.toLocaleString('pt-BR')}km</span>
          <span><Clock size={13} aria-hidden /> {r.tempoEntrega}</span>
          <span><Bike size={13} aria-hidden /> {r.taxaEntrega === 0 ? 'Grátis' : `R$ ${r.taxaEntrega} entrega`}</span>
        </div>
        <div className={s.restCozinhas}>
          {r.cozinhas.map((c) => <span key={c} className={s.restCozinha}>{c}</span>)}
        </div>
        <div className={s.restRodape}>
          <span className={s.restInfo}><strong>{r.pratosDisponiveis} pratos</strong> disponíveis</span>
          <span className={s.restCta}>Ver cardápio</span>
        </div>
      </div>
    </Link>
  );
}

/* ---------- StatCard ---------- */
export function StatCard({ icone, valor, rotulo, tendencia, tom = 'verde' }: {
  icone: ReactNode; valor: string; rotulo: string;
  tendencia?: { texto: string; positiva: boolean }; tom?: 'verde' | 'azul' | 'coral' | 'laranja';
}) {
  return (
    <div className={s.stat}>
      <span className={`${s.statIcone} ${s[`stat-${tom}`]}`} aria-hidden>{icone}</span>
      <p className={s.statValor}>{valor}</p>
      <p className={s.statRotulo}>{rotulo}</p>
      {tendencia && <span className={`${s.statTendencia} ${tendencia.positiva ? s.positiva : s.negativa}`}>{tendencia.texto}</span>}
    </div>
  );
}
