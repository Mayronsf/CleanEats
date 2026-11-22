import { Check, X } from 'lucide-react';
import { CampoSenha } from '../../../design-system';
import { forcaSenha, requisitosSenha } from '../../../services/conta';
import s from './MedidorSenha.module.css';

const ROTULOS = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
const ITENS: { chave: keyof ReturnType<typeof requisitosSenha>; texto: string }[] = [
  { chave: 'tamanho', texto: 'Mínimo 8 caracteres' },
  { chave: 'maiuscula', texto: 'Uma letra maiúscula' },
  { chave: 'numero', texto: 'Um número' },
  { chave: 'simbolo', texto: 'Um caractere especial' },
];

/** Campo de senha com barras de força (tela 03) e, opcionalmente, a lista de requisitos (tela 08). */
export function MedidorSenha({ rotulo, valor, onChange, erro, mostrarRequisitos = false, autoComplete = 'new-password' }: {
  rotulo: string; valor: string; onChange: (v: string) => void; erro?: string; mostrarRequisitos?: boolean; autoComplete?: string;
}) {
  const forca = forcaSenha(valor);
  const req = requisitosSenha(valor);
  return (
    <div className={s.envoltorio}>
      <CampoSenha rotulo={rotulo} autoComplete={autoComplete} placeholder="Mínimo 8 caracteres"
        value={valor} onChange={(e) => onChange(e.target.value)} erro={erro} />
      {valor && (
        <div className={s.forca} aria-live="polite">
          <div className={s.barras} aria-hidden>
            {[1, 2, 3, 4].map((n) => <span key={n} className={n <= forca ? s[`nivel${forca}`] : undefined} />)}
          </div>
          <p className={s.dica}>Força da senha: <strong>{ROTULOS[forca] || 'Muito fraca'}</strong></p>
        </div>
      )}
      {mostrarRequisitos && (
        <ul className={s.requisitos} aria-label="Requisitos da senha">
          {ITENS.map((i) => (
            <li key={i.chave} className={req[i.chave] ? s.ok : undefined}>
              {req[i.chave] ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
              {i.texto}<span className="sr-only">{req[i.chave] ? ' (atendido)' : ' (pendente)'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
