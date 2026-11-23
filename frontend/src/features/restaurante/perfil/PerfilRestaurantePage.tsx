import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Camera, Check, Clock, CreditCard, ImagePlus, MapPin, Save, Star, Tag, Truck, X,
} from 'lucide-react';
import { ErroCarregamento, Skeleton, useToast } from '../../../design-system';
import { ErroApi } from '../../../services/api';
import {
  buscarPerfilRestaurante, COZINHAS_PADRAO, enviarImagemPerfilRestaurante, ESTADOS_BR, formatarCep,
  formatarCnpj, formatarTelefone, salvarPerfilRestaurante, type HorarioRestaurante, type PerfilRestauranteForm,
} from '../../../services/restaurante';
import s from './PerfilRestaurantePage.module.css';

const ORDEM_DIAS = [
  { dia: 1, nome: 'Segunda-feira' }, { dia: 2, nome: 'Terça-feira' }, { dia: 3, nome: 'Quarta-feira' },
  { dia: 4, nome: 'Quinta-feira' }, { dia: 5, nome: 'Sexta-feira' }, { dia: 6, nome: 'Sábado' }, { dia: 0, nome: 'Domingo' },
];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const TIPOS_PIX = [
  { v: '', r: 'Selecione o tipo' },
  { v: 'CNPJ', r: 'CNPJ' },
  { v: 'EMAIL', r: 'E-mail' },
  { v: 'TELEFONE', r: 'Telefone' },
  { v: 'ALEATORIA', r: 'Chave aleatória' },
];

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
const hora = (v: string) => (v ? v.slice(0, 5) : '08:00');

