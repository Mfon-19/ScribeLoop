package com.scribeloop.backend.api;

import com.scribeloop.backend.support.IntegrationTestBase;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DocumentSharingAccessTest extends IntegrationTestBase {

    @Test
    void sharedUsersHaveCorrectAccessAndPermissions() throws Exception {
        var owner = createUser("owner@example.com");
        var viewer = createUser("viewer@example.com");
        var editor = createUser("editor@example.com");

        String ownerToken = tokenFor(owner);
        String viewerToken = tokenFor(viewer);
        String editorToken = tokenFor(editor);

        String courseJson = mockMvc.perform(post("/courses")
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "CS101"))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        long courseId = objectMapper.readTree(courseJson).path("id").asLong();

        String documentJson = mockMvc.perform(post("/documents")
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("courseId", courseId, "title", "Week 1 Notes"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Week 1 Notes"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        long documentId = objectMapper.readTree(documentJson).path("id").asLong();

        mockMvc.perform(post("/documents/" + documentId + "/share")
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "viewer@example.com", "role", "VIEWER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("viewer@example.com"))
                .andExpect(jsonPath("$.role").value("VIEWER"));

        mockMvc.perform(get("/documents/" + documentId + "/access")
                        .header("Authorization", bearer(viewerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("VIEWER"))
                .andExpect(jsonPath("$.canEdit").value(false));

        mockMvc.perform(get("/courses/" + courseId + "/documents")
                        .header("Authorization", bearer(viewerToken)))
                .andExpect(status().isNotFound());

        mockMvc.perform(patch("/documents/" + documentId)
                        .header("Authorization", bearer(viewerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "Viewer edit attempt"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/documents/" + documentId + "/share")
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "editor@example.com", "role", "EDITOR"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("editor@example.com"))
                .andExpect(jsonPath("$.role").value("EDITOR"));

        mockMvc.perform(get("/documents/" + documentId + "/access")
                        .header("Authorization", bearer(editorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("EDITOR"))
                .andExpect(jsonPath("$.canEdit").value(true));

        mockMvc.perform(patch("/documents/" + documentId)
                        .header("Authorization", bearer(editorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "Edited by editor"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Edited by editor"));

        mockMvc.perform(get("/documents/" + documentId + "/shares")
                        .header("Authorization", bearer(editorToken)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/documents/" + documentId + "/shares")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].email", containsInAnyOrder("viewer@example.com", "editor@example.com")));

        mockMvc.perform(get("/documents/shared")
                        .header("Authorization", bearer(viewerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(documentId))
                .andExpect(jsonPath("$[0].role").value("VIEWER"));
    }
}
