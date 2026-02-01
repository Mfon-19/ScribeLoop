package com.scribeloop.backend.course;

import com.scribeloop.backend.course.CourseDto.CourseRequest;
import com.scribeloop.backend.course.CourseDto.CourseResponse;
import com.scribeloop.backend.user.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/courses")
public class CourseController {
    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping
    public List<CourseResponse> listCourses(@AuthenticationPrincipal UserPrincipal principal) {
        return courseService.listCourses(principal.getUser())
                .stream()
                .map(course -> new CourseResponse(
                        course.getId(),
                        course.getTitle(),
                        course.getCreatedAt().toString()
                ))
                .toList();
    }

    @PostMapping
    public CourseResponse createCourse(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CourseRequest request
    ) {
        Course course = courseService.createCourse(principal.getUser(), request.title());
        return new CourseResponse(course.getId(), course.getTitle(), course.getCreatedAt().toString());
    }

    @GetMapping("/{courseId}")
    public CourseResponse getCourse(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long courseId
    ) {
        Course course = courseService.getOwnedCourse(courseId, principal.getUser());
        return new CourseResponse(course.getId(), course.getTitle(), course.getCreatedAt().toString());
    }

    @PatchMapping("/{courseId}")
    public CourseResponse updateCourse(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long courseId,
            @Valid @RequestBody CourseRequest request
    ) {
        Course course = courseService.updateCourse(courseId, principal.getUser(), request.title());
        return new CourseResponse(course.getId(), course.getTitle(), course.getCreatedAt().toString());
    }

    @DeleteMapping("/{courseId}")
    public void deleteCourse(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long courseId
    ) {
        courseService.deleteCourse(courseId, principal.getUser());
    }
}
