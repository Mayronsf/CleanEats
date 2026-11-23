import { useState, type ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Bell, ClipboardList, Home, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { Logo } from './Logo';
import { iniciais } from '../../lib/formato';
import s from './NavbarCliente.module.css';

const LINKS = [
  { para: '/app', rotulo: 'Home', fim: true },
  { para: '/app/marketplace', rotulo: 'Marketplace' },
  { para: '/app/meu-plano', rotulo: 'Meu plano' },
  { para: '/app/pedidos', rotulo: 'Pedidos' },
  { para: '/app/nutribot', rotulo: 'NutriBot' },
];

const ABAS = [
  { para: '/app', rotulo: 'Home', icone: Home, fim: true },
  { para: '/app/marketplace', rotulo: 'Buscar', icone: Search },
  { para: '/app/pedidos', rotulo: 'Pedidos', icone: ClipboardList },
  { para: '/app/perfil', rotulo: 'Perfil', icone: User },
];

export interface NavbarClienteProps {
  nomeUsuario: string;
  itensCarrinho?: number;
  temNotificacao?: boolean;
  onBuscar?: (termo: string) => void;
  /** Sino com a central de notificações (CE-13), injetado pelo layout */
  notificacoes?: ReactNode;
}

export function NavbarCliente({ nomeUsuario, itensCarrinho = 0, temNotificacao = false, onBuscar, notificacoes }: NavbarClienteProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const classeLink = ({ isActive }: { isActive: boolean }) => (isActive ? `${s.link} ${s.ativo}` : s.link);

  return (
    <>
      <header className={s.nav}>
        <Logo para="/app" />
        <nav aria-label="Principal">
          <ul className={s.links}>
            {LINKS.map((l) => (
              <li key={l.para}><NavLink to={l.para} end={l.fim} className={classeLink}>{l.rotulo}</NavLink></li>
            ))}
          </ul>
        </nav>
        <div className={s.direita}>
          <form
            className={s.busca}
            role="search"
            onSubmit={(e) => { e.preventDefault(); onBuscar?.(new FormData(e.currentTarget).get('q')?.toString() ?? ''); }}
          >
            <Search size={16} aria-hidden className={s.buscaIcone} />
            <label htmlFor="busca-global" className="sr-only">Buscar pratos e restaurantes</label>
            <input id="busca-global" name="q" type="search" placeholder="Buscar pratos, restaurantes..." />
          </form>
          <Link to="/app/carrinho" className={s.iconeBtn} aria-label={`Carrinho, ${itensCarrinho} ${itensCarrinho === 1 ? 'item' : 'itens'}`}>
            <ShoppingBag size={18} aria-hidden />
            {itensCarrinho > 0 && <span className={s.contador}>{itensCarrinho}</span>}
          </Link>
          {notificacoes ?? (
            <Link to="/app/perfil#notificacoes" className={s.iconeBtn} aria-label={temNotificacao ? 'Notificações (novas)' : 'Notificações'}>
              <Bell size={18} aria-hidden />
              {temNotificacao && <span className={s.ponto} />}
            </Link>
          )}
          <Link to="/app/perfil" className={s.avatar} aria-label="Meu perfil">{iniciais(nomeUsuario)}</Link>
          <button type="button" className={s.hamburguer} onClick={() => setMenuAberto(true)} aria-label="Abrir menu" aria-expanded={menuAberto}>
            <Menu size={22} aria-hidden />
          </button>
        </div>
      </header>

      {menuAberto && (
        <div className={s.menuMobile} role="dialog" aria-modal="true" aria-label="Menu">
          <div className={s.menuTopo}>
            <Logo para="/app" />
            <button type="button" className={s.iconeBtn} onClick={() => setMenuAberto(false)} aria-label="Fechar menu"><X size={20} aria-hidden /></button>
          </div>
          {[...LINKS, { para: '/app/restaurantes', rotulo: 'Restaurantes' }, { para: '/app/perfil', rotulo: 'Meu perfil' }, { para: '/app/carrinho', rotulo: 'Carrinho' }].map((l) => (
            <NavLink key={l.para} to={l.para} end={'fim' in l} onClick={() => setMenuAberto(false)} className={({ isActive }) => (isActive ? s.ativoMobile : undefined)}>
              {l.rotulo}
            </NavLink>
          ))}
        </div>
      )}

      <nav className={s.tabbar} aria-label="Navegação inferior">
        {ABAS.map(({ para, rotulo, icone: Icone, fim }) => (
          <NavLink key={para} to={para} end={fim} className={({ isActive }) => (isActive ? `${s.aba} ${s.abaAtiva}` : s.aba)}>
            <Icone size={16} aria-hidden /> {rotulo}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
