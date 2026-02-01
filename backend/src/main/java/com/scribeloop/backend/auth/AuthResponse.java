package com.scribeloop.backend.auth;

import java.time.Instant;

public class AuthResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private Instant expiresAt;

    public AuthResponse(String accessToken, Instant expiresAt) {
        this.accessToken = accessToken;
        this.expiresAt = expiresAt;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }
}
