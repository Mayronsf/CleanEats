package com.tricode.cleaneats.controller;

import com.tricode.cleaneats.dto.ErroDto;
import com.tricode.cleaneats.service.RecursoNaoEncontradoException;
import com.tricode.cleaneats.service.ServicoExternoException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class TratadorErros {

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ResponseEntity<ErroDto> naoEncontrado(RecursoNaoEncontradoException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErroDto.de(404, e.getCodigo(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroDto> invalido(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .findFirst().orElse("Dados inválidos");
        return ResponseEntity.badRequest().body(ErroDto.de(400, "DADOS_INVALIDOS", msg));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErroDto> regra(IllegalArgumentException e) {
        return ResponseEntity.unprocessableEntity().body(ErroDto.de(422, "REGRA_DE_NEGOCIO", e.getMessage()));
    }

    @ExceptionHandler(ServicoExternoException.class)
    public ResponseEntity<ErroDto> externo(ServicoExternoException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ErroDto.de(503, "SERVICO_INDISPONIVEL", e.getMessage()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErroDto> arquivoGrande(MaxUploadSizeExceededException e) {
        return ResponseEntity.unprocessableEntity().body(ErroDto.de(422, "ARQUIVO_GRANDE", "A imagem pode ter no máximo 5 MB"));
    }
}
