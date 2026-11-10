package com.dhm.backend.service;

import com.dhm.backend.entity.AuditLog;
import com.dhm.backend.repository.AuditLogRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(String username, String action, String module, Long recordId, String details) {
        try {
            AuditLog log = new AuditLog(
                    username != null ? username : "System",
                    action,
                    module,
                    recordId,
                    details
            );
            auditLogRepository.save(log);
        } catch (Exception e) {
            // Never break main flow if audit logging encounters an issue
            System.err.println("Audit log error: " + e.getMessage());
        }
    }

    public void log(String username, String action, String module, Long recordId, String details, String oldValue, String newValue) {
        try {
            AuditLog log = new AuditLog(
                    username != null ? username : "System",
                    action,
                    module,
                    recordId,
                    details,
                    oldValue,
                    newValue
            );
            auditLogRepository.save(log);
        } catch (Exception e) {
            System.err.println("Audit log error: " + e.getMessage());
        }
    }
}
