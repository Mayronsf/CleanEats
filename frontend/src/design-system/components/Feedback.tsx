import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, ImagePlus, Info, SearchX, X } from 'lucide-react';
import { Botao } from './Botao';
import s from './Feedback.module.css';

/* ---------- EmptyState ---------- */
export function EmptyState({ titulo, descricao, acao, icone, compacto = false }: {
  titulo: string; descricao?: string; acao?: { rotulo: string; onClick: () => void }; icone?: ReactNode; compacto?: boolean;
}) {
  return (
    <div className={`${s.vazio} ${compacto ? s.compacto : ''}`}>
      <span className={s.vazioIcone} aria-hidden>{icone ?? <SearchX size={26} />}</span>
      <p className={s.vazioTitulo}>{titulo}</p>
      {descricao && <p className={s.vazioDescricao}>{descricao}</p>}
      {acao && <Botao variante="secundario" tamanho="sm" onClick={acao.onClick}>{acao.rotulo}</Botao>}
    </div>
  );
}

/* ---------- Erro ---------- */
export function ErroCarregamento({ mensagem, onTentarNovamente }: { mensagem?: string; onTentarNovamente?: () => void }) {
  return (
    <div className={s.erro} role="alert">
      <AlertCircle size={20} aria-hidden />
      <p>{mensagem ?? 'Não foi possível carregar. Verifique sua conexão e tente de novo.'}</p>
      {onTentarNovamente && <Botao variante="secundario" tamanho="sm" onClick={onTentarNovamente}>Tentar de novo</Botao>}
    </div>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ altura = 16, largura = '100%', raio = 8 }: { altura?: number | string; largura?: number | string; raio?: number }) {
  return <span className={s.skeleton} style={{ height: altura, width: largura, borderRadius: raio }} aria-hidden />;
}

export function SkeletonCardPrato() {
  return (
    <div className={s.skeletonCard} aria-busy="true" aria-label="Carregando prato">
      <div className={s.skeletonImg} />
      <Skeleton altura={12} largura="45%" />
      <Skeleton altura={20} largura="80%" />
      <Skeleton altura={6} raio={999} />
      <Skeleton altura={28} largura="40%" />
    </div>
  );
}

/* ---------- Toast ---------- */
type TomToast = 'sucesso' | 'erro' | 'info';
interface ToastItem { id: number; tom: TomToast; texto: string }
const ToastContext = createContext<(texto: string, tom?: TomToast) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([]);
  const proximo = useRef(1);
  const remover = useCallback((id: number) => setItens((l) => l.filter((t) => t.id !== id)), []);
  const mostrar = useCallback((texto: string, tom: TomToast = 'sucesso') => {
    const id = proximo.current++;
    setItens((l) => [...l, { id, tom, texto }]);
    window.setTimeout(() => remover(id), 4500);
  }, [remover]);
  const Icone = { sucesso: CheckCircle2, erro: AlertCircle, info: Info };
  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <div className={s.toasts} aria-live="polite" aria-atomic="false">
        {itens.map((t) => {
          const I = Icone[t.tom];
          return (
            <div key={t.id} className={`${s.toast} ${s[t.tom]}`} role={t.tom === 'erro' ? 'alert' : 'status'}>
              <I size={18} aria-hidden />
              <span>{t.texto}</span>
              <button type="button" onClick={() => remover(t.id)} aria-label="Fechar aviso"><X size={14} aria-hidden /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

/* ---------- UploadImagem ---------- */
export function UploadImagem({ rotulo, valorUrl, onArquivo, erro, carregando = false }: {
  rotulo: string; valorUrl?: string; onArquivo: (f: File) => void; erro?: string; carregando?: boolean;
}) {
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const aceitar = (f?: File) => {
    if (f && f.type.startsWith('image/')) onArquivo(f);
  };
  return (
    <div>
      <p className={s.uploadRotulo} id="upload-rotulo">{rotulo}</p>
      <button
        type="button"
        className={`${s.upload} ${arrastando ? s.arrastando : ''} ${erro ? s.uploadErro : ''}`}
        onClick={() => entrada.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastando(false); aceitar(e.dataTransfer.files[0]); }}
        aria-labelledby="upload-rotulo"
        aria-busy={carregando || undefined}
      >
        {valorUrl
          ? <img src={valorUrl} alt="Pré-visualização" className={s.preview} />
          : (
            <>
              <span className={s.uploadIcone} aria-hidden><ImagePlus size={24} /></span>
              <span className={s.uploadTexto}><strong>Clique para enviar</strong> ou arraste a imagem</span>
              <span className={s.uploadDica}>JPG ou PNG · até 5 MB</span>
            </>
          )}
      </button>
      <input ref={entrada} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => aceitar(e.target.files?.[0])} />
      {erro && <p className={s.uploadMsgErro} role="alert">{erro}</p>}
    </div>
  );
}
