package com.dhm.backend.controller;

import com.dhm.backend.entity.ReactorTiming;
import com.dhm.backend.repository.ReactorTimingRepository;
import com.dhm.backend.service.AuditLogService;
import com.dhm.backend.service.RecordAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reactor-timings")
public class ReactorTimingController {

    private final ReactorTimingRepository repository;
    private final RecordAccessService recordAccessService;
    private final AuditLogService auditLogService;

    public ReactorTimingController(
            ReactorTimingRepository repository,
            RecordAccessService recordAccessService,
            AuditLogService auditLogService) {
        this.repository = repository;
        this.recordAccessService = recordAccessService;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<ReactorTiming> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReactorTiming> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ReactorTiming timing, Authentication authentication) {
        if (timing.getDate() == null) {
            return ResponseEntity.badRequest().body("Date is required.");
        }

        String username = authentication != null ? authentication.getName() : "System";
        if (timing.getCreatedBy() == null || timing.getCreatedBy().trim().isEmpty()) {
            timing.setCreatedBy(username);
        }
        if (timing.getResponsibleUser() == null || timing.getResponsibleUser().trim().isEmpty()) {
            timing.setResponsibleUser(timing.getOperatorName() != null ? timing.getOperatorName() : username);
        }
        // Backward compatibility mapping
        if (timing.getStartTime() == null && timing.getReactor1Time() != null) timing.setStartTime(timing.getReactor1Time());
        if (timing.getEndTime() == null && timing.getReactor2Time() != null) timing.setEndTime(timing.getReactor2Time());

        ReactorTiming saved = repository.save(timing);
        auditLogService.log(username, "CREATE", "REACTOR_TIMING", saved.getId(),
                "Reactor timing recorded for " + saved.getDate(),
                null,
                "start=" + saved.getStartTime() + ", end=" + saved.getEndTime() + ", responsible=" + saved.getResponsibleUser());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody ReactorTiming updated,
            Authentication authentication) {

        return repository.findById(id)
                .map(timing -> {
                    if (!recordAccessService.canModify(timing.getDate(), timing.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisors can only edit their own reactor timing records on the same day (until 11:59 PM IST).");
                    }

                    String oldSnapshot = "date=" + timing.getDate() + ", start=" + timing.getStartTime() + ", end=" + timing.getEndTime() +
                            ", responsible=" + timing.getResponsibleUser() + ", remarks=" + timing.getRemarks() +
                            ", related=" + timing.getRelatedTransactionType() + ":" + timing.getRelatedTransactionId();

                    timing.setDate(updated.getDate() != null ? updated.getDate() : timing.getDate());
                    timing.setStartTime(updated.getStartTime() != null ? updated.getStartTime() : (updated.getReactor1Time() != null ? updated.getReactor1Time() : timing.getStartTime()));
                    timing.setEndTime(updated.getEndTime() != null ? updated.getEndTime() : (updated.getReactor2Time() != null ? updated.getReactor2Time() : timing.getEndTime()));
                    timing.setReactor1Time(timing.getStartTime());
                    timing.setReactor2Time(timing.getEndTime());
                    timing.setOperatorName(updated.getOperatorName() != null ? updated.getOperatorName() : timing.getOperatorName());
                    timing.setShift(updated.getShift() != null ? updated.getShift() : timing.getShift());
                    timing.setBatchNo(updated.getBatchNo() != null ? updated.getBatchNo() : timing.getBatchNo());
                    timing.setRemarks(updated.getRemarks() != null ? updated.getRemarks() : timing.getRemarks());
                    timing.setResponsibleUser(updated.getResponsibleUser() != null ? updated.getResponsibleUser() : (updated.getOperatorName() != null ? updated.getOperatorName() : timing.getResponsibleUser()));
                    timing.setRelatedTransactionType(updated.getRelatedTransactionType());
                    timing.setRelatedTransactionId(updated.getRelatedTransactionId());

                    ReactorTiming saved = repository.save(timing);
                    String username = authentication != null ? authentication.getName() : "System";
                    String newSnapshot = "date=" + saved.getDate() + ", start=" + saved.getStartTime() + ", end=" + saved.getEndTime() +
                            ", responsible=" + saved.getResponsibleUser() + ", remarks=" + saved.getRemarks() +
                            ", related=" + saved.getRelatedTransactionType() + ":" + saved.getRelatedTransactionId();
                    auditLogService.log(username, "UPDATE", "REACTOR_TIMING", saved.getId(), "Reactor timing updated", oldSnapshot, newSnapshot);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        return repository.findById(id)
                .map(timing -> {
                    if (!recordAccessService.canModify(timing.getDate(), timing.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisors can only delete their own reactor timing records on the same day (until 11:59 PM IST).");
                    }

                    String oldSnapshot = "date=" + timing.getDate() + ", start=" + timing.getStartTime() + ", end=" + timing.getEndTime() +
                            ", responsible=" + timing.getResponsibleUser() + ", remarks=" + timing.getRemarks() +
                            ", related=" + timing.getRelatedTransactionType() + ":" + timing.getRelatedTransactionId();
                    repository.delete(timing);
                    String username = authentication != null ? authentication.getName() : "System";
                    auditLogService.log(username, "DELETE", "REACTOR_TIMING", id, "Reactor timing deleted", oldSnapshot, null);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
