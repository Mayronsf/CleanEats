package com.tricode.cleaneats.domain;

/**
 * Enums de domínio menores (os principais têm arquivo próprio: PerfilUsuario, StatusPedido,
 * StatusPrato, StatusAprovacao, TierAssinatura). No banco são "domain" de texto com CHECK.
 * Arquivo compartilhado: só a sessão principal altera.
 */
public final class Enums {
    private Enums() {}

    public enum ObjetivoNutricional { EMAGRECIMENTO, GANHO_MASSA, EQUILIBRIO }
    public enum NivelAtividade { SEDENTARIO, LEVE, MODERADO, INTENSO, ATLETA }
    public enum CicloCobranca { MENSAL, ANUAL }
    public enum StatusAssinatura { TRIAL, ATIVA, PAUSADA, CANCELADA, EXPIRADA }
    public enum StatusFatura { PENDENTE, PAGA, FALHOU, ESTORNADA }
    public enum TipoRefeicao { CAFE_DA_MANHA, LANCHE_MANHA, ALMOCO, LANCHE_TARDE, JANTAR, CEIA }
    public enum StatusTriagem { AGUARDANDO, EM_ANDAMENTO, CONCLUIDA }
    public enum StatusModeracao { PENDENTE, PUBLICADA, REJEITADA }
    public enum CategoriaComponente { PROTEINA, CARBOIDRATO, VEGETAL, ADICIONAL }
    public enum TipoNotificacao { PEDIDO, CARDAPIO, NUTRICIONISTA, ASSINATURA, SISTEMA }
    public enum AutorChatbot { USUARIO, BOT }
    public enum StatusRepasse { PREVISTO, PAGO }
}
