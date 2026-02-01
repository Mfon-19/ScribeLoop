package com.scribeloop.backend.document;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentShareRepository extends JpaRepository<DocumentShare, DocumentShareId> {
    Optional<DocumentShare> findByDocumentIdAndUserId(Long documentId, Long userId);
    List<DocumentShare> findByDocumentId(Long documentId);
}
