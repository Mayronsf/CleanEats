import { Link } from 'react-router-dom';
import { DocumentoLegal, type SecaoLegal } from './DocumentoLegal';

const SECOES: SecaoLegal[] = [
  { id: 'aceite', titulo: 'Aceite destes termos', conteudo: (
    <p>Ao criar uma conta no CleanEats você declara que leu e concorda com estes Termos de Uso e com a <Link to="/privacidade">Política de Privacidade</Link>. Se não concordar, não utilize a plataforma.</p>
  ) },
  { id: 'servico', titulo: 'O que é o CleanEats', conteudo: (
    <>
      <p>O CleanEats é uma plataforma web que conecta <strong>clientes</strong>, <strong>nutricionistas</strong> e <strong>restaurantes</strong> de alimentação saudável: marketplace de marmitas com ficha nutricional, plano alimentar montado por nutricionista com pratos reais do catálogo, acompanhamento de macros e o assistente NutriBot.</p>
      <p>Esta versão (v1.0) é um MVP desenvolvido pela equipe TRICODE Solutions na disciplina de Fábrica de Software do curso de Sistemas de Informação da UNIFACOL.</p>
    </>
  ) },
  { id: 'conta', titulo: 'Sua conta', conteudo: (
    <ul>
      <li>Cada conta tem <strong>um único perfil</strong>: cliente, nutricionista ou restaurante.</li>
      <li>Você é responsável por manter sua senha em sigilo e pelas ações feitas na sua conta.</li>
      <li>Nutricionistas (CRN) e restaurantes (CNPJ) passam por <strong>aprovação manual</strong> antes de operar.</li>
      <li>Você pode excluir sua conta a qualquer momento em Editar perfil.</li>
    </ul>
  ) },
  { id: 'nutribot', titulo: 'NutriBot não substitui o nutricionista', conteudo: (
    <p>O NutriBot é um assistente automatizado que responde com base no seu plano, no seu consumo do dia e nas suas metas. Ele <strong>não prescreve, não monta dietas e não substitui a avaliação de um nutricionista</strong>. Ajustes oficiais no seu plano são feitos apenas pela sua nutricionista. Em caso de condição de saúde, procure um profissional.</p>
  ) },
  { id: 'pratos', titulo: 'Pratos, pedidos e informação nutricional', conteudo: (
    <>
      <p>Todo prato publicado tem ficha nutricional informada pelo restaurante e conferida pela curadoria do CleanEats. Os valores são por porção e podem variar levemente no preparo.</p>
      <p>O pedido só é registrado depois da sua confirmação. O restaurante é responsável pelo preparo e pela qualidade dos alimentos; o CleanEats intermedia o pedido e cobra do restaurante uma comissão por pedido entregue.</p>
    </>
  ) },
  { id: 'assinatura', titulo: 'Planos e cobrança', conteudo: (
    <ul>
      <li>Os planos Free, Basic, Pro e Premium e seus benefícios estão descritos na <Link to="/planos">página de planos</Link>.</li>
      <li>A assinatura é renovada automaticamente no fim de cada ciclo (mensal ou anual).</li>
      <li>Ao cancelar, os benefícios continuam até a data de encerramento do período pago; depois a conta volta ao plano Free sem perder o histórico.</li>
      <li>Nesta versão de demonstração os pagamentos são simulados e não há cobrança real.</li>
    </ul>
  ) },
  { id: 'avaliacoes', titulo: 'Avaliações e conteúdo', conteudo: (
    <p>Você só pode avaliar pratos de pedidos entregues. As avaliações passam por moderação antes de serem publicadas; não publicamos ofensas, dados pessoais de terceiros ou conteúdo sem relação com o prato.</p>
  ) },
  { id: 'alteracoes', titulo: 'Alterações destes termos', conteudo: (
    <p>Podemos atualizar estes termos. Mudanças relevantes serão avisadas na central de notificações da plataforma antes de entrarem em vigor.</p>
  ) },
];

/** /termos — Termos de uso (tela nova, CE-2). */
export default function TermosPage() {
  return (
    <DocumentoLegal titulo="Termos de" destaque="uso" atualizadoEm="22/11/2026" secoes={SECOES}
      resumo="Em resumo: use o CleanEats para pedir, planejar e acompanhar uma alimentação saudável. Mantenha sua conta segura, lembre que o NutriBot orienta mas não substitui sua nutricionista, e cancele quando quiser." />
  );
}
