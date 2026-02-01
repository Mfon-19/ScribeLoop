package com.scribeloop.backend.document;

import com.scribeloop.backend.document.DocumentVersionDto.OperationItem;
import com.scribeloop.backend.document.DocumentVersionDto.OperationResponse;
import com.scribeloop.backend.document.DocumentVersionDto.SyncResponse;
import com.scribeloop.backend.user.User;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class DocumentVersionService {
    private static final int SNAPSHOT_INTERVAL = 100;

    private final DocumentService documentService;
    private final DocumentOperationRepository operationRepository;
    private final DocumentSnapshotRepository snapshotRepository;

    public DocumentVersionService(
            DocumentService documentService,
            DocumentOperationRepository operationRepository,
            DocumentSnapshotRepository snapshotRepository
    ) {
        this.documentService = documentService;
        this.operationRepository = operationRepository;
        this.snapshotRepository = snapshotRepository;
    }

    public OperationResponse appendOperation(
            Long documentId,
            int baseRev,
            String opJson,
            String snapshotJson,
            User actor
    ) {
        Document document = documentService.getDocumentForWrite(documentId, actor);
        if (baseRev != document.getCurrentRev()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Revision mismatch");
        }

        int newRev = baseRev + 1;
        DocumentOperation op = new DocumentOperation();
        op.setDocument(document);
        op.setBaseRev(baseRev);
        op.setRev(newRev);
        op.setActor(actor);
        op.setOpJson(opJson);
        operationRepository.save(op);

        document.setCurrentRev(newRev);

        boolean snapshotSaved = false;
        if (snapshotJson != null && !snapshotJson.isBlank()) {
            saveSnapshot(document, newRev, snapshotJson);
            snapshotSaved = true;
        } else if (newRev % SNAPSHOT_INTERVAL == 0) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Snapshot required at revision " + newRev
            );
        }

        return new OperationResponse(newRev, snapshotSaved);
    }

    public List<OperationItem> listOperations(Long documentId, int sinceRev, User user) {
        Document document = documentService.getDocumentForRead(documentId, user);
        return operationRepository.findByDocumentIdAndRevGreaterThanOrderByRevAsc(
                        document.getId(),
                        Math.max(0, sinceRev)
                )
                .stream()
                .map(this::toItem)
                .toList();
    }

    public SyncResponse sync(Long documentId, int sinceRev, User user) {
        Document document = documentService.getDocumentForRead(documentId, user);
        int currentRev = document.getCurrentRev();

        DocumentSnapshot snapshot = snapshotRepository
                .findTopByDocumentIdAndRevLessThanEqualOrderByRevDesc(document.getId(), currentRev)
                .orElse(null);

        int snapshotRev = snapshot != null ? snapshot.getRev() : 0;
        String snapshotJson = snapshot != null ? snapshot.getSnapshotJson() : document.getSnapshotJson();

        int effectiveSince = Math.max(sinceRev, snapshotRev);
        List<OperationItem> ops = operationRepository
                .findByDocumentIdAndRevGreaterThanOrderByRevAsc(document.getId(), effectiveSince)
                .stream()
                .map(this::toItem)
                .toList();

        return new SyncResponse(currentRev, snapshotRev, snapshotJson, ops);
    }

    public Document restore(Long documentId, int targetRev, User user) {
        Document document = documentService.getDocumentForRead(documentId, user);
        if (!isOwner(document, user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No access");
        }

        DocumentSnapshot snapshot = snapshotRepository.findByDocumentIdAndRev(document.getId(), targetRev)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Snapshot not found"));

        int previousRev = document.getCurrentRev();
        int newRev = previousRev + 1;

        document.setSnapshotJson(snapshot.getSnapshotJson());
        document.setCurrentRev(newRev);

        DocumentOperation op = new DocumentOperation();
        op.setDocument(document);
        op.setBaseRev(previousRev);
        op.setRev(newRev);
        op.setActor(user);
        op.setOpJson("{\"type\":\"restore\",\"targetRev\":" + targetRev + "}");
        operationRepository.save(op);

        saveSnapshot(document, newRev, snapshot.getSnapshotJson());

        return document;
    }

    private void saveSnapshot(Document document, int rev, String snapshotJson) {
        document.setSnapshotJson(snapshotJson);
        DocumentSnapshot snapshot = new DocumentSnapshot();
        snapshot.setDocument(document);
        snapshot.setRev(rev);
        snapshot.setSnapshotJson(snapshotJson);
        snapshotRepository.save(snapshot);
    }

    private boolean isOwner(Document document, User user) {
        return document.getCourse().getOwner().getId().equals(user.getId());
    }

    private OperationItem toItem(DocumentOperation op) {
        return new OperationItem(
                op.getRev(),
                op.getBaseRev(),
                op.getOpJson(),
                op.getActor().getId(),
                op.getActor().getEmail(),
                op.getCreatedAt().toString()
        );
    }
}
