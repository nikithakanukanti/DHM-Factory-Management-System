package com.dhm.backend.controller;

import com.dhm.backend.entity.Employee;
import com.dhm.backend.repository.EmployeeRepository;
import com.dhm.backend.service.AuditLogService;
import com.dhm.backend.service.RecordAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeRepository employeeRepository;
    private final AuditLogService auditLogService;
    private final RecordAccessService recordAccessService;

    public EmployeeController(EmployeeRepository employeeRepository, AuditLogService auditLogService, RecordAccessService recordAccessService) {
        this.employeeRepository = employeeRepository;
        this.auditLogService = auditLogService;
        this.recordAccessService = recordAccessService;
    }

    @GetMapping
    public List<Employee> getAll() {
        return employeeRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Employee employee, Authentication authentication) {
        if (employee.getName() == null || employee.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Employee name is required.");
        }

        if (employee.getEmployeeCode() == null || employee.getEmployeeCode().trim().isEmpty()) {
            employee.setEmployeeCode("EMP-" + String.format("%03d", employeeRepository.count() + 1));
        }

        String username = authentication != null ? authentication.getName() : "System";
        if (employee.getCreatedAt() == null) employee.setCreatedAt(LocalDate.now());
        employee.setCreatedBy(username);

        Employee saved = employeeRepository.save(employee);
        auditLogService.log(username, "CREATE", "EMPLOYEE", saved.getId(), "Employee " + saved.getName() + " registered.",
                null, "code=" + saved.getEmployeeCode() + ", name=" + saved.getName() + ", dept=" + saved.getDepartment() + ", status=" + saved.getStatus());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Employee updated, Authentication authentication) {
        return employeeRepository.findById(id)
                .map(e -> {
                    LocalDate recordDate = e.getCreatedAt() != null ? e.getCreatedAt() : LocalDate.now();
                    if (!recordAccessService.canModify(recordDate, e.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403).body("Supervisors can only edit their own employee records on the same day (until 11:59 PM IST).");
                    }

                    String oldSnapshot = "code=" + e.getEmployeeCode() + ", name=" + e.getName() + ", phone=" + e.getPhone() + ", dept=" + e.getDepartment() + ", desig=" + e.getDesignation() + ", status=" + e.getStatus() + ", salary=" + e.getBasicSalary();
                    e.setName(updated.getName());
                    e.setPhone(updated.getPhone());
                    e.setEmail(updated.getEmail());
                    e.setDepartment(updated.getDepartment());
                    e.setDesignation(updated.getDesignation());
                    e.setStatus(updated.getStatus());
                    e.setBasicSalary(updated.getBasicSalary());

                    Employee saved = employeeRepository.save(e);
                    String username = authentication != null ? authentication.getName() : "System";
                    String newSnapshot = "code=" + saved.getEmployeeCode() + ", name=" + saved.getName() + ", phone=" + saved.getPhone() + ", dept=" + saved.getDepartment() + ", desig=" + saved.getDesignation() + ", status=" + saved.getStatus() + ", salary=" + saved.getBasicSalary();
                    auditLogService.log(username, "UPDATE", "EMPLOYEE", id, "Employee " + saved.getName() + " updated.", oldSnapshot, newSnapshot);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        return employeeRepository.findById(id)
                .map(e -> {
                    LocalDate recordDate = e.getCreatedAt() != null ? e.getCreatedAt() : LocalDate.now();
                    if (!recordAccessService.canModify(recordDate, e.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403).body("Supervisors can only delete their own employee records on the same day (until 11:59 PM IST).");
                    }
                    String oldSnapshot = "code=" + e.getEmployeeCode() + ", name=" + e.getName() + ", dept=" + e.getDepartment() + ", status=" + e.getStatus();
                    employeeRepository.delete(e);
                    String username = authentication != null ? authentication.getName() : "System";
                    auditLogService.log(username, "DELETE", "EMPLOYEE", id, "Employee deleted.", oldSnapshot, null);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
