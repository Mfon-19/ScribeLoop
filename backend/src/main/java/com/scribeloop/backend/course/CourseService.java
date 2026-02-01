package com.scribeloop.backend.course;

import com.scribeloop.backend.user.User;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class CourseService {
    private final CourseRepository courseRepository;

    public CourseService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    public List<Course> listCourses(User owner) {
        return courseRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId());
    }

    public Course createCourse(User owner, String title) {
        Course course = new Course();
        course.setOwner(owner);
        course.setTitle(title.trim());
        return courseRepository.save(course);
    }

    public Course getOwnedCourse(Long courseId, User owner) {
        return courseRepository.findByIdAndOwnerId(courseId, owner.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found"));
    }

    public Course updateCourse(Long courseId, User owner, String title) {
        Course course = getOwnedCourse(courseId, owner);
        course.setTitle(title.trim());
        return course;
    }

    public void deleteCourse(Long courseId, User owner) {
        Course course = getOwnedCourse(courseId, owner);
        courseRepository.delete(course);
    }
}
