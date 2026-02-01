package com.scribeloop.backend.week;

import com.scribeloop.backend.user.UserPrincipal;
import com.scribeloop.backend.week.CourseWeekDto.WeekRequest;
import com.scribeloop.backend.week.CourseWeekDto.WeekResponse;
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
@RequestMapping
public class CourseWeekController {
    private final CourseWeekService weekService;

    public CourseWeekController(CourseWeekService weekService) {
        this.weekService = weekService;
    }

    @GetMapping("/courses/{courseId}/weeks")
    public List<WeekResponse> listWeeks(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long courseId
    ) {
        return weekService.listWeeks(courseId, principal.getUser())
                .stream()
                .map(week -> new WeekResponse(
                        week.getId(),
                        week.getCourse().getId(),
                        week.getWeekIndex(),
                        week.getTitle(),
                        week.getCreatedAt().toString()
                ))
                .toList();
    }

    @PostMapping("/courses/{courseId}/weeks")
    public WeekResponse createWeek(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long courseId,
            @Valid @RequestBody WeekRequest request
    ) {
        CourseWeek week = weekService.createWeek(courseId, principal.getUser(), request.weekIndex(), request.title());
        return new WeekResponse(
                week.getId(),
                week.getCourse().getId(),
                week.getWeekIndex(),
                week.getTitle(),
                week.getCreatedAt().toString()
        );
    }

    @PatchMapping("/weeks/{weekId}")
    public WeekResponse updateWeek(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long weekId,
            @Valid @RequestBody WeekRequest request
    ) {
        CourseWeek week = weekService.updateWeek(weekId, principal.getUser(), request.weekIndex(), request.title());
        return new WeekResponse(
                week.getId(),
                week.getCourse().getId(),
                week.getWeekIndex(),
                week.getTitle(),
                week.getCreatedAt().toString()
        );
    }

    @DeleteMapping("/weeks/{weekId}")
    public void deleteWeek(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long weekId
    ) {
        weekService.deleteWeek(weekId, principal.getUser());
    }
}
