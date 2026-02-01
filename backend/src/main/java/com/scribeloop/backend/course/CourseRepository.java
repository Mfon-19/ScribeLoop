package com.scribeloop.backend.course;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {
    List<Course> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);
    Optional<Course> findByIdAndOwnerId(Long id, Long ownerId);
}
