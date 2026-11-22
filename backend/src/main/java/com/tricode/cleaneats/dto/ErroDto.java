package com.tricode.cleaneats.dto;

import java.time.OffsetDateTime;

public record ErroDto(int status, String codigo, String mensagem, OffsetDateTime momento) {
    public static ErroDto de(int status, String codigo, String mensagem) {
        return new ErroDto(status, codigo, mensagem, OffsetDateTime.now());
    }
}
