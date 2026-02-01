package com.scribeloop.backend.week;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseWeekRepository extends JpaRepository<CourseWeek, Long> {
    List<CourseWeek> findByCourseIdOrderByWeekIndexAsc(Long courseId);
    Optional<CourseWeek> findByIdAndCourseId(Long id, Long courseId);
}
