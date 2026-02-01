package com.scribeloop.backend.week;

import com.scribeloop.backend.course.Course;
import com.scribeloop.backend.course.CourseService;
import com.scribeloop.backend.user.User;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class CourseWeekService {
    private final CourseWeekRepository weekRepository;
    private final CourseService courseService;

    public CourseWeekService(CourseWeekRepository weekRepository, CourseService courseService) {
        this.weekRepository = weekRepository;
        this.courseService = courseService;
    }

    public List<CourseWeek> listWeeks(Long courseId, User owner) {
        Course course = courseService.getOwnedCourse(courseId, owner);
        return weekRepository.findByCourseIdOrderByWeekIndexAsc(course.getId());
    }

    public CourseWeek createWeek(Long courseId, User owner, int weekIndex, String title) {
        Course course = courseService.getOwnedCourse(courseId, owner);
        CourseWeek week = new CourseWeek();
        week.setCourse(course);
        week.setWeekIndex(weekIndex);
        week.setTitle(title.trim());
        return weekRepository.save(week);
    }

    public CourseWeek updateWeek(Long weekId, User owner, int weekIndex, String title) {
        CourseWeek week = getOwnedWeek(weekId, owner);
        week.setWeekIndex(weekIndex);
        week.setTitle(title.trim());
        return week;
    }

    public void deleteWeek(Long weekId, User owner) {
        CourseWeek week = getOwnedWeek(weekId, owner);
        weekRepository.delete(week);
    }

    public CourseWeek getOwnedWeek(Long weekId, User owner) {
        CourseWeek week = weekRepository.findById(weekId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Week not found"));
        if (!week.getCourse().getOwner().getId().equals(owner.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Week not found");
        }
        return week;
    }
}
