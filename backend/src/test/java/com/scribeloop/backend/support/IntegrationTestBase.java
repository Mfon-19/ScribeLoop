package com.scribeloop.backend.support;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scribeloop.backend.course.CourseRepository;
import com.scribeloop.backend.document.DocumentOperationRepository;
import com.scribeloop.backend.document.DocumentRepository;
import com.scribeloop.backend.document.DocumentShareRepository;
import com.scribeloop.backend.document.DocumentSnapshotRepository;
import com.scribeloop.backend.security.JwtService;
import com.scribeloop.backend.user.User;
import com.scribeloop.backend.user.UserRepository;
import com.scribeloop.backend.user.UserRole;
import com.scribeloop.backend.week.CourseWeekRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
public abstract class IntegrationTestBase {
    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected JwtService jwtService;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected CourseRepository courseRepository;

    @Autowired
    protected CourseWeekRepository weekRepository;

    @Autowired
    protected DocumentRepository documentRepository;

    @Autowired
    protected DocumentShareRepository shareRepository;

    @Autowired
    protected DocumentOperationRepository operationRepository;

    @Autowired
    protected DocumentSnapshotRepository snapshotRepository;

    @BeforeEach
    void resetDatabase() {
        operationRepository.deleteAllInBatch();
        snapshotRepository.deleteAllInBatch();
        shareRepository.deleteAllInBatch();
        documentRepository.deleteAllInBatch();
        weekRepository.deleteAllInBatch();
        courseRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    protected User createUser(String email) {
        User user = new User();
        user.setEmail(email.trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setRole(UserRole.EDITOR);
        return userRepository.save(user);
    }

    protected String tokenFor(User user) {
        return jwtService.generateToken(user);
    }

    protected String bearer(String token) {
        return "Bearer " + token;
    }

    protected String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to serialize JSON", ex);
        }
    }
}
