import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, MoreHorizontal, X, type LucideIcon } from 'lucide-react';
import { Logo } from './Logo';
import { iniciais } from '../../lib/formato';
import s from './SidebarPainel.module.css';

export type VariantePainel = 'nutri' | 'restaurante' | 'admin';

export interface ItemMenu {
  para: string;
  rotulo: string;
  icone: LucideIcon;
  contador?: number;
  fim?: boolean;
  desabilitado?: boolean;
  dica?: string;
}

export interface GrupoMenu { titulo: string; itens: ItemMenu[] }

const ROTULO_PAPEL: Record<VariantePainel, string> = {
  nutri: 'Painel Nutri',
  restaurante: 'Restaurante',
  admin: 'Administração',
};

export interface SidebarPainelProps {
  variante: VariantePainel;
  grupos: GrupoMenu[];
  usuario: { nome: string; subtitulo: string; avatarUrl?: string };
}

export function SidebarPainel({ variante, grupos, usuario }: SidebarPainelProps) {
  const [aberta, setAberta] = useState(false);
  const local = useLocation();
  useEffect(() => setAberta(false), [local.pathname]);

  return (
    <>
      <button type="button" className={s.abrir} onClick={() => setAberta(true)} aria-label="Abrir menu do painel" aria-expanded={aberta}>
        <Menu size={20} aria-hidden />
      </button>
      {aberta && <div className={s.sombra} onClick={() => setAberta(false)} aria-hidden />}
      <aside className={[s.sidebar, s[variante], aberta && s.aberta].filter(Boolean).join(' ')} aria-label={ROTULO_PAPEL[variante]}>
        <div className={s.topo}>
          <Logo compacto para={variante === 'admin' ? '/admin' : variante === 'nutri' ? '/nutri' : '/restaurante'} />
          <button type="button" className={s.fechar} onClick={() => setAberta(false)} aria-label="Fechar menu"><X size={18} aria-hidden /></button>
        </div>
        <span className={s.papel}>{ROTULO_PAPEL[variante]}</span>
        <nav>
          {grupos.map((g) => (
            <div key={g.titulo}>
              <p className={s.grupo}>{g.titulo}</p>
              <ul className={s.lista}>
                {g.itens.map(({ para, rotulo, icone: Icone, contador, fim, desabilitado, dica }) => (
                  <li key={para}>
                    {desabilitado ? (
                      <span className={`${s.item} ${s.desabilitado}`} aria-disabled="true" title={dica}>
                        <span className={s.iconeWrap}><Icone size={15} aria-hidden /></span>
                        {rotulo}
                        {dica && <span className={s.emBreve}>{dica}</span>}
                      </span>
                    ) : (
                      <NavLink to={para} end={fim} className={({ isActive }) => (isActive ? `${s.item} ${s.ativo}` : s.item)}>
                        <span className={s.iconeWrap}><Icone size={15} aria-hidden /></span>
                        {rotulo}
                        {!!contador && <span className={s.contador} aria-label={`${contador} pendentes`}>{contador}</span>}
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className={s.rodape}>
          <div className={s.usuario}>
            {usuario.avatarUrl
              ? <img className={s.avatar} src={usuario.avatarUrl} alt="" />
              : <span className={s.avatar} aria-hidden>{iniciais(usuario.nome)}</span>}
            <span className={s.usuarioInfo}>
              <span className={s.usuarioNome}>{usuario.nome}</span>
              <span className={s.usuarioPapel}>{usuario.subtitulo}</span>
            </span>
            <MoreHorizontal size={18} aria-hidden className={s.mais} />
          </div>
        </div>
      </aside>
    </>
  );
}
