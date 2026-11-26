import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Award, Check, CheckCircle2, Sparkles, Star, Stethoscope, Users } from 'lucide-react';
import { EmptyState, ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { iniciais } from '../../../lib/formato';
import { ErroApi } from '../../../services/api';
import {
  escolherNutricionista, listarNutricionistas, ROTULO_OBJETIVO, type NutricionistaCard,
} from '../../../services/cliente';
import { buscarTiers, type Tier } from '../../../services/planos';
import { ConfirmarAssinatura } from '../../planos/ConfirmarAssinatura';
import s from './NutricionistasPage.module.css';

const PROTOCOLO_CURTO = {
  EMAGRECIMENTO: 'Cutting (Déficit calórico)',
  GANHO_MASSA: 'Bulking (Superávit calórico)',
  EQUILIBRIO: 'Manutenção equilibrada',
} as const;

/** Catálogo de nutricionistas aprovados (CRN) com especialidades, avaliação e escolha direta pelo cliente. */
export default function NutricionistasPage() {
  const navegar = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [especialidade, setEspecialidade] = useState('');
  const [ordenar, setOrdenar] = useState('recomendados');
  const [assinarComNutri, setAssinarComNutri] = useState<{ tier: Tier; idNutri: string } | null>(null);

  const catalogo = useQuery({
    queryKey: ['nutricionistas', especialidade, ordenar],
    queryFn: () => listarNutricionistas({ especialidade: especialidade || undefined, ordenar }),
  });
  const tiers = useQuery({ queryKey: ['tiers'], queryFn: buscarTiers, staleTime: 5 * 60_000 });

  const escolher = useMutation({
    mutationFn: (id: string) => escolherNutricionista(id),
    onSuccess: (nutri) => {
      toast(`${nutri.nome} agora é seu nutricionista! Sua triagem já foi enviada.`, 'sucesso');
      void qc.invalidateQueries({ queryKey: ['nutricionistas'] });
      void qc.invalidateQueries({ queryKey: ['cliente'] });
    },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível escolher este nutricionista.', 'erro'),
  });

  const d = catalogo.data;
  const podeEscolherDireto = d?.tierCliente === 'PRO' || d?.tierCliente === 'PREMIUM';
  const tierPro = tiers.data?.find((t) => t.codigo === 'PRO') ?? null;

  function aoClicarEscolher(n: NutricionistaCard) {
    if (n.atual) return;
    if (podeEscolherDireto) {
      escolher.mutate(n.id);
    } else if (tierPro) {
      setAssinarComNutri({ tier: tierPro, idNutri: n.id });
    } else {
      navegar('/app/assinatura');
    }
  }

  return (
    <div className={s.pagina}>
      <section className={s.heroi} aria-labelledby="nutris-titulo">
        <div className={s.heroiTexto}>
          <p className={s.rotulo}><Stethoscope size={14} aria-hidden /> Especialistas com CRN verificado</p>
          <h1 id="nutris-titulo" className={s.titulo}>Escolha o <span className="script">nutricionista</span><br />ideal pro seu perfil</h1>
          <p className={s.sub}>
            Compare especialidades, experiência clínica e avaliações reais. Ao escolher, sua triagem com cálculo basal (TMB/GET)
            e restrições vai direto para o profissional montar seu plano semanal.
          </p>
          {d?.objetivoCliente && (
            <div className={s.seloObjetivo}>
              <Sparkles size={14} aria-hidden />
              Destacamos quem combina com seu objetivo: <strong>{ROTULO_OBJETIVO[d.objetivoCliente]} · {PROTOCOLO_CURTO[d.objetivoCliente]}</strong>
            </div>
          )}
        </div>
        <div className={s.heroiResumo}>
          <div><span>{d?.itens.length ?? '—'}</span><small>Nutricionistas ativos</small></div>
          <div><span>100%</span><small>CRN validado</small></div>
          <div><span>{podeEscolherDireto ? 'Ativo' : 'Pro/Prem'}</span><small>{podeEscolherDireto ? 'Escolha liberada' : 'Acompanhamento'}</small></div>
        </div>
      </section>

      <div className={s.filtros}>
        <div className={s.pilulas} role="group" aria-label="Filtrar por especialidade">
          <button type="button" className={`${s.pilula} ${!especialidade ? s.pilulaAtiva : ''}`} onClick={() => setEspecialidade('')}>
            Todas especialidades
          </button>
          {(d?.especialidades ?? []).map((esp) => (
            <button key={esp} type="button" className={`${s.pilula} ${especialidade === esp ? s.pilulaAtiva : ''}`} onClick={() => setEspecialidade(esp)}>
              {esp}
            </button>
          ))}
        </div>
        <label className={s.ordenar}>
          <span>Ordenar:</span>
          <select value={ordenar} onChange={(e) => setOrdenar(e.target.value)}>
            <option value="recomendados">Mais compatíveis</option>
            <option value="nota">Melhor avaliados</option>
            <option value="experiencia">Mais experientes</option>
            <option value="vagas">Mais vagas disponíveis</option>
          </select>
        </label>
      </div>

      {catalogo.isError && <ErroCarregamento onTentarNovamente={() => catalogo.refetch()} />}

      <div className={s.grade}>
        {catalogo.isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} altura={320} raio={22} />)}
        {d?.itens.map((n) => (
          <article key={n.id} className={`${s.card} ${n.atual ? s.cardAtual : ''}`}>
            <div className={s.cardTopo}>
              <span className={s.avatar} aria-hidden>
                {n.avatarUrl ? <img src={n.avatarUrl} alt="" /> : iniciais(n.nome.replace(/^Dra?\.\s*/, ''))}
              </span>
              <div className={s.identidade}>
                <div className={s.selosTopo}>
                  {n.atual && <span className={s.seloAtual}><CheckCircle2 size={12} aria-hidden /> Seu nutricionista</span>}
                  {!n.atual && n.compativelObjetivo && <span className={s.seloMatch}><Sparkles size={11} aria-hidden /> Combina com você</span>}
                </div>
                <h2 className={s.nome}>{n.nome}</h2>
                <p className={s.crn}>{n.crn}</p>
              </div>
              <div className={s.nota} aria-label={`Nota ${Number(n.notaMedia ?? 5).toFixed(1)} de 5`}>
                <Star size={14} fill="currentColor" aria-hidden />
                <strong>{Number(n.notaMedia ?? 4.9).toFixed(1).replace('.', ',')}</strong>
              </div>
            </div>

            <div className={s.especialidades}>
              {n.especialidades.map((e) => <span key={e} className={s.tag}>{e}</span>)}
            </div>

            {n.bio && <p className={s.bio}>{n.bio}</p>}

            <div className={s.metaLinha}>
              {n.anosExperiencia != null && (
                <span><Award size={14} aria-hidden /> {n.anosExperiencia} {n.anosExperiencia === 1 ? 'ano' : 'anos'} de experiência</span>
              )}
              <span>
                <Users size={14} aria-hidden />
                {n.vagasDisponiveis > 0 ? `${n.vagasDisponiveis} ${n.vagasDisponiveis === 1 ? 'vaga' : 'vagas'} disponíveis` : 'Agenda cheia'}
              </span>
            </div>

            <div className={s.rodape}>
              {n.atual ? (
                <Link to="/app/meu-plano" className={s.btnAtual}>
                  <Check size={15} aria-hidden /> Ver meu plano <ArrowRight size={14} aria-hidden />
                </Link>
              ) : (
                <button
                  type="button"
                  className={s.btnEscolher}
                  disabled={!n.disponivel || (escolher.isPending && escolher.variables === n.id)}
                  onClick={() => aoClicarEscolher(n)}
                >
                  {!n.disponivel
                    ? 'Agenda lotada'
                    : escolher.isPending && escolher.variables === n.id
                      ? 'Vinculando...'
                      : podeEscolherDireto
                        ? (d.idNutricionistaAtual ? 'Trocar para este profissional' : 'Escolher este nutricionista')
                        : 'Assinar Pro com este nutri'}
                  {n.disponivel && <ArrowRight size={15} aria-hidden />}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {d && d.itens.length === 0 && (
        <EmptyState
          icone={<Stethoscope size={28} aria-hidden />}
          titulo="Nenhum nutricionista nessa especialidade"
          descricao="Limpe o filtro para ver todos os especialistas parceiros com CRN validado."
          acao={{ rotulo: 'Ver todos', onClick: () => setEspecialidade('') }}
        />
      )}

      {assinarComNutri && (
        <ConfirmarAssinatura
          tier={assinarComNutri.tier}
          ciclo="MENSAL"
          idNutricionistaInicial={assinarComNutri.idNutri}
          onFechar={() => setAssinarComNutri(null)}
          onConcluido={async () => {
            setAssinarComNutri(null);
            toast('Plano Pro ativo e nutricionista vinculado! Sua triagem foi enviada.', 'sucesso');
            await qc.invalidateQueries({ queryKey: ['nutricionistas'] });
            await qc.invalidateQueries({ queryKey: ['usuario-atual'] });
            void qc.invalidateQueries({ queryKey: ['cliente'] });
            navegar('/app/meu-plano');
          }}
        />
      )}
    </div>
  );
}
