import { DocumentoLegal, type SecaoLegal } from './DocumentoLegal';

const SECOES: SecaoLegal[] = [
  { id: 'quem', titulo: 'Quem trata seus dados', conteudo: (
    <p>O CleanEats é desenvolvido pela equipe TRICODE Solutions (projeto acadêmico da UNIFACOL, Recife). Esta política segue a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).</p>
  ) },
  { id: 'coletamos', titulo: 'Dados que coletamos', conteudo: (
    <ul>
      <li><strong>Cadastro:</strong> nome, e-mail, telefone (opcional) e senha (guardada de forma criptografada pelo provedor de autenticação).</li>
      <li><strong>Saúde e alimentação (dados sensíveis):</strong> objetivo, peso, altura, idade, restrições alimentares, metas de macros, medições e o plano alimentar.</li>
      <li><strong>Uso:</strong> pedidos, endereços de entrega, avaliações, favoritos, consumo do dia e mensagens com a nutricionista e com o NutriBot.</li>
      <li><strong>Profissionais:</strong> CRN e especialidades (nutricionistas); CNPJ, endereço e dados do estabelecimento (restaurantes).</li>
    </ul>
  ) },
  { id: 'finalidades', titulo: 'Para que usamos', conteudo: (
    <ul>
      <li>Filtrar e priorizar pratos compatíveis com seu objetivo e suas restrições.</li>
      <li>Permitir que sua nutricionista monte e acompanhe seu plano.</li>
      <li>Processar pedidos e mostrar o status em tempo real.</li>
      <li>Responder suas perguntas no NutriBot com base no seu plano, consumo e metas.</li>
      <li>Cobrança da assinatura, suporte e segurança da conta.</li>
    </ul>
  ) },
  { id: 'consentimento', titulo: 'Dados de saúde e consentimento', conteudo: (
    <p>Dados de saúde são dados pessoais sensíveis. Só os tratamos com o seu <strong>consentimento</strong>, registrado no aceite do cadastro, e apenas para as finalidades acima. Você pode revogar o consentimento excluindo sua conta.</p>
  ) },
  { id: 'compartilhamento', titulo: 'Com quem compartilhamos', conteudo: (
    <ul>
      <li><strong>Restaurante do pedido:</strong> nome, itens e endereço de entrega — só o necessário para preparar e entregar.</li>
      <li><strong>Sua nutricionista:</strong> perfil nutricional, metas, plano, consumo e pedidos, para o acompanhamento.</li>
      <li><strong>Provedores de infraestrutura:</strong> banco de dados e autenticação (Supabase); modelo de IA usado pelo NutriBot, que recebe o contexto necessário para responder; serviço de e-mail para prescrições e códigos de acesso.</li>
      <li>Não vendemos seus dados e não os usamos para publicidade de terceiros.</li>
    </ul>
  ) },
  { id: 'direitos', titulo: 'Seus direitos', conteudo: (
    <>
      <p>Pela LGPD (art. 18) você pode: confirmar e acessar seus dados, corrigir dados incompletos ou desatualizados, pedir a anonimização ou eliminação, pedir a portabilidade, saber com quem compartilhamos e revogar o consentimento.</p>
      <p>Correção: em <strong>Editar perfil</strong>. Exclusão: em <strong>Editar perfil → Excluir conta</strong> — seus dados pessoais são apagados ou anonimizados; registros fiscais e de pedidos podem ser mantidos de forma anonimizada pelo prazo legal.</p>
    </>
  ) },
  { id: 'seguranca', titulo: 'Segurança e retenção', conteudo: (
    <p>Usamos conexão criptografada (HTTPS), controle de acesso por perfil e regras de acesso no banco de dados (RLS), além de códigos de verificação com expiração de 15 minutos na recuperação de senha. Mantemos os dados enquanto a conta estiver ativa.</p>
  ) },
];

/** /privacidade — Política de privacidade (tela nova, LGPD). */
export default function PrivacidadePage() {
  return (
    <DocumentoLegal titulo="Política de" destaque="privacidade" atualizadoEm="22/11/2026" secoes={SECOES}
      resumo="Em resumo: usamos seus dados para personalizar seu cardápio, conectar você à sua nutricionista e entregar seus pedidos. Dados de saúde só com o seu consentimento. Você pode corrigir ou excluir tudo pelo seu perfil." />
  );
}
