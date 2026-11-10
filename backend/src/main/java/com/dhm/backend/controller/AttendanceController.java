package com.dhm.backend.controller;

import com.dhm.backend.entity.Attendance;
import com.dhm.backend.repository.AttendanceRepository;
import com.dhm.backend.service.AuditLogService;
import com.dhm.backend.service.RecordAccessService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceRepository attendanceRepository;
    private final AuditLogService auditLogService;
    private final RecordAccessService recordAccessService;

    public AttendanceController(AttendanceRepository attendanceRepository, AuditLogService auditLogService, RecordAccessService recordAccessService) {
        this.attendanceRepository = attendanceRepository;
        this.auditLogService = auditLogService;
        this.recordAccessService = recordAccessService;
    }

    @GetMapping
    public List<Attendance> getAttendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long employeeId) {

        if (date != null) {
            return attendanceRepository.findByDate(date);
        } else if (employeeId != null) {
            return attendanceRepository.findByEmployeeId(employeeId);
        }
        return attendanceRepository.findByDate(LocalDate.now());
    }

    @PostMapping
    public ResponseEntity<?> recordAttendance(@RequestBody Attendance attendance, Authentication authentication) {
        if (attendance.getEmployeeId() == null) {
            return ResponseEntity.badRequest().body("Employee ID is required.");
        }

        if (attendance.getDate() == null) {
            attendance.setDate(LocalDate.now());
        }

        String username = authentication != null ? authentication.getName() : "System";
        attendance.setCreatedBy(username);

        Attendance saved = attendanceRepository.save(attendance);
        auditLogService.log(username, "CREATE", "ATTENDANCE", saved.getId(),
                "Attendance marked for " + saved.getEmployeeName() + " (" + saved.getStatus() + ")",
                null,
                "date=" + saved.getDate() + ", emp=" + saved.getEmployeeName() + ", status=" + saved.getStatus() + ", shift=" + saved.getShift());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAttendance(@PathVariable Long id, @RequestBody Attendance updated, Authentication authentication) {
        return attendanceRepository.findById(id)
                .map(existing -> {
                    if (!recordAccessService.canModify(existing.getDate(), existing.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403).body("Supervisors can only edit their own attendance records on the same day (until 11:59 PM IST).");
                    }
                    String oldVal = "date=" + existing.getDate() + ", emp=" + existing.getEmployeeName() + ", status=" + existing.getStatus() + ", shift=" + existing.getShift();
                    existing.setDate(updated.getDate() != null ? updated.getDate() : existing.getDate());
                    existing.setEmployeeId(updated.getEmployeeId() != null ? updated.getEmployeeId() : existing.getEmployeeId());
                    existing.setEmployeeName(updated.getEmployeeName() != null ? updated.getEmployeeName() : existing.getEmployeeName());
                    existing.setDepartment(updated.getDepartment() != null ? updated.getDepartment() : existing.getDepartment());
                    existing.setStatus(updated.getStatus() != null ? updated.getStatus() : existing.getStatus());
                    existing.setShift(updated.getShift() != null ? updated.getShift() : existing.getShift());
                    existing.setRemarks(updated.getRemarks() != null ? updated.getRemarks() : existing.getRemarks());
                    Attendance saved = attendanceRepository.save(existing);
                    String username = authentication != null ? authentication.getName() : "System";
                    String newVal = "date=" + saved.getDate() + ", emp=" + saved.getEmployeeName() + ", status=" + saved.getStatus() + ", shift=" + saved.getShift();
                    auditLogService.log(username, "UPDATE", "ATTENDANCE", saved.getId(), "Attendance updated", oldVal, newVal);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAttendance(@PathVariable Long id, Authentication authentication) {
        return attendanceRepository.findById(id)
                .map(existing -> {
                    if (!recordAccessService.canModify(existing.getDate(), existing.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403).body("Supervisors can only delete their own attendance records on the same day (until 11:59 PM IST).");
                    }
                    String oldSnapshot = "date=" + existing.getDate() + ", emp=" + existing.getEmployeeName() + ", status=" + existing.getStatus() + ", shift=" + existing.getShift();
                    attendanceRepository.delete(existing);
                    String username = authentication != null ? authentication.getName() : "System";
                    auditLogService.log(username, "DELETE", "ATTENDANCE", id, "Attendance deleted", oldSnapshot, null);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
