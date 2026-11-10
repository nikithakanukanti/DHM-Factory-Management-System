package com.dhm.backend.controller;

import com.dhm.backend.entity.AuditLog;
import com.dhm.backend.repository.AuditLogRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    public AuditLogController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public List<AuditLog> getLogs() {
        return auditLogRepository.findTop100ByOrderByTimestampDesc();
    }

    @GetMapping("/module/{module}")
    public List<AuditLog> getByModule(@PathVariable String module) {
        return auditLogRepository.findByModuleOrderByTimestampDesc(module);
    }
}
