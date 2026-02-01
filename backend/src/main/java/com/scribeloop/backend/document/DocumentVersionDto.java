package com.scribeloop.backend.document;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public final class DocumentVersionDto {
    private DocumentVersionDto() {
    }

    public record OperationRequest(
            @Min(0) int baseRev,
            @NotBlank String opJson,
            String snapshotJson
    ) {
    }

    public record OperationResponse(int rev, boolean snapshotSaved) {
    }

    public record OperationItem(
            int rev,
            int baseRev,
            String opJson,
            Long actorId,
            String actorEmail,
            String createdAt
    ) {
    }

    public record SyncResponse(
            int currentRev,
            int snapshotRev,
            String snapshotJson,
            java.util.List<OperationItem> ops
    ) {
    }
}
