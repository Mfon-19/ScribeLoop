package com.scribeloop.backend.document;

import com.scribeloop.backend.course.Course;
import com.scribeloop.backend.course.CourseService;
import com.scribeloop.backend.user.User;
import com.scribeloop.backend.user.UserRepository;
import com.scribeloop.backend.week.CourseWeek;
import com.scribeloop.backend.week.CourseWeekService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class DocumentService {
    private final DocumentRepository documentRepository;
    private final DocumentShareRepository shareRepository;
    private final DocumentSnapshotRepository snapshotRepository;
    private final CourseService courseService;
    private final CourseWeekService weekService;
    private final UserRepository userRepository;

    public DocumentService(
            DocumentRepository documentRepository,
            DocumentShareRepository shareRepository,
            DocumentSnapshotRepository snapshotRepository,
            CourseService courseService,
            CourseWeekService weekService,
            UserRepository userRepository
    ) {
        this.documentRepository = documentRepository;
        this.shareRepository = shareRepository;
        this.snapshotRepository = snapshotRepository;
        this.courseService = courseService;
        this.weekService = weekService;
        this.userRepository = userRepository;
    }

    public List<Document> listDocuments(Long courseId, User owner, Long weekId) {
        Course course = courseService.getOwnedCourse(courseId, owner);
        if (weekId != null) {
            return documentRepository.findByCourseIdAndWeekIdOrderByUpdatedAtDesc(course.getId(), weekId);
        }
        return documentRepository.findByCourseIdOrderByUpdatedAtDesc(course.getId());
    }

    public Document createDocument(Long courseId, Long weekId, String title, User owner) {
        Course course = courseService.getOwnedCourse(courseId, owner);
        CourseWeek week = null;
        if (weekId != null) {
            week = weekService.getOwnedWeek(weekId, owner);
            if (!week.getCourse().getId().equals(course.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Week does not belong to course");
            }
        }

        Document document = new Document();
        document.setCourse(course);
        document.setWeek(week);
        document.setTitle(title.trim());
        Document saved = documentRepository.save(document);
        DocumentSnapshot snapshot = new DocumentSnapshot();
        snapshot.setDocument(saved);
        snapshot.setRev(0);
        snapshot.setSnapshotJson(saved.getSnapshotJson());
        snapshotRepository.save(snapshot);
        return saved;
    }

    public Document getDocumentForRead(Long documentId, User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (isOwner(document, user)) {
            return document;
        }
        return shareRepository.findByDocumentIdAndUserId(documentId, user.getId())
                .map(share -> document)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }

    public Document getDocumentForWrite(Long documentId, User user) {
        Document document = getDocumentForRead(documentId, user);
        if (isOwner(document, user)) {
            return document;
        }
        DocumentShare share = shareRepository.findByDocumentIdAndUserId(documentId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No access"));
        if (share.getRole() != DocumentShareRole.EDITOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No access");
        }
        return document;
    }

    public Document updateDocument(Long documentId, Long weekId, String title, User user) {
        Document document = getDocumentForWrite(documentId, user);
        document.setTitle(title.trim());

        if (weekId != null) {
            CourseWeek week = weekService.getOwnedWeek(weekId, document.getCourse().getOwner());
            if (!week.getCourse().getId().equals(document.getCourse().getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Week does not belong to course");
            }
            document.setWeek(week);
        }
        return document;
    }

    public void deleteDocument(Long documentId, User owner) {
        Document document = getDocumentForRead(documentId, owner);
        if (!isOwner(document, owner)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No access");
        }
        documentRepository.delete(document);
    }

    public List<DocumentShare> listShares(Long documentId, User owner) {
        Document document = getOwnedDocument(documentId, owner);
        return shareRepository.findByDocumentIdWithUser(document.getId());
    }

    public DocumentShare shareDocument(Long documentId, String email, DocumentShareRole role, User owner) {
        Document document = getOwnedDocument(documentId, owner);

        User target = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (target.getId().equals(owner.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot share with yourself");
        }

        DocumentShareId id = new DocumentShareId(document.getId(), target.getId());
        DocumentShare share = shareRepository.findById(id).orElseGet(DocumentShare::new);
        share.setId(id);
        share.setDocument(document);
        share.setUser(target);
        share.setRole(role);
        return shareRepository.save(share);
    }

    public List<DocumentShare> listSharedDocuments(User user) {
        return shareRepository.findByUserIdWithDocument(user.getId());
    }

    public DocumentShare updateShareRole(
            Long documentId,
            Long targetUserId,
            DocumentShareRole role,
            User owner
    ) {
        Document document = getOwnedDocument(documentId, owner);
        DocumentShareId id = new DocumentShareId(document.getId(), targetUserId);
        DocumentShare share = shareRepository.findByIdWithUser(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found"));
        share.setRole(role);
        return shareRepository.save(share);
    }

    public void revokeShare(Long documentId, Long targetUserId, User owner) {
        Document document = getOwnedDocument(documentId, owner);
        DocumentShareId id = new DocumentShareId(document.getId(), targetUserId);
        DocumentShare share = shareRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found"));
        shareRepository.delete(share);
    }

    public DocumentAccessRole getAccessRole(Long documentId, User user) {
        Document document = getDocumentForRead(documentId, user);
        if (isOwner(document, user)) {
            return DocumentAccessRole.OWNER;
        }
        DocumentShare share = shareRepository.findByDocumentIdAndUserId(documentId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        return share.getRole() == DocumentShareRole.EDITOR
                ? DocumentAccessRole.EDITOR
                : DocumentAccessRole.VIEWER;
    }

    private boolean isOwner(Document document, User user) {
        return document.getCourse().getOwner().getId().equals(user.getId());
    }

    private Document getOwnedDocument(Long documentId, User owner) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (!isOwner(document, owner)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only owners can manage sharing");
        }
        return document;
    }
}
