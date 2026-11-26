import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, QrCode, Sparkles, Star, X } from 'lucide-react';
import { Botao } from '../../design-system';
import { formatarMoeda } from '../../lib/formato';
import { ErroApi } from '../../services/api';
import { listarNutricionistas } from '../../services/cliente';
import { assinarPlano, type Ciclo, type FormaPagamento, type Tier } from '../../services/planos';
import { PagamentoPixDialog } from '../cliente/componentes/PagamentoPixDialog';
import s from './ConfirmarAssinatura.module.css';

/**
 * Confirmação da assinatura (CE-15).
 * - Para planos Pro e Premium, permite escolher o nutricionista compatível com o perfil do cliente.
 * - Para PIX, abre o QR Code (Mercado Pago / demonstração) e aguarda confirmação antes de ativar a assinatura.
 */
export function ConfirmarAssinatura({ tier, ciclo, idNutricionistaInicial, onFechar, onConcluido }: {
  tier: Tier; ciclo: Ciclo; idNutricionistaInicial?: string | null; onFechar: () => void; onConcluido: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [forma, setForma] = useState<FormaPagamento>('PIX');
  const [idNutri, setIdNutri] = useState<string>(idNutricionistaInicial ?? '');
  const [enviando, setEnviando] = useState(false);
  const [pixAberto, setPixAberto] = useState(false);
  const [erro, setErro] = useState<string>();

  const temNutri = tier.nutricionistaDedicado;
  const nutris = useQuery({
    queryKey: ['nutricionistas', 'assinatura'],
    queryFn: () => listarNutricionistas({ ordenar: 'recomendados' }),
    enabled: temNutri,
  });

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    if (!pixAberto && !el.open) el.showModal?.();
    if (pixAberto && el.open) el.close();
  }, [pixAberto]);

  const valor = ciclo === 'ANUAL' ? Number(tier.precoAnual) : Number(tier.precoMensal);
  const disponiveis = (nutris.data?.itens ?? []).filter((n) => n.disponivel);

  async function efetivarAssinatura() {
    setErro(undefined);
    setEnviando(true);
    try {
      await assinarPlano(tier.codigo, ciclo, forma, temNutri ? (idNutri || null) : null);
      setPixAberto(false);
      onConcluido();
    } catch (e) {
      setPixAberto(false);
      setErro(e instanceof ErroApi && e.status !== 404
        ? e.message
        : 'Não foi possível concluir a assinatura agora. Tente de novo em instantes.');
    } finally {
      setEnviando(false);
    }
  }

  function avancar() {
    if (forma === 'PIX') {
      setPixAberto(true);
    } else {
      void efetivarAssinatura();
    }
  }

  return (
    <>
      <dialog ref={dialogo} className={s.dialogo} onClose={() => { if (!pixAberto) onFechar(); }} aria-labelledby="assinatura-titulo">
        <div className={s.corpo}>
          <header className={s.cabeca}>
            <h1 id="assinatura-titulo">Assinar o plano <span className="script">{tier.nome}</span></h1>
            <button type="button" className={s.fechar} onClick={onFechar} aria-label="Fechar"><X size={18} aria-hidden /></button>
          </header>
          <dl className={s.resumo}>
            <div><dt>Plano</dt><dd>{tier.nome} · {ciclo === 'ANUAL' ? 'anual' : 'mensal'}</dd></div>
            <div><dt>Valor</dt><dd>{formatarMoeda(valor)}{ciclo === 'ANUAL' ? '/ano' : '/mês'}</dd></div>
            <div><dt>Teste grátis</dt><dd>7 dias — cancele sem custo</dd></div>
          </dl>

          {temNutri && (
            <fieldset className={s.nutris}>
              <div className={s.nutrisTopo}>
                <legend>Escolha seu nutricionista</legend>
                <Link to="/app/nutricionistas" onClick={onFechar} className={s.verTodosNutris}>Ver catálogo completo</Link>
              </div>
              <div className={s.nutrisLista}>
                <label className={`${s.nutriOpcao} ${idNutri === '' ? s.formaAtiva : ''}`}>
                  <input type="radio" name="nutricionista" value="" checked={idNutri === ''} onChange={() => setIdNutri('')} />
                  <div className={s.nutriInfo}>
                    <strong><Sparkles size={13} aria-hidden /> Escolher automaticamente</strong>
                    <small>Direcionamos ao especialista disponível mais compatível com seu objetivo</small>
                  </div>
                </label>
                {disponiveis.slice(0, 5).map((n) => (
                  <label key={n.id} className={`${s.nutriOpcao} ${idNutri === n.id ? s.formaAtiva : ''}`}>
                    <input type="radio" name="nutricionista" value={n.id} checked={idNutri === n.id} onChange={() => setIdNutri(n.id)} />
                    <div className={s.nutriInfo}>
                      <span className={s.nutriNomeLinha}>
                        <strong>{n.nome}</strong>
                        <span className={s.nutriNota}><Star size={11} fill="currentColor" aria-hidden /> {Number(n.notaMedia ?? 4.9).toFixed(1).replace('.', ',')}</span>
                        {n.compativelObjetivo && <span className={s.nutriMatch}>Combina</span>}
                      </span>
                      <small>{n.crn} · {n.especialidades.slice(0, 2).join(' · ')}</small>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className={s.formas}>
            <legend>Forma de pagamento</legend>
            {([['PIX', 'PIX', 'QR Code e Copia e Cola · Mercado Pago', QrCode], ['CARTAO', 'Cartão de crédito', 'Visa, Mastercard', CreditCard]] as const).map(([v, rotulo, sub, Icone]) => (
              <label key={v} className={`${s.forma} ${forma === v ? s.formaAtiva : ''}`}>
                <input type="radio" name="forma" value={v} checked={forma === v} onChange={() => setForma(v)} />
                <Icone size={20} aria-hidden />
                <span><strong>{rotulo}</strong>{sub}</span>
              </label>
            ))}
          </fieldset>
          <p className={s.aviso}>
            {forma === 'PIX'
              ? 'Na próxima etapa geramos o QR Code Pix e aguardamos a confirmação do pagamento.'
              : 'Ambiente de demonstração: o pagamento no cartão é aprovado na hora e a fatura aparece em Minha assinatura.'}
          </p>
          {erro && <p className={s.erro} role="alert">{erro}</p>}
          <div className={s.acoes}>
            <Botao variante="secundario" onClick={onFechar}>Voltar</Botao>
            <Botao carregando={enviando} onClick={avancar}>{forma === 'PIX' ? 'Gerar QR Code Pix' : 'Confirmar assinatura'}</Botao>
          </div>
        </div>
      </dialog>
      <PagamentoPixDialog
        aberto={pixAberto}
        valor={valor}
        descricao={`Assinatura CleanEats ${tier.nome}`}
        detalhe={`Ciclo ${ciclo === 'ANUAL' ? 'anual' : 'mensal'}`}
        referencia={`assinatura-${tier.codigo}-${ciclo}`}
        finalizando={enviando}
        onFechar={() => setPixAberto(false)}
        onAprovado={() => void efetivarAssinatura()}
      />
    </>
  );
}
