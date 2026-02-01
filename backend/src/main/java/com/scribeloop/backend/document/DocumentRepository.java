package com.scribeloop.backend.document;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByCourseIdOrderByUpdatedAtDesc(Long courseId);
    List<Document> findByCourseIdAndWeekIdOrderByUpdatedAtDesc(Long courseId, Long weekId);
    Optional<Document> findByIdAndCourseId(Long id, Long courseId);
}
