import { useState, type ReactNode } from 'react';
import {
  Bell, ChefHat, ClipboardCheck, ClipboardList, DollarSign, FileText, LayoutGrid, LineChart, MessageCircle,
  Percent, Settings, ShieldCheck, ShoppingBag, Store, User, Users, UtensilsCrossed, Wallet, Activity, BookOpen, Leaf,
} from 'lucide-react';
import {
  Badge, BadgeStatus, Botao, Campo, CampoSenha, ChatbotPanel, Chip, EmptyState, ErroCarregamento, FiltroCategoria,
  Logo, MacroBar, MacroDistribuicao, MacroRing, MarketplaceCard, NavbarCliente, PlanoTierCard, Preco,
  QuantityStepper, RatingStars, RestauranteCard, SidebarPainel, Skeleton, SkeletonCardPrato, StatCard, Stepper,
  TabelaDados, TimelineStatusPedido, UploadImagem, useToast, type GrupoMenu,
} from '../../design-system';
import { formatarData, formatarMoeda } from '../../lib/formato';
import { historicoStatusExemplo, mensagensExemplo, planosExemplo, pratosExemplo, restauranteExemplo, restauranteFechadoExemplo } from './exemplos';
import s from './DesignSystemPage.module.css';

const CORES: { grupo: string; cores: [string, string][] }[] = [
  { grupo: 'Verde · cliente', cores: [['--green-primary', '#5BB033'], ['--green-dark', '#2D6A1F'], ['--green-accent', '#8BC34A'], ['--green-bg-deep', '#D4ED9F'], ['--green-bg', '#E8F5D8']] },
  { grupo: 'Azul-aço · nutricionista', cores: [['--blue', '#457B9D'], ['--blue-dark', '#2D5A75'], ['--blue-light', '#7FAFCD'], ['--blue-bg', '#E0F2FE']] },
  { grupo: 'Coral · restaurante', cores: [['--coral', '#E07856'], ['--coral-dark', '#C2543A'], ['--coral-light', '#F0A080'], ['--coral-bg', '#FDE8E0']] },
  { grupo: 'Macros', cores: [['--kcal', '#F4A261'], ['--prot', '#E76F51'], ['--carb', '#E9C46A'], ['--fat', '#C7402E'], ['--fiber', '#52B788']] },
  { grupo: 'Neutros', cores: [['--ink', '#1A2E1A'], ['--gray-700', '#4A5A4A'], ['--gray-500', '#8A958A'], ['--gray-300', '#C8D2C8'], ['--gray-100', '#F0F3EE'], ['--gray-50', '#FAFCF7']] },
  { grupo: 'Destaques', cores: [['--orange', '#F4A261'], ['--gold', '#C9A961'], ['--warning-bg', '#FEF7E0'], ['--danger-ink', '#9B2C2C']] },
];

const MENU_NUTRI: GrupoMenu[] = [
  { titulo: 'Principal', itens: [
    { para: '/nutri', rotulo: 'Dashboard', icone: LayoutGrid, fim: true },
    { para: '/nutri/triagens', rotulo: 'Triagens', icone: ClipboardList, contador: 3 },
    { para: '/nutri/clientes', rotulo: 'Meus clientes', icone: Users },
    { para: '/nutri/acompanhamento', rotulo: 'Acompanhamento', icone: Activity, desabilitado: true, dica: 'Em breve' },
    { para: '/nutri/catalogo', rotulo: 'Catálogo', icone: BookOpen },
    { para: '/nutri/prescricoes/nova', rotulo: 'Prescrições', icone: FileText },
    { para: '/nutri/mensagens', rotulo: 'Mensagens', icone: MessageCircle, contador: 5 },
  ] },
  { titulo: 'Negócio', itens: [
    { para: '/nutri/financeiro', rotulo: 'Financeiro', icone: Wallet },
    { para: '/nutri/perfil', rotulo: 'Meu perfil', icone: User },
  ] },
];
const MENU_RESTAURANTE: GrupoMenu[] = [
  { titulo: 'Operação', itens: [
    { para: '/restaurante', rotulo: 'Dashboard', icone: LayoutGrid, fim: true },
    { para: '/restaurante/pedidos', rotulo: 'Pedidos', icone: ShoppingBag, contador: 4 },
    { para: '/restaurante/cardapio', rotulo: 'Cardápio', icone: UtensilsCrossed },
    { para: '/restaurante/aprovacao', rotulo: 'Aprovação', icone: ClipboardCheck },
  ] },
  { titulo: 'Gestão', itens: [
    { para: '/restaurante/analytics', rotulo: 'Analytics', icone: LineChart },
    { para: '/restaurante/financeiro', rotulo: 'Financeiro', icone: DollarSign },
    { para: '/restaurante/relatorios', rotulo: 'Relatórios', icone: FileText },
    { para: '/restaurante/perfil', rotulo: 'Perfil', icone: Settings },
  ] },
];
const MENU_ADMIN: GrupoMenu[] = [
  { titulo: 'Curadoria', itens: [
    { para: '/admin/aprovacoes', rotulo: 'Aprovações', icone: ShieldCheck, contador: 7 },
    { para: '/admin/restaurantes', rotulo: 'Comissões', icone: Percent },
  ] },
];

