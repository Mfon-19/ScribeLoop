package com.scribeloop.backend.document;

public record DocumentAccessDto(DocumentAccessRole role, boolean canEdit) {
}
