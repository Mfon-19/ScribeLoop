package com.scribeloop.backend.document;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentShareRepository extends JpaRepository<DocumentShare, DocumentShareId> {
    Optional<DocumentShare> findByDocumentIdAndUserId(Long documentId, Long userId);

    @Query("""
            select share from DocumentShare share
            join fetch share.user user
            join fetch share.document document
            where document.id = :documentId
            """)
    List<DocumentShare> findByDocumentIdWithUser(@Param("documentId") Long documentId);

    @Query("""
            select share from DocumentShare share
            join fetch share.user user
            join fetch share.document document
            where share.id = :id
            """)
    Optional<DocumentShare> findByIdWithUser(@Param("id") DocumentShareId id);

    @Query("""
            select share from DocumentShare share
            join fetch share.user user
            join fetch share.document document
            join fetch document.course course
            join fetch course.owner owner
            left join fetch document.week week
            where user.id = :userId
            """)
    List<DocumentShare> findByUserIdWithDocument(@Param("userId") Long userId);

    List<DocumentShare> findByDocumentId(Long documentId);
    List<DocumentShare> findByUserId(Long userId);
}
