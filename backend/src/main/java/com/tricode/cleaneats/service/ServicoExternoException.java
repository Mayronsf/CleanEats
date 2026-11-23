package com.tricode.cleaneats.service;

/** Falha de serviço externo (Supabase Storage/Auth, e-mail, IA): vira 503 com mensagem amigável. */
public class ServicoExternoException extends RuntimeException {
    public ServicoExternoException(String mensagem) { super(mensagem); }
    public ServicoExternoException(String mensagem, Throwable causa) { super(mensagem, causa); }
}
