package com.scribeloop.backend.week;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public final class CourseWeekDto {
    private CourseWeekDto() {
    }

    public record WeekRequest(@Min(1) int weekIndex, @NotBlank String title) {
    }

    public record WeekResponse(Long id, Long courseId, int weekIndex, String title, String createdAt) {
    }
}
