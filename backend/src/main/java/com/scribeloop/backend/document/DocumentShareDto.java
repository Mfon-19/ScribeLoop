package com.scribeloop.backend.document;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class DocumentShareDto {
    private DocumentShareDto() {
    }

    public record ShareRequest(@Email @NotBlank String email, @NotNull DocumentShareRole role) {
    }

    public record ShareResponse(Long docId, Long userId, String email, DocumentShareRole role) {
    }
}
