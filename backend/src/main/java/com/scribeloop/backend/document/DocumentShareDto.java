package com.scribeloop.backend.document;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class DocumentShareDto {
    private DocumentShareDto() {
    }

    public record ShareRequest(@Email @NotBlank String email, @NotNull DocumentShareRole role) {
    }

    public record ShareRoleUpdateRequest(@NotNull DocumentShareRole role) {
    }

    public record ShareResponse(Long docId, Long userId, String email, DocumentShareRole role) {
    }

    public record SharedDocumentResponse(
            Long id,
            Long courseId,
            String courseTitle,
            Long weekId,
            String title,
            int currentRev,
            String updatedAt,
            String ownerEmail,
            DocumentShareRole role
    ) {
    }
}
