package com.dhm.backend.controller;

import com.dhm.backend.entity.ReactorTiming;
import com.dhm.backend.repository.ReactorTimingRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reactor-timings")
public class ReactorTimingController {

    private final ReactorTimingRepository repository;

    public ReactorTimingController(
            ReactorTimingRepository repository) {
        this.repository = repository;
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
    public ResponseEntity<ReactorTiming> update(
            @PathVariable Long id,
            @RequestBody ReactorTiming updated) {

        return repository.findById(id)
                .map(timing -> {

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
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        repository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
} 
