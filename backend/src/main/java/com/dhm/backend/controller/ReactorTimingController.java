package com.dhm.backend.controller;

import com.dhm.backend.entity.ReactorTiming;
import com.dhm.backend.repository.ReactorTimingRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.dhm.backend.service.RecordAccessService;
import org.springframework.security.core.Authentication;

import java.util.List;

@RestController
@RequestMapping("/api/reactor-timings")
public class ReactorTimingController {

    private final ReactorTimingRepository repository;
    private final RecordAccessService recordAccessService;

    public ReactorTimingController(
            ReactorTimingRepository repository,
            RecordAccessService recordAccessService) {
        this.repository = repository;
        this.recordAccessService = recordAccessService;
    }

    @GetMapping
    public List<ReactorTiming> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReactorTiming> getById(
            @PathVariable Long id) {

        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ReactorTiming create(
            @RequestBody ReactorTiming timing) {

        return repository.save(timing);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody ReactorTiming updated,
            Authentication authentication) {

        return repository.findById(id)
                .map(timing -> {
                    if (!recordAccessService.canModify(
                            timing.getDate(),
                            authentication)) {

                        return ResponseEntity.status(403)
                                .body("Supervisor cannot edit previous-day records.");
                    }

                    timing.setDate(updated.getDate());
                    timing.setReactor1Time(
                            updated.getReactor1Time()
                    );
                    timing.setReactor2Time(
                            updated.getReactor2Time()
                    );

                    return ResponseEntity.ok(
                            repository.save(timing)
                    );
                })
                .orElse(ResponseEntity.notFound().build());
    }

   @DeleteMapping("/{id}")
public ResponseEntity<?> delete(
        @PathVariable Long id,
        Authentication authentication) {

    return repository.findById(id)
            .map(timing -> {

                if (!recordAccessService.canModify(
                        timing.getDate(),
                        authentication)) {

                    return ResponseEntity.status(403)
                            .body("Supervisor cannot delete previous-day records.");
                }

                repository.delete(timing);

                return ResponseEntity.noContent().build();
            })
            .orElse(ResponseEntity.notFound().build());
} 
}
