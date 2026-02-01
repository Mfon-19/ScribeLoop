package com.scribeloop.backend.auth;

import jakarta.validation.constraints.NotBlank;

public class RefreshRequest {
    @NotBlank
    private String token;

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }
}
