package com.scribeloop.backend.document;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentSnapshotRepository extends JpaRepository<DocumentSnapshot, Long> {
    Optional<DocumentSnapshot> findTopByDocumentIdAndRevLessThanEqualOrderByRevDesc(Long documentId, int rev);
    Optional<DocumentSnapshot> findByDocumentIdAndRev(Long documentId, int rev);
}
