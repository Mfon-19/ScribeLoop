package com.scribeloop.backend.document;

import com.scribeloop.backend.document.DocumentDto.DocumentCreateRequest;
import com.scribeloop.backend.document.DocumentDto.DocumentResponse;
import com.scribeloop.backend.document.DocumentDto.DocumentUpdateRequest;
import com.scribeloop.backend.document.DocumentShareDto.ShareRequest;
import com.scribeloop.backend.document.DocumentShareDto.ShareResponse;
import com.scribeloop.backend.user.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class DocumentController {
    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping("/courses/{courseId}/documents")
    public List<DocumentResponse> listDocuments(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long courseId,
            @RequestParam(required = false) Long weekId
    ) {
        return documentService.listDocuments(courseId, principal.getUser(), weekId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping("/documents")
    public DocumentResponse createDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody DocumentCreateRequest request
    ) {
        Document document = documentService.createDocument(
                request.courseId(),
                request.weekId(),
                request.title(),
                principal.getUser()
        );
        return toResponse(document);
    }

    @GetMapping("/documents/{documentId}")
    public DocumentResponse getDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long documentId
    ) {
        return toResponse(documentService.getDocumentForRead(documentId, principal.getUser()));
    }

    @PatchMapping("/documents/{documentId}")
    public DocumentResponse updateDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long documentId,
            @Valid @RequestBody DocumentUpdateRequest request
    ) {
        Document document = documentService.updateDocument(
                documentId,
                request.weekId(),
                request.title(),
                principal.getUser()
        );
        return toResponse(document);
    }

    @DeleteMapping("/documents/{documentId}")
    public void deleteDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long documentId
    ) {
        documentService.deleteDocument(documentId, principal.getUser());
    }

    @GetMapping("/documents/{documentId}/shares")
    public List<ShareResponse> listShares(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long documentId
    ) {
        return documentService.listShares(documentId, principal.getUser())
                .stream()
                .map(share -> new ShareResponse(
                        share.getDocument().getId(),
                        share.getUser().getId(),
                        share.getUser().getEmail(),
                        share.getRole()
                ))
                .toList();
    }

    @PostMapping("/documents/{documentId}/share")
    public ShareResponse shareDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long documentId,
            @Valid @RequestBody ShareRequest request
    ) {
        DocumentShare share = documentService.shareDocument(
                documentId,
                request.email(),
                request.role(),
                principal.getUser()
        );
        return new ShareResponse(
                share.getDocument().getId(),
                share.getUser().getId(),
                share.getUser().getEmail(),
                share.getRole()
        );
    }

    private DocumentResponse toResponse(Document document) {
        return new DocumentResponse(
                document.getId(),
                document.getCourse().getId(),
                document.getWeek() != null ? document.getWeek().getId() : null,
                document.getTitle(),
                document.getCurrentRev(),
                document.getUpdatedAt() != null ? document.getUpdatedAt().toString() : null
        );
    }
}
