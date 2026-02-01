package com.scribeloop.backend.document;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentOperationRepository extends JpaRepository<DocumentOperation, Long> {
    List<DocumentOperation> findByDocumentIdAndRevGreaterThanOrderByRevAsc(Long documentId, int rev);
}