/** Tela 44 — Perfil do restaurante (CE-3): dados públicos, logo/capa, endereço, categorias, horários, entrega e PIX. */
export default function PerfilRestaurantePage() {
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['restaurante', 'perfil'], queryFn: buscarPerfilRestaurante });

  const [f, setF] = useState<PerfilRestauranteForm | null>(null);
  const [arrastandoCapa, setArrastandoCapa] = useState(false);
  const inputLogo = useRef<HTMLInputElement>(null);
  const inputCapa = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.data && !f) {
      const d = q.data.dados;
      setF({
        ...d,
        cnpj: formatarCnpj(d.cnpj ?? ''),
        cep: formatarCep(d.cep ?? ''),
        telefone: formatarTelefone(d.telefone ?? ''),
        horarios: d.horarios.map((h) => ({ ...h, abre: hora(h.abre), fecha: hora(h.fecha) })),
      });
    }
  }, [q.data, f]);

  const enviarLogo = useMutation({
    mutationFn: enviarImagemPerfilRestaurante,
    onSuccess: (r) => { setF((x) => (x ? { ...x, logoUrl: r.url } : x)); toast('Logo atualizada. Clique em salvar para confirmar.', 'info'); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível enviar a logo.', 'erro'),
  });

  const enviarCapa = useMutation({
    mutationFn: enviarImagemPerfilRestaurante,
    onSuccess: (r) => { setF((x) => (x ? { ...x, capaUrl: r.url } : x)); toast('Capa atualizada. Clique em salvar para confirmar.', 'info'); },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível enviar a capa.', 'erro'),
  });

  const salvar = useMutation({
    mutationFn: () => salvarPerfilRestaurante({
      ...f!,
      cnpj: f!.cnpj.replace(/\D/g, ''),
      cep: f!.cep.replace(/\D/g, ''),
    }),
    onSuccess: (atualizado) => {
      const d = atualizado.dados;
      setF({
        ...d,
        cnpj: formatarCnpj(d.cnpj ?? ''),
        cep: formatarCep(d.cep ?? ''),
        telefone: formatarTelefone(d.telefone ?? ''),
        horarios: d.horarios.map((h) => ({ ...h, abre: hora(h.abre), fecha: hora(h.fecha) })),
      });
      toast('Perfil do restaurante salvo com sucesso!', 'sucesso');
      void qc.invalidateQueries({ queryKey: ['restaurante'] });
    },
    onError: (e) => toast(e instanceof ErroApi ? e.message : 'Não foi possível salvar o perfil.', 'erro'),
  });

  if (q.isError) return <ErroCarregamento mensagem={q.error instanceof ErroApi ? q.error.message : undefined} onTentarNovamente={() => q.refetch()} />;
  if (!q.data || !f) {
    return (
      <div className={s.pagina}>
        <Skeleton altura={56} raio={16} />
        <div style={{ height: 20 }} />
        <Skeleton altura={320} raio={22} />
        <div style={{ height: 20 }} />
        <Skeleton altura={260} raio={22} />
      </div>
    );
  }

  const p = q.data;
  const criado = new Date(p.criadoEm);
  const desde = Number.isNaN(criado.getTime()) ? '' : `${MESES[criado.getMonth()]} ${criado.getFullYear()}`;
  const set = <K extends keyof PerfilRestauranteForm>(k: K, v: PerfilRestauranteForm[K]) => setF({ ...f, [k]: v });

  function atualizarHorario(dia: number, patch: Partial<HorarioRestaurante>) {
    set('horarios', f!.horarios.map((h) => (h.dia === dia ? { ...h, ...patch } : h)));
  }

  function aoEscolher(e: ChangeEvent<HTMLInputElement>, tipo: 'logo' | 'capa') {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    if (tipo === 'logo') enviarLogo.mutate(arquivo);
    else enviarCapa.mutate(arquivo);
  }

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate();
  }

  const cnpjMudou = f.cnpj.replace(/\D/g, '') !== (p.dados.cnpj ?? '').replace(/\D/g, '');
  const opcoesDisponiveis = COZINHAS_PADRAO.filter((c) => !f.tiposCozinha.includes(c));
  const iniciais = (f.nome || 'CE').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <form id="form-perfil-restaurante" className={s.pagina} onSubmit={aoEnviar} method="POST">
      <header className={s.topo}>
        <div>
          <h1>Perfil do Restaurante</h1>
          <p>Informações públicas e configurações do estabelecimento</p>
        </div>
        <button type="submit" className={s.btnSalvar} disabled={salvar.isPending || enviarLogo.isPending || enviarCapa.isPending}>
          <Save size={16} aria-hidden />
          {salvar.isPending ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </header>

      {p.statusAprovacao !== 'APROVADO' && (
        <aside className={`${s.avisoStatus} ${p.statusAprovacao === 'PENDENTE' ? s.avisoPendente : s.avisoRejeitado}`} role="status">
          <AlertTriangle size={20} aria-hidden />
          <div>
            <strong>{p.statusAprovacao === 'PENDENTE' ? 'Cadastro em análise pela equipe CleanEats' : 'Cadastro rejeitado pela curadoria'}</strong>
            <span>{p.statusAprovacao === 'PENDENTE'
              ? 'Validamos seu CNPJ e endereço em até 72h úteis. Você já pode configurar seus dados e cardápio.'
              : `${p.motivoRejeicao ?? 'Verifique os dados informados.'} Ao salvar alterações, seu cadastro será reenviado para análise.`}</span>
          </div>
        </aside>
      )}

      {/* DADOS BÁSICOS */}
      <section className={s.cartao}>
        <div className={s.perfilTopo}>
          <div className={s.logoWrap}>
            {f.logoUrl ? <img src={f.logoUrl} alt={`Logo de ${f.nome}`} className={s.logoImg} /> : <div className={s.logoImg} aria-hidden>{iniciais}</div>}
            <button type="button" className={s.logoEdit} onClick={() => inputLogo.current?.click()} disabled={enviarLogo.isPending} aria-label="Alterar logo do restaurante">
              <Camera size={15} aria-hidden />
            </button>
            <input ref={inputLogo} type="file" accept="image/png,image/jpeg,image/webp" className={s.visuallyHidden} onChange={(e) => aoEscolher(e, 'logo')} />
          </div>
          <div className={s.perfilInfo}>
            <h2>{f.nome || 'Seu restaurante'}</h2>
            {desde && <p>Restaurante parceiro desde {desde}</p>}
            <div className={s.badges}>
              {p.statusAprovacao === 'APROVADO' && <span className={s.badgeVerde}><Check size={13} aria-hidden /> Verificado</span>}
              {p.statusAprovacao === 'PENDENTE' && <span className={s.badgeAviso}>Em análise</span>}
              {p.statusAprovacao === 'REJEITADO' && <span className={s.badgeErro}>Rejeitado</span>}
              {p.notaMedia != null && (
                <span className={s.badgeVerde}>
                  <Star size={13} aria-hidden /> {Number(p.notaMedia).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} ({p.totalAvaliacoes})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={s.gradeForm}>
          <div className={s.campo}>
            <label htmlFor="p-nome">Nome do restaurante *</label>
            <input id="p-nome" name="nome" required minLength={3} maxLength={60} autoComplete="organization" value={f.nome} onChange={(e) => set('nome', e.target.value)} />
          </div>
          <div className={s.campo}>
            <label htmlFor="p-razao">Razão social</label>
            <input id="p-razao" name="razaoSocial" value={f.razaoSocial ?? ''} onChange={(e) => set('razaoSocial', e.target.value)} />
          </div>
          <div className={s.campo}>
            <label htmlFor="p-cnpj">CNPJ *</label>
            <input id="p-cnpj" name="cnpj" required inputMode="numeric" value={f.cnpj} onChange={(e) => set('cnpj', formatarCnpj(e.target.value))} />
            {cnpjMudou && <small>Alterar o CNPJ envia o cadastro novamente para análise.</small>}
          </div>
          <div className={s.campo}>
            <label htmlFor="p-email">E-mail</label>
            <input id="p-email" name="email" type="email" value={p.email} readOnly />
          </div>
          <div className={s.campo}>
            <label htmlFor="p-tel">Telefone *</label>
            <input id="p-tel" name="telefone" type="tel" autoComplete="tel" required value={f.telefone ?? ''} onChange={(e) => set('telefone', formatarTelefone(e.target.value))} />
          </div>
          <div className={s.campo}>
            <label htmlFor="p-slogan">Slogan curto</label>
            <input id="p-slogan" name="slogan" maxLength={120} placeholder="Frase exibida no card do marketplace" value={f.slogan ?? ''} onChange={(e) => set('slogan', e.target.value)} />
          </div>
          <div className={`${s.campo} ${s.largo}`}>
            <label htmlFor="p-desc">Descrição</label>
            <textarea id="p-desc" name="descricao" maxLength={500} value={f.descricao ?? ''} onChange={(e) => set('descricao', e.target.value)} />
            <small>{(f.descricao ?? '').length} / 500 caracteres</small>
          </div>
        </div>
      </section>

      {/* FOTO DE CAPA */}
      <section className={s.cartao}>
        <div className={s.cartaoCabeca}>
          <h2><span><ImagePlus size={19} aria-hidden /></span> Foto de capa</h2>
          <p>Imagem exibida no topo do perfil público (1200×400px recomendado)</p>
        </div>
        <button
          type="button"
          className={`${s.capaArea} ${arrastandoCapa ? s.capaArrastando : ''}`}
          onClick={() => inputCapa.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setArrastandoCapa(true); }}
          onDragLeave={() => setArrastandoCapa(false)}
          onDrop={(e) => { e.preventDefault(); setArrastandoCapa(false); const a = e.dataTransfer.files[0]; if (a) enviarCapa.mutate(a); }}
          disabled={enviarCapa.isPending}
        >
          {f.capaUrl ? (
            <img src={f.capaUrl} alt={`Capa de ${f.nome}`} />
          ) : (
            <>
              <ImagePlus size={26} aria-hidden />
              <strong>{enviarCapa.isPending ? 'Enviando capa…' : 'Clique ou arraste para enviar'}</strong>
              <small>PNG, JPG ou WebP até 5MB</small>
            </>
          )}
        </button>
        <input ref={inputCapa} type="file" accept="image/png,image/jpeg,image/webp" className={s.visuallyHidden} onChange={(e) => aoEscolher(e, 'capa')} />
        {f.capaUrl && (
          <div className={s.capaAcoes}>
            <button type="button" className={s.btnTexto} onClick={() => set('capaUrl', null)}>
              <X size={14} aria-hidden /> Remover capa
            </button>
          </div>
        )}
      </section>

      {/* ENDEREÇO */}
      <section className={s.cartao}>
        <div className={s.cartaoCabeca}>
          <h2><span><MapPin size={19} aria-hidden /></span> Endereço</h2>
          <p>Localização do estabelecimento</p>
        </div>
        <div className={s.gradeForm}>
          <div className={s.campo}>
            <label htmlFor="p-cep">CEP *</label>
            <input id="p-cep" name="cep" required inputMode="numeric" autoComplete="postal-code" value={f.cep} onChange={(e) => set('cep', formatarCep(e.target.value))} />
          </div>
          <div className={s.campo}>
            <label htmlFor="p-bairro">Bairro *</label>
            <input id="p-bairro" name="bairro" required value={f.bairro} onChange={(e) => set('bairro', e.target.value)} />
          </div>
          <div className={s.campo}>
            <label htmlFor="p-rua">Rua *</label>
            <input id="p-rua" name="logradouro" required autoComplete="address-line1" value={f.logradouro} onChange={(e) => set('logradouro', e.target.value)} />
          </div>
          <div className={s.campo}>
            <label htmlFor="p-num">Número *</label>
            <input id="p-num" name="numero" required value={f.numero} onChange={(e) => set('numero', e.target.value)} />
          </div>
          <div className={s.campo}>
            <label htmlFor="p-cidade">Cidade *</label>
            <input id="p-cidade" name="cidade" required autoComplete="address-level2" value={f.cidade} onChange={(e) => set('cidade', e.target.value)} />
          </div>
          <div className={s.campo}>
            <label htmlFor="p-uf">Estado (UF) *</label>
            <select id="p-uf" name="uf" required autoComplete="address-level1" value={f.uf} onChange={(e) => set('uf', e.target.value)}>
              {ESTADOS_BR.map((e) => <option key={e.uf} value={e.uf}>{e.nome} ({e.uf})</option>)}
            </select>
          </div>
          <div className={`${s.campo} ${s.largo}`}>
            <label htmlFor="p-comp">Complemento</label>
            <input id="p-comp" name="complemento" autoComplete="address-line2" value={f.complemento ?? ''} onChange={(e) => set('complemento', e.target.value)} />
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className={s.cartao}>
        <div className={s.cartaoCabeca}>
          <h2><span><Tag size={19} aria-hidden /></span> Categorias e tipos de cozinha</h2>
          <p>Ajudam clientes a encontrar seu restaurante no marketplace</p>
        </div>
        <div className={s.tagsLista}>
          {f.tiposCozinha.map((item) => (
            <span key={item} className={s.tagAtiva}>
              {item}
              <button type="button" aria-label={`Remover ${item}`} onClick={() => set('tiposCozinha', f.tiposCozinha.filter((x) => x !== item))}>
                <X size={11} aria-hidden />
              </button>
            </span>
          ))}
        </div>
        {opcoesDisponiveis.length > 0 && (
          <div className={s.chipsAdd}>
            {opcoesDisponiveis.map((item) => (
              <button key={item} type="button" className={s.chipAdd} onClick={() => set('tiposCozinha', [...f.tiposCozinha, item])}>
                + {item}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* HORÁRIOS */}
      <section className={s.cartao}>
        <div className={s.cartaoCabeca}>
          <h2><span><Clock size={19} aria-hidden /></span> Horário de funcionamento</h2>
          <p>Horários de preparo e entrega — clique no status para abrir ou fechar o dia</p>
        </div>
        <div className={s.tabelaWrap}>
          <table className={s.tabelaHorarios}>
            <thead>
              <tr>
                <th>Dia</th>
                <th>Horário</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ORDEM_DIAS.map(({ dia, nome: rotulo }) => {
                const h = f.horarios.find((x) => x.dia === dia) ?? { dia, aberto: false, abre: '08:00', fecha: '22:00' };
                return (
                  <tr key={dia}>
                    <td className={s.diaNome}>{rotulo}</td>
                    <td>
                      {h.aberto ? (
                        <div className={s.horasInputs}>
                          <input type="time" aria-label={`Abertura ${rotulo}`} value={h.abre} onChange={(e) => atualizarHorario(dia, { abre: e.target.value })} />
                          <span aria-hidden>—</span>
                          <input type="time" aria-label={`Fechamento ${rotulo}`} value={h.fecha} onChange={(e) => atualizarHorario(dia, { fecha: e.target.value })} />
                        </div>
                      ) : (
                        <span style={{ color: 'var(--gray-500)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        aria-pressed={h.aberto}
                        className={`${s.statusToggle} ${h.aberto ? s.aberto : s.fechado}`}
                        onClick={() => atualizarHorario(dia, { aberto: !h.aberto })}
                      >
                        {h.aberto ? 'Aberto' : 'Fechado'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ENTREGA */}
      <section className={s.cartao}>
        <div className={s.cartaoCabeca}>
          <h2><span><Truck size={19} aria-hidden /></span> Entrega</h2>
          <p>Prazo estimado, taxa e valor mínimo do pedido</p>
        </div>
        <div className={s.gradeForm}>
          <div className={s.campo}>
            <label htmlFor="p-tmin">Tempo mínimo (min)</label>
            <input id="p-tmin" name="tempoEntregaMin" type="number" min={5} max={180} value={f.tempoEntregaMin ?? ''} onChange={(e) => set('tempoEntregaMin', num(e.target.value))} />
          </div>
          <div className={s.campo}>
            <label htmlFor="p-tmax">Tempo máximo (min)</label>
            <input id="p-tmax" name="tempoEntregaMax" type="number" min={5} max={180} value={f.tempoEntregaMax ?? ''} onChange={(e) => set('tempoEntregaMax', num(e.target.value))} />
          </div>
          <div className={s.campo}>
            <label htmlFor="p-taxa">Taxa de entrega (R$)</label>
            <input id="p-taxa" name="taxaEntrega" inputMode="decimal" value={f.taxaEntrega == null ? '' : String(f.taxaEntrega).replace('.', ',')} onChange={(e) => set('taxaEntrega', num(e.target.value.replace(/[^\d,.]/g, '')))} />
          </div>
          <div className={s.campo}>
            <label htmlFor="p-min">Pedido mínimo (R$)</label>
            <input id="p-min" name="pedidoMinimo" inputMode="decimal" value={f.pedidoMinimo == null ? '' : String(f.pedidoMinimo).replace('.', ',')} onChange={(e) => set('pedidoMinimo', num(e.target.value.replace(/[^\d,.]/g, '')))} />
          </div>
        </div>
      </section>

      {/* DADOS BANCÁRIOS (PIX) */}
      <section className={s.cartao}>
        <div className={s.cartaoCabeca}>
          <h2><span><CreditCard size={19} aria-hidden /></span> Dados bancários para repasse (PIX)</h2>
          <p>Conta utilizada nos repasses semanais da CleanEats</p>
        </div>
        <div className={s.gradeTres}>
          <div className={s.campo}>
            <label htmlFor="p-tpix">Tipo de chave</label>
            <select id="p-tpix" name="tipoChavePix" value={f.tipoChavePix ?? ''} onChange={(e) => set('tipoChavePix', e.target.value || null)}>
              {TIPOS_PIX.map((t) => <option key={t.v} value={t.v}>{t.r}</option>)}
            </select>
          </div>
          <div className={s.campo}>
            <label htmlFor="p-pix">Chave PIX</label>
            <input id="p-pix" name="chavePix" autoComplete="off" placeholder="CNPJ, e-mail, telefone ou chave aleatória" value={f.chavePix ?? ''} onChange={(e) => set('chavePix', e.target.value)} />
          </div>
          <div className={s.campo}>
            <label htmlFor="p-titular">Titular da conta</label>
            <input id="p-titular" name="titularPix" value={f.titularPix ?? ''} onChange={(e) => set('titularPix', e.target.value)} />
          </div>
        </div>
      </section>

      <div className={s.rodapeSalvar}>
        <button type="submit" className={s.btnSalvar} disabled={salvar.isPending || enviarLogo.isPending || enviarCapa.isPending}>
          <Save size={16} aria-hidden />
          {salvar.isPending ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}
