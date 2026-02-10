package com.scribeloop.backend.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.scribeloop.backend.support.IntegrationTestBase;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.isEmptyOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest extends IntegrationTestBase {

    @Test
    void registerReturnsTokenAndCanCallAuthedEndpoint() throws Exception {
        String email = "student@example.com";
        String password = "password123";

        String body = json(Map.of("email", email, "password", password));

        String responseJson = mockMvc.perform(
                        post("/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresAt").exists())
                .andExpect(jsonPath("$.accessToken", not(isEmptyOrNullString())))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode payload = objectMapper.readTree(responseJson);
        String token = payload.path("accessToken").asText();

        mockMvc.perform(get("/courses").header("Authorization", bearer(token)))
                .andExpect(status().isOk());
    }

    @Test
    void registerDuplicateEmailReturnsConflict() throws Exception {
        String body = json(Map.of("email", "dupe@example.com", "password", "password123"));

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email already registered"));
    }

    @Test
    void loginWithWrongPasswordIsUnauthorized() throws Exception {
        createUser("login@example.com");

        String body = json(Map.of("email", "login@example.com", "password", "wrong-password"));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid credentials"));
    }

    @Test
    void refreshWithValidTokenReturnsNewToken() throws Exception {
        var user = createUser("refresh@example.com");
        String token = tokenFor(user);

        String body = json(Map.of("token", token));

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresAt").exists())
                .andExpect(jsonPath("$.accessToken", not(isEmptyOrNullString())));
    }
}

