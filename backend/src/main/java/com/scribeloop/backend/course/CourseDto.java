package com.scribeloop.backend.course;

import jakarta.validation.constraints.NotBlank;

public final class CourseDto {
    private CourseDto() {
    }

    public record CourseRequest(@NotBlank String title) {
    }

    public record CourseResponse(Long id, String title, String createdAt) {
    }
}
