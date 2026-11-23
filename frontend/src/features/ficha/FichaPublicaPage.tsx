import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, ShieldCheck, Star } from 'lucide-react';
import { EmptyState, ErroCarregamento, Logo, MacroBar, Skeleton } from '../../design-system';
import { ErroApi } from '../../services/api';
import { buscarFichaTecnica } from '../../services/fichas';
import s from './FichaPublicaPage.module.css';

/** /ficha/:id — ficha técnica nutricional pública, aberta pelo QR Code da tela 12. Não exige login. */
export default function FichaPublicaPage() {
  const { id = '' } = useParams();
  const ficha = useQuery({ queryKey: ['ficha', id], queryFn: () => buscarFichaTecnica(id), retry: false });

  return (
    <div className={s.pagina}>
      <header className={s.topo}><Logo /><span className={s.selo}>Ficha técnica nutricional</span></header>
      <main className={s.conteudo}>
        {ficha.isLoading && (
          <div className={s.carregando} aria-busy="true"><Skeleton altura={220} raio={20} /><Skeleton altura={28} largura="70%" /><Skeleton altura={96} raio={16} /></div>
        )}
        {ficha.isError && ((ficha.error as ErroApi).status === 404
          ? <EmptyState titulo="Ficha não encontrada" descricao="Este prato não existe ou ainda não passou pela curadoria do CleanEats." />
          : <ErroCarregamento onTentarNovamente={() => ficha.refetch()} />)}

        {ficha.data && (() => {
          const f = ficha.data;
          const totalG = Number(f.proteinas) + Number(f.carboidratos) + Number(f.gorduras) || 1;
          return (
            <article>
              {f.imagemUrl && <img className={s.foto} src={f.imagemUrl} alt={f.nome} />}
              <p className={s.categoria}>{f.categoria}</p>
              <h1 className={s.nome}>{f.nome}</h1>
              <p className={s.restaurante}>
                {f.restaurante} · {f.cidade}
                {f.totalAvaliacoes > 0 && <span className={s.nota}><Star size={13} fill="currentColor" aria-hidden /> {Number(f.notaMedia).toFixed(1)} ({f.totalAvaliacoes})</span>}
              </p>
              {f.descricao && <p className={s.descricao}>{f.descricao}</p>}

              <section className={s.blocos} aria-label="Macronutrientes por porção">
                <div className={`${s.bloco} ${s.kcal}`}><strong>{f.calorias}</strong><span>kcal</span></div>
                <div className={`${s.bloco} ${s.prot}`}><strong>{Number(f.proteinas)}g</strong><span>Proteína</span></div>
                <div className={`${s.bloco} ${s.carb}`}><strong>{Number(f.carboidratos)}g</strong><span>Carboidrato</span></div>
                <div className={`${s.bloco} ${s.gord}`}><strong>{Number(f.gorduras)}g</strong><span>Gordura</span></div>
              </section>

              <section className={s.cartao} aria-labelledby="dist">
                <h2 id="dist">Distribuição nutricional {f.porcaoG && <small>· Porção {f.porcaoG}g</small>}</h2>
                <MacroBar macros={{ calorias: f.calorias, proteinas: Number(f.proteinas), carboidratos: Number(f.carboidratos), gorduras: Number(f.gorduras) }} mostrarGordura />
                <table className={s.tabela}>
                  <caption className="sr-only">Informação nutricional</caption>
                  <tbody>
                    <tr><th scope="row">Valor energético</th><td>{f.calorias} kcal</td></tr>
                    <tr><th scope="row">Proteínas</th><td>{Number(f.proteinas)} g · {Math.round(Number(f.proteinas) / totalG * 100)}%</td></tr>
                    <tr><th scope="row">Carboidratos</th><td>{Number(f.carboidratos)} g · {Math.round(Number(f.carboidratos) / totalG * 100)}%</td></tr>
                    <tr><th scope="row">Gorduras totais</th><td>{Number(f.gorduras)} g · {Math.round(Number(f.gorduras) / totalG * 100)}%</td></tr>
                    {f.fibras != null && <tr><th scope="row">Fibras alimentares</th><td>{Number(f.fibras)} g</td></tr>}
                    {f.sodioMg != null && <tr><th scope="row">Sódio</th><td>{f.sodioMg} mg</td></tr>}
                  </tbody>
                </table>
              </section>

              {f.ingredientes.length > 0 && (
                <section className={s.cartao} aria-labelledby="ingr">
                  <h2 id="ingr">Ingredientes</h2>
                  <ul className={s.ingredientes}>
                    {f.ingredientes.map((i) => (
                      <li key={i.nome}><span>{i.nome}</span><span>{[i.quantidade, i.preparo].filter(Boolean).join(' · ')}</span></li>
                    ))}
                  </ul>
                </section>
              )}

              {f.compativelCom.length > 0 && (
                <section className={s.cartao} aria-labelledby="compat">
                  <h2 id="compat">Adequado para</h2>
                  <ul className={s.chips}>{f.compativelCom.map((c) => <li key={c}>{c}</li>)}</ul>
                </section>
              )}

              <section className={s.aprovacao}>
                <span className={s.aprovacaoIcone} aria-hidden>{f.aprovadoPorNutri ? <BadgeCheck size={22} /> : <ShieldCheck size={22} />}</span>
                <p>
                  <strong>{f.aprovadoPorNutri ? 'Aprovado por nutricionista' : 'Aprovado pela curadoria CleanEats'}</strong>
                  Ficha técnica conferida antes da publicação no marketplace. Informações por porção.
                </p>
              </section>
            </article>
          );
        })()}
      </main>
      <footer className={s.rodape}>© 2026 CleanEats — TRICODE Solutions · Recife · Brasil</footer>
    </div>
  );
}
