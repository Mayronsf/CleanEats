import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Botao, Campo } from '../../../design-system';
import { ErroApi } from '../../../services/api';
import { atualizarEndereco, criarEndereco, formatarCep, type Endereco, type EnderecoNovo } from '../../../services/cliente';
import s from './EnderecoDialog.module.css';

const VAZIO: EnderecoNovo = { apelido: 'Casa', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: 'Recife', uf: 'PE', principal: false };

/** Novo / editar endereço (telas 16 e 22). Preenche rua, bairro e cidade pelo CEP (ViaCEP) quando possível. */
export function EnderecoDialog({ aberto, endereco, onFechar, onSalvo }: {
  aberto: boolean; endereco: Endereco | null; onFechar: () => void; onSalvo: (e: Endereco) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [dados, setDados] = useState<EnderecoNovo>(VAZIO);
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) {
      setDados(endereco ? { ...endereco, cep: formatarCep(endereco.cep), complemento: endereco.complemento ?? '' } : VAZIO);
      setErro(undefined);
      d.showModal?.();
    }
    if (!aberto && d.open) d.close();
  }, [aberto, endereco]);

  const mudar = (campo: keyof EnderecoNovo) => (e: React.ChangeEvent<HTMLInputElement>) => setDados((x) => ({ ...x, [campo]: e.target.value }));

  async function preencherPeloCep(cep: string) {
    const digitos = cep.replace(/\D/g, '');
    if (digitos.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const j = await r.json();
      if (!j.erro) setDados((x) => ({ ...x, logradouro: x.logradouro || j.logradouro || '', bairro: x.bairro || j.bairro || '', cidade: j.localidade || x.cidade, uf: j.uf || x.uf }));
    } catch { /* sem internet ou ViaCEP fora: o cliente preenche à mão */ }
    finally { setBuscandoCep(false); }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setSalvando(true);
    try {
      const corpo = { ...dados, cep: dados.cep.replace(/\D/g, '') };
      const salvo = endereco ? await atualizarEndereco(endereco.id, corpo) : await criarEndereco(corpo);
      onSalvo(salvo);
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível salvar o endereço.');
    } finally { setSalvando(false); }
  }

  return (
    <dialog ref={ref} className={s.dialogo} aria-labelledby="endereco-titulo" onCancel={(e) => { e.preventDefault(); onFechar(); }}>
      <form onSubmit={salvar} noValidate>
        <div className={s.cabeca}>
          <h2 id="endereco-titulo">{endereco ? 'Editar endereço' : 'Novo endereço'}</h2>
          <button type="button" className={s.fechar} onClick={onFechar} aria-label="Fechar"><X size={18} aria-hidden /></button>
        </div>
        <div className={s.corpo}>
          <div className={s.apelidos} role="radiogroup" aria-label="Tipo de endereço">
            {['Casa', 'Trabalho', 'Outro'].map((a) => (
              <button key={a} type="button" role="radio" aria-checked={dados.apelido === a} className={`${s.apelido} ${dados.apelido === a ? s.apelidoAtivo : ''}`}
                onClick={() => setDados((x) => ({ ...x, apelido: a }))}>{a}</button>
            ))}
          </div>
          <div className={s.linha}>
            <Campo rotulo="CEP" value={dados.cep} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" required
              onChange={(e) => setDados((x) => ({ ...x, cep: formatarCep(e.target.value) }))} onBlur={(e) => preencherPeloCep(e.target.value)}
              dica={buscandoCep ? 'Buscando o CEP…' : undefined} />
            <Campo rotulo="Número" value={dados.numero} onChange={mudar('numero')} required autoComplete="address-line2" />
          </div>
          <Campo rotulo="Rua" value={dados.logradouro} onChange={mudar('logradouro')} required autoComplete="address-line1" />
          <Campo rotulo="Complemento" value={dados.complemento ?? ''} onChange={mudar('complemento')} placeholder="Apto, bloco, ponto de referência" />
          <div className={s.linha3}>
            <Campo rotulo="Bairro" value={dados.bairro} onChange={mudar('bairro')} required />
            <Campo rotulo="Cidade" value={dados.cidade} onChange={mudar('cidade')} required autoComplete="address-level2" />
            <Campo rotulo="UF" value={dados.uf} maxLength={2} onChange={(e) => setDados((x) => ({ ...x, uf: e.target.value.toUpperCase() }))} required autoComplete="address-level1" />
          </div>
          <label className={s.principal}>
            <input type="checkbox" checked={dados.principal} onChange={(e) => setDados((x) => ({ ...x, principal: e.target.checked }))} />
            Usar como endereço principal
          </label>
          {erro && <p className={s.erro} role="alert">{erro}</p>}
        </div>
        <div className={s.acoes}>
          <Botao variante="secundario" onClick={onFechar} disabled={salvando}>Cancelar</Botao>
          <Botao type="submit" carregando={salvando}>Salvar endereço</Botao>
        </div>
      </form>
    </dialog>
  );
}
