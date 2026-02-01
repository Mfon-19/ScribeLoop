package com.scribeloop.backend.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class DocumentDto {
    private DocumentDto() {
    }

    public record DocumentCreateRequest(
            @NotNull Long courseId,
            Long weekId,
            @NotBlank String title
    ) {
    }

    public record DocumentUpdateRequest(
            Long weekId,
            @NotBlank String title
    ) {
    }

    public record DocumentResponse(
            Long id,
            Long courseId,
            Long weekId,
            String title,
            int currentRev,
            String updatedAt
    ) {
    }
}
