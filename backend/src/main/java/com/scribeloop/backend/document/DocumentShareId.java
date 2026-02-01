package com.scribeloop.backend.document;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class DocumentShareId implements Serializable {
    @Column(name = "doc_id")
    private Long docId;

    @Column(name = "user_id")
    private Long userId;

    public DocumentShareId() {
    }

    public DocumentShareId(Long docId, Long userId) {
        this.docId = docId;
        this.userId = userId;
    }

    public Long getDocId() {
        return docId;
    }

    public Long getUserId() {
        return userId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof DocumentShareId that)) {
            return false;
        }
        return Objects.equals(docId, that.docId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(docId, userId);
    }
}