interface Transacao { id: string; cliente: string; plano: string; valor: number; data: string; status: string }
const TRANSACOES: Transacao[] = [
  { id: 't1', cliente: 'Breno Filho', plano: 'Pro Mensal', valor: 59.9, data: '2026-11-18', status: 'APROVADO' },
  { id: 't2', cliente: 'Maria Braga', plano: 'Premium Mensal', valor: 89.9, data: '2026-11-15', status: 'PENDENTE' },
];

function Secao({ titulo, children, id }: { titulo: string; children: ReactNode; id: string }) {
  return (
    <section className={s.secao} aria-labelledby={id}>
      <h2 id={id} className={s.secaoTitulo}>{titulo}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  const toast = useToast();
  const [categoria, setCategoria] = useState<string | null>('alta-proteina');
  const [qtd, setQtd] = useState(1);
  const [nota, setNota] = useState(4);
  const [ciclo, setCiclo] = useState<'MENSAL' | 'ANUAL'>('ANUAL');
  const [favorito, setFavorito] = useState(false);
  const [mensagens, setMensagens] = useState(mensagensExemplo);
  const [imagem, setImagem] = useState<string>();

  return (
    <div className={s.pagina}>
      <header className={s.topo}>
        <Logo />
        <h1 className={s.titulo}>Design <span className="script">system</span></h1>
        <p className={s.sub}>Tokens e componentes extraídos das 44 telas HTML. Referência viva para as fases seguintes — dados desta página são exemplos.</p>
      </header>

      <Secao titulo="Cores" id="ds-cores">
        {CORES.map((g) => (
          <div key={g.grupo} className={s.grupoCores}>
            <p className={s.rotuloGrupo}>{g.grupo}</p>
            <div className={s.amostras}>
              {g.cores.map(([token, hex]) => (
                <div key={token} className={s.amostra}>
                  <span className={s.cor} style={{ background: `var(${token})` }} />
                  <code>{token}</code>
                  <span className={s.hex}>{hex}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Secao>

      <Secao titulo="Tipografia" id="ds-tipo">
        <p className={s.tipoDisplay}>Entrar na sua <span className="script">conta</span></p>
        <p className={s.tipoHeadline}>Qual é o seu <span className="script">perfil?</span></p>
        <p className={s.tipoTitulo}>Frango Grelhado Fitness</p>
        <p className={s.tipoCorpo}>Filé de frango grelhado com batata doce assada, brócolis no vapor e arroz integral. Plus Jakarta Sans 300–800; destaque em Caveat 500/700.</p>
        <p className={s.tipoRotulo}>Rótulo de seção · uppercase 11px</p>
        <p className={s.formatos}>Formatos: {formatarMoeda(1234.56)} · {formatarData('2026-11-22T12:00:00-03:00')} · fuso America/Recife</p>
      </Secao>

      <Secao titulo="Botões e campos" id="ds-form">
        <div className={s.linha}>
          <Botao>Entrar</Botao>
          <Botao variante="secundario">Voltar</Botao>
          <Botao variante="fantasma">Ver mais</Botao>
          <Botao variante="escuro">Quero ser Premium</Botao>
          <Botao variante="perigo">Excluir conta</Botao>
          <Botao carregando>Salvando</Botao>
          <Botao disabled>Desabilitado</Botao>
          <Botao tamanho="sm" onClick={() => toast('Pedido confirmado!')}>Mostrar toast</Botao>
          <Botao tamanho="sm" variante="secundario" onClick={() => toast('Não foi possível salvar.', 'erro')}>Toast de erro</Botao>
        </div>
        <div className={s.grade2}>
          <div>
            <Campo rotulo="E-mail" type="email" placeholder="seu@email.com" />
            <CampoSenha rotulo="Senha" placeholder="Mínimo 8 caracteres" dica="Use letras, números e um símbolo." />
          </div>
          <div>
            <Campo rotulo="CRN" placeholder="CRN-6 PE 12345/P" erro="Informe o CRN no formato CRN-6 PE 12345/P." defaultValue="12345" />
            <Campo rotulo="Campo desabilitado" disabled defaultValue="Recife · PE" />
          </div>
        </div>
        <Stepper etapas={['Conta', 'Perfil', 'Detalhes']} atual={1} />
      </Secao>

      <Secao titulo="Chips, badges, preço, avaliação, quantidade" id="ds-basicos">
        <FiltroCategoria rotulo="Categoria" valor={categoria} onChange={setCategoria}
          opcoes={[{ valor: 'alta-proteina', rotulo: 'Alta Proteína' }, { valor: 'low-carb', rotulo: 'Low Carb' }, { valor: 'vegano', rotulo: 'Vegano', contagem: 22 }, { valor: 'sem-gluten', rotulo: 'Sem Glúten' }]} />
        <div className={s.linha}>
          <Chip icone={<Leaf size={16} aria-hidden />}>Com ícone</Chip>
          {['NOVO', 'PREPARANDO', 'PRONTO', 'ENTREGUE', 'CANCELADO', 'EM_ANALISE', 'APROVADO', 'REJEITADO'].map((st) => <BadgeStatus key={st} status={st} />)}
          <Badge tom="destaque">Destaque</Badge>
          <Badge tom="ouro">VIP</Badge>
        </div>
        <div className={s.linha}>
          <Preco valor={24.9} tamanho="sm" />
          <Preco valor={24.9} />
          <Preco valor={21.17} tamanho="lg" riscado={24.9} />
          <RatingStars nota={4.9} total={312} />
          <RatingStars nota={nota} onChange={setNota} />
          <QuantityStepper valor={qtd} onChange={setQtd} />
        </div>
      </Secao>

      <Secao titulo="Macros" id="ds-macros">
        <div className={s.grade3}>
          <div className={s.cartaoClaro}>
            <p className={s.rotuloGrupo}>MacroBar</p>
            <MacroBar macros={pratosExemplo[0]!.macros} mostrarGordura />
          </div>
          <div className={s.cartaoEscuro}>
            <p className={s.cartaoEscuroTitulo}>Macros de hoje</p>
            <MacroRing consumido={1420} meta={2200} />
            <MacroDistribuicao consumido={{ calorias: 1420, proteinas: 96, carboidratos: 150, gorduras: 41, fibras: 18 }} meta={{ calorias: 2200, proteinas: 140, carboidratos: 240, gorduras: 70, fibras: 30 }} />
          </div>
          <div className={s.cartaoClaro}>
            <p className={s.rotuloGrupo}>MacroDistribuicao (claro)</p>
            <MacroDistribuicao escuro={false} consumido={{ calorias: 420, proteinas: 38, carboidratos: 32, gorduras: 12 }} meta={{ calorias: 600, proteinas: 45, carboidratos: 60, gorduras: 20 }} />
          </div>
        </div>
      </Secao>

      <>
        <Secao titulo="Cards" id="ds-cards">
          <div className={s.grade3}>
            <MarketplaceCard prato={pratosExemplo[0]!} favorito={favorito} onFavoritar={() => setFavorito((f) => !f)} />
            <MarketplaceCard prato={pratosExemplo[1]!} />
            <SkeletonCardPrato />
          </div>
          <div className={s.grade3}>
            <RestauranteCard restaurante={restauranteExemplo} />
            <RestauranteCard restaurante={restauranteFechadoExemplo} />
            <div className={s.pilha}>
              <StatCard icone={<DollarSign size={18} />} valor="R$ 4.320" rotulo="Receita bruta" tendencia={{ texto: '+18% vs outubro', positiva: true }} />
              <StatCard tom="coral" icone={<ShoppingBag size={18} />} valor="38" rotulo="Pedidos hoje" tendencia={{ texto: '-4% vs ontem', positiva: false }} />
            </div>
          </div>
        </Secao>

        <Secao titulo="Planos" id="ds-planos">
          <div className={s.linha}>
            <Chip ativo={ciclo === 'MENSAL'} onClick={() => setCiclo('MENSAL')}>Mensal</Chip>
            <Chip ativo={ciclo === 'ANUAL'} onClick={() => setCiclo('ANUAL')}>Anual -20%</Chip>
          </div>
          <div className={s.grade4}>
            {planosExemplo.map((p) => <PlanoTierCard key={p.codigo} plano={p} ciclo={ciclo} atual={p.codigo === 'PRO'} />)}
          </div>
        </Secao>

        <Secao titulo="Pedido, chat e tabela" id="ds-fluxo">
          <div className={s.grade2}>
            <div className={s.cartaoClaro}>
              <p className={s.rotuloGrupo}>TimelineStatusPedido</p>
              <TimelineStatusPedido statusAtual="PREPARANDO" historico={historicoStatusExemplo} />
            </div>
            <ChatbotPanel
              mensagens={mensagens}
              nomeUsuario="Breno Filho"
              limiteRestante={null}
              onEnviar={(t) => setMensagens((m) => [...m, { id: String(m.length + 1), autor: 'usuario', texto: t, em: new Date().toISOString() }])}
            />
          </div>
          <div className={s.cartaoClaro}>
            <TabelaDados<Transacao>
              legenda="Transações recentes"
              linhas={TRANSACOES}
              chaveLinha={(t) => t.id}
              colunas={[
                { chave: 'cliente', titulo: 'Cliente', render: (t) => <strong>{t.cliente}</strong> },
                { chave: 'plano', titulo: 'Plano', render: (t) => t.plano },
                { chave: 'data', titulo: 'Data', render: (t) => formatarData(t.data + 'T12:00:00-03:00') },
                { chave: 'status', titulo: 'Status', render: (t) => <BadgeStatus status={t.status} /> },
                { chave: 'valor', titulo: 'Valor', alinhar: 'direita', render: (t) => formatarMoeda(t.valor) },
              ]}
              pagina={{ atual: 1, total: 3, onMudar: () => {} }}
            />
          </div>
        </Secao>

        <Secao titulo="Estados" id="ds-estados">
          <div className={s.grade3}>
            <EmptyState titulo="Nenhum prato encontrado" descricao="Tente remover algum filtro ou buscar por outro termo." acao={{ rotulo: 'Limpar filtros', onClick: () => {} }} />
            <div className={s.pilha}>
              <ErroCarregamento onTentarNovamente={() => {}} />
              <Skeleton altura={20} largura="70%" />
              <Skeleton altura={14} />
              <Skeleton altura={14} largura="85%" />
            </div>
            <UploadImagem rotulo="Foto do prato" valorUrl={imagem} onArquivo={(f) => setImagem(URL.createObjectURL(f))} />
          </div>
        </Secao>

        <Secao titulo="Navegação" id="ds-nav">
          <div className={s.moldura}>
            <NavbarCliente nomeUsuario="Breno Filho" itensCarrinho={2} temNotificacao />
          </div>
          <div className={s.grade3}>
            <div className={`${s.molduraSidebar} tema-nutri`}>
              <SidebarPainel variante="nutri" grupos={MENU_NUTRI} usuario={{ nome: 'Dra. Ana Souza', subtitulo: 'CRN-6 PE · 12345/P' }} />
            </div>
            <div className={`${s.molduraSidebar} tema-restaurante`}>
              <SidebarPainel variante="restaurante" grupos={MENU_RESTAURANTE} usuario={{ nome: 'Sabor Natural', subtitulo: 'Restaurante · Recife' }} />
            </div>
            <div className={s.molduraSidebar}>
              <SidebarPainel variante="admin" grupos={MENU_ADMIN} usuario={{ nome: 'Admin CleanEats', subtitulo: 'Equipe TRICODE' }} />
            </div>
          </div>
          <p className={s.nota}><Bell size={14} aria-hidden /> No celular a navbar do cliente vira menu inferior e as sidebars viram drawer. <Store size={14} aria-hidden /> <ChefHat size={14} aria-hidden /></p>
        </Secao>
      </>

      <footer className={s.rodape}>
        <p>© 2026 CleanEats — TRICODE Solutions · Recife · Brasil</p>
        <p>v1.0 · MVP · UNIFACOL</p>
      </footer>
    </div>
  );
}
