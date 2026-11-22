import s from './Macros.module.css';

export interface Macros {
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras?: number;
}

/** Proporção em gramas de P/C/G (como nas telas: barra 46% / 39% / 15%). */
export function proporcoes({ proteinas, carboidratos, gorduras }: Macros) {
  const total = proteinas + carboidratos + gorduras || 1;
  const p = Math.round((proteinas / total) * 100);
  const c = Math.round((carboidratos / total) * 100);
  return { p, c, g: Math.max(0, 100 - p - c) };
}

/** Barra fina segmentada P/C/G + legenda — usada nos cards de prato. */
export function MacroBar({ macros, mostrarGordura = false }: { macros: Macros; mostrarGordura?: boolean }) {
  const { p, c, g } = proporcoes(macros);
  return (
    <div>
      <div className={s.barra} role="img" aria-label={`Proteínas ${p}%, carboidratos ${c}%, gorduras ${g}%`}>
        <div style={{ width: `${p}%`, background: 'var(--prot)' }} />
        <div style={{ width: `${c}%`, background: 'var(--carb)' }} />
        <div style={{ width: `${g}%`, background: 'var(--fat)' }} />
      </div>
      <div className={s.legenda}>
        <span className={s.item}><span className={s.ponto} style={{ background: 'var(--kcal)' }} /><span className={s.valor}>{macros.calorias}kcal</span></span>
        <span className={s.item}><span className={s.ponto} style={{ background: 'var(--prot)' }} /><span className={s.valor}>{macros.proteinas}g</span><span className="sr-only"> de proteína</span></span>
        <span className={s.item}><span className={s.ponto} style={{ background: 'var(--carb)' }} /><span className={s.valor}>{macros.carboidratos}g</span><span className="sr-only"> de carboidrato</span></span>
        {mostrarGordura && (
          <span className={s.item}><span className={s.ponto} style={{ background: 'var(--fat)' }} /><span className={s.valor}>{macros.gorduras}g</span><span className="sr-only"> de gordura</span></span>
        )}
      </div>
    </div>
  );
}

/** Anel de kcal do card "Macros de hoje" (cartão verde-floresta). */
export function MacroRing({ consumido, meta, tamanho = 180, rotulo = 'kcal hoje' }: { consumido: number; meta: number; tamanho?: number; rotulo?: string }) {
  const raio = 80;
  const circ = 2 * Math.PI * raio;
  const pct = meta > 0 ? Math.min(consumido / meta, 1) : 0;
  return (
    <div className={s.anel} style={{ width: tamanho, height: tamanho }} role="img" aria-label={`${consumido} de ${meta} kcal consumidas`}>
      <svg viewBox="0 0 180 180" className={s.anelSvg} aria-hidden>
        <circle cx="90" cy="90" r={raio} className={s.trilho} />
        <circle cx="90" cy="90" r={raio} className={s.progresso} strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} />
      </svg>
      <div className={s.anelCentro} aria-hidden>
        <span className={s.anelNum}>{consumido.toLocaleString('pt-BR')}</span>
        <span className={s.anelDe}>de {meta.toLocaleString('pt-BR')}</span>
        <span className={s.anelRotulo}>{rotulo}</span>
      </div>
    </div>
  );
}

const LINHAS = [
  { chave: 'proteinas', sigla: 'P', nome: 'Proteínas', cor: 'var(--prot)' },
  { chave: 'carboidratos', sigla: 'C', nome: 'Carboidratos', cor: 'var(--carb)' },
  { chave: 'gorduras', sigla: 'G', nome: 'Gorduras', cor: 'var(--fat)' },
  { chave: 'fibras', sigla: 'F', nome: 'Fibras', cor: 'var(--fiber)' },
] as const;

/** Lista de macros consumido/meta com barras (card escuro da home). */
export function MacroDistribuicao({ consumido, meta, escuro = true }: { consumido: Macros; meta: Macros; escuro?: boolean }) {
  return (
    <ul className={`${s.lista} ${escuro ? s.escuro : ''}`}>
      {LINHAS.filter((l) => meta[l.chave] !== undefined).map((l) => {
        const c = consumido[l.chave] ?? 0;
        const m = meta[l.chave] ?? 0;
        const pct = m > 0 ? Math.min((c / m) * 100, 100) : 0;
        return (
          <li key={l.chave} className={s.linha}>
            <span className={s.sigla} style={{ background: l.cor }} aria-hidden>{l.sigla}</span>
            <div className={s.info}>
              <div className={s.infoTopo}>
                <span className={s.infoNome}>{l.nome}</span>
                <span className={s.infoValor}>{c}g / {m}g</span>
              </div>
              <div className={s.infoBarra} role="progressbar" aria-label={l.nome} aria-valuenow={c} aria-valuemin={0} aria-valuemax={m}>
                <div style={{ width: `${pct}%`, background: l.cor }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
