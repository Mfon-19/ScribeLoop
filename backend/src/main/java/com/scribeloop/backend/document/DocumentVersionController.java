package com.scribeloop.backend.document;

import com.scribeloop.backend.document.DocumentDto.DocumentResponse;
import com.scribeloop.backend.document.DocumentVersionDto.OperationRequest;
import com.scribeloop.backend.document.DocumentVersionDto.OperationResponse;
import com.scribeloop.backend.document.DocumentVersionDto.SyncResponse;
import com.scribeloop.backend.user.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/documents/{documentId}")
public class DocumentVersionController {
    private final DocumentVersionService versionService;

    public DocumentVersionController(DocumentVersionService versionService) {
        this.versionService = versionService;
    }

    @PostMapping("/ops")
    public OperationResponse appendOperation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long documentId,
            @Valid @RequestBody OperationRequest request
    ) {
        return versionService.appendOperation(
                documentId,
                request.baseRev(),
                request.opJson(),
                request.snapshotJson(),
                principal.getUser()
        );
    }

    @GetMapping("/ops")
    public List<DocumentVersionDto.OperationItem> listOperations(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long documentId,
            @RequestParam(defaultValue = "0") int sinceRev
    ) {
        return versionService.listOperations(documentId, sinceRev, principal.getUser());
    }

    @GetMapping("/sync")
    public SyncResponse sync(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long documentId,
            @RequestParam(defaultValue = "0") int sinceRev
    ) {
        return versionService.sync(documentId, sinceRev, principal.getUser());
    }

    @PostMapping("/restore")
    public DocumentResponse restore(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long documentId,
            @RequestParam int rev
    ) {
        Document document = versionService.restore(documentId, rev, principal.getUser());
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
