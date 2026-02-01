package com.scribeloop.backend.security;

import com.scribeloop.backend.user.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("accessGuard")
public class AccessGuard {
    public boolean hasRole(Authentication authentication, UserRole role) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        String required = "ROLE_" + role.name();
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> required.equals(authority.getAuthority()));
    }
}
