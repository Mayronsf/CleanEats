package com.tricode.cleaneats.dto;

import org.springframework.data.domain.Page;
import java.util.List;
import java.util.function.Function;

/** Envelope padrão de paginação no servidor: { itens, pagina, totalPaginas, totalItens }. */
public record PaginaDto<T>(List<T> itens, int pagina, int totalPaginas, long totalItens) {
    public static <E, T> PaginaDto<T> de(Page<E> page, Function<E, T> mapear) {
        return new PaginaDto<>(page.getContent().stream().map(mapear).toList(),
                page.getNumber(), page.getTotalPages(), page.getTotalElements());
    }
}
