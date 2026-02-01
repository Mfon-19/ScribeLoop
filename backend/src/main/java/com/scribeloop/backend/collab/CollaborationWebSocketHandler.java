package com.scribeloop.backend.collab;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.scribeloop.backend.document.DocumentVersionDto;
import com.scribeloop.backend.document.DocumentVersionService;
import com.scribeloop.backend.document.DocumentService;
import com.scribeloop.backend.user.User;
import com.scribeloop.backend.user.UserRepository;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class CollaborationWebSocketHandler extends TextWebSocketHandler {
    private final ObjectMapper objectMapper;
    private final DocumentVersionService versionService;
    private final DocumentService documentService;
    private final UserRepository userRepository;

    private final Map<Long, Set<WebSocketSession>> docSessions = new ConcurrentHashMap<>();
    private final Map<String, Long> sessionDoc = new ConcurrentHashMap<>();

    public CollaborationWebSocketHandler(
            ObjectMapper objectMapper,
            DocumentVersionService versionService,
            DocumentService documentService,
            UserRepository userRepository
    ) {
        this.objectMapper = objectMapper;
        this.versionService = versionService;
        this.documentService = documentService;
        this.userRepository = userRepository;
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Long docId = sessionDoc.remove(session.getId());
        if (docId != null) {
            Set<WebSocketSession> sessions = docSessions.get(docId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    docSessions.remove(docId);
                }
            }
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        JsonNode payload = objectMapper.readTree(message.getPayload());
        String type = payload.path("type").asText();

        switch (type) {
            case "join" -> handleJoin(session, payload);
            case "op" -> handleOperation(session, payload);
            case "presence" -> handlePresence(session, payload);
            case "ping" -> send(session, "pong", null);
            default -> sendError(session, "unknown_type", "Unknown message type");
        }
    }

    private void handleJoin(WebSocketSession session, JsonNode payload) throws IOException {
        long docId = payload.path("docId").asLong(-1);
        int lastRev = payload.path("lastRev").asInt(0);
        User user = requireUser(session);

        documentService.getDocumentForRead(docId, user);

        sessionDoc.put(session.getId(), docId);
        docSessions.computeIfAbsent(docId, key -> new CopyOnWriteArraySet<>()).add(session);

        DocumentVersionDto.SyncResponse sync = versionService.sync(docId, lastRev, user);
        ObjectNode response = objectMapper.createObjectNode();
        response.put("type", "sync");
        response.put("docId", docId);
        response.put("currentRev", sync.currentRev());
        response.put("snapshotRev", sync.snapshotRev());
        response.put("snapshotJson", sync.snapshotJson());
        response.set("ops", objectMapper.valueToTree(sync.ops()));
        send(session, null, response);
    }

    private void handleOperation(WebSocketSession session, JsonNode payload) throws IOException {
        Long docId = requireJoinedDoc(session, payload);
        User user = requireUser(session);
        int baseRev = payload.path("baseRev").asInt(-1);
        String opJson = payload.path("opJson").asText(null);
        String snapshotJson = payload.path("snapshotJson").asText(null);

        if (baseRev < 0 || opJson == null) {
            sendError(session, "invalid_payload", "baseRev and opJson are required");
            return;
        }

        try {
            DocumentVersionDto.OperationResponse response = versionService.appendOperation(
                    docId,
                    baseRev,
                    opJson,
                    snapshotJson,
                    user
            );

            ObjectNode broadcast = objectMapper.createObjectNode();
            broadcast.put("type", "op");
            broadcast.put("docId", docId);
            broadcast.put("rev", response.rev());
            broadcast.put("baseRev", baseRev);
            broadcast.put("opJson", opJson);
            broadcast.put("actorId", user.getId());
            broadcast.put("actorEmail", user.getEmail());
            broadcast.put("createdAt", Instant.now().toString());
            broadcast.put("snapshotSaved", response.snapshotSaved());

            broadcastToDoc(docId, broadcast);
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode() == HttpStatus.CONFLICT) {
                DocumentVersionDto.SyncResponse sync = versionService.sync(docId, baseRev, user);
                ObjectNode resync = objectMapper.createObjectNode();
                resync.put("type", "sync");
                resync.put("docId", docId);
                resync.put("currentRev", sync.currentRev());
                resync.put("snapshotRev", sync.snapshotRev());
                resync.put("snapshotJson", sync.snapshotJson());
                resync.set("ops", objectMapper.valueToTree(sync.ops()));
                send(session, null, resync);
            } else {
                sendError(session, "op_failed", ex.getReason() != null ? ex.getReason() : "Operation failed");
            }
        }
    }

    private void handlePresence(WebSocketSession session, JsonNode payload) throws IOException {
        Long docId = requireJoinedDoc(session, payload);
        User user = requireUser(session);

        ObjectNode presence = objectMapper.createObjectNode();
        presence.put("type", "presence");
        presence.put("docId", docId);
        presence.put("actorId", user.getId());
        presence.put("actorEmail", user.getEmail());
        presence.set("cursor", payload.get("cursor"));
        presence.set("selection", payload.get("selection"));

        broadcastToDoc(docId, presence);
    }

    private void broadcastToDoc(Long docId, ObjectNode message) throws IOException {
        Set<WebSocketSession> sessions = docSessions.getOrDefault(docId, Set.of());
        TextMessage textMessage = new TextMessage(objectMapper.writeValueAsString(message));
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                session.sendMessage(textMessage);
            }
        }
    }

    private void send(WebSocketSession session, String type, ObjectNode payload) throws IOException {
        ObjectNode node = payload != null ? payload : objectMapper.createObjectNode();
        if (type != null) {
            node.put("type", type);
        }
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(node)));
    }

    private void sendError(WebSocketSession session, String code, String message) throws IOException {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("type", "error");
        node.put("code", code);
        node.put("message", message);
        send(session, null, node);
    }

    private Long requireJoinedDoc(WebSocketSession session, JsonNode payload) throws IOException {
        long docId = payload.path("docId").asLong(-1);
        Long joinedDoc = sessionDoc.get(session.getId());
        if (docId <= 0) {
            sendError(session, "invalid_payload", "docId is required");
            throw new IOException("docId missing");
        }
        if (joinedDoc == null || !joinedDoc.equals(docId)) {
            sendError(session, "not_joined", "Join the document first");
            throw new IOException("not joined");
        }
        return docId;
    }

    private User requireUser(WebSocketSession session) throws IOException {
        Object userId = session.getAttributes().get("userId");
        if (!(userId instanceof Long id)) {
            sendError(session, "unauthorized", "Missing user session");
            throw new IOException("unauthorized");
        }
        return userRepository.findById(id)
                .orElseThrow(() -> new IOException("user not found"));
    }
}
