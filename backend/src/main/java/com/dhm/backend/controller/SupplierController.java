package com.dhm.backend.controller;

import com.dhm.backend.entity.Payment;
import com.dhm.backend.entity.Purchase;
import com.dhm.backend.entity.Supplier;
import com.dhm.backend.repository.PaymentRepository;
import com.dhm.backend.repository.PurchaseRepository;
import com.dhm.backend.repository.SupplierRepository;
import com.dhm.backend.service.AuditLogService;
import com.dhm.backend.service.RecordAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierRepository supplierRepository;
    private final PurchaseRepository purchaseRepository;
    private final PaymentRepository paymentRepository;
    private final AuditLogService auditLogService;
    private final RecordAccessService recordAccessService;

    public SupplierController(SupplierRepository supplierRepository,
                              PurchaseRepository purchaseRepository,
                              PaymentRepository paymentRepository,
                              AuditLogService auditLogService,
                              RecordAccessService recordAccessService) {
        this.supplierRepository = supplierRepository;
        this.purchaseRepository = purchaseRepository;
        this.paymentRepository = paymentRepository;
        this.auditLogService = auditLogService;
        this.recordAccessService = recordAccessService;
    }

    @GetMapping
    public List<Supplier> getAll() {
        return supplierRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Supplier> getById(@PathVariable Long id) {
        return supplierRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Supplier Statement (Purchase history + Pending balances + Payment logs)
    @GetMapping("/{id}/statement")
    public ResponseEntity<?> getSupplierStatement(@PathVariable Long id) {
        return supplierRepository.findById(id)
                .map(supplier -> {
                    List<Purchase> purchases = purchaseRepository.findBySupplierId(id);
                    if (purchases.isEmpty() && supplier.getName() != null) {
                        purchases = purchaseRepository.findBySupplierNameIgnoreCase(supplier.getName().trim());
                    }

                    List<Payment> payments = paymentRepository.findByPartyIdAndPaymentType(id, "SUPPLIER_PAYMENT");

                    BigDecimal totalPurchasesAmount = purchases.stream()
                            .map(Purchase::getGrandTotal)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal totalPaidAmount = purchases.stream()
                            .map(Purchase::getPaidAmount)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal outstandingBalance = totalPurchasesAmount.subtract(totalPaidAmount).max(BigDecimal.ZERO);

                    Map<String, Object> statement = new HashMap<>();
                    statement.put("supplier", supplier);
                    statement.put("purchases", purchases);
                    statement.put("payments", payments);
                    statement.put("totalPurchasesCount", purchases.size());
                    statement.put("totalPurchasesAmount", totalPurchasesAmount);
                    statement.put("totalPaidAmount", totalPaidAmount);
                    statement.put("outstandingBalance", outstandingBalance);

                    return ResponseEntity.ok(statement);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Supplier supplier, Authentication authentication) {
        if (supplier.getName() == null || supplier.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Supplier name is required.");
        }

        if (supplier.getSupplierCode() == null || supplier.getSupplierCode().trim().isEmpty()) {
            supplier.setSupplierCode("SUPP-" + String.format("%04d", supplierRepository.count() + 1));
        }

        String username = authentication != null ? authentication.getName() : "System";
        if (supplier.getCreatedAt() == null) supplier.setCreatedAt(LocalDate.now());
        supplier.setCreatedBy(username);

        Supplier saved = supplierRepository.save(supplier);
        auditLogService.log(username, "CREATE", "SUPPLIER", saved.getId(), "Supplier " + saved.getName() + " added.",
                null, "code=" + saved.getSupplierCode() + ", name=" + saved.getName() + ", phone=" + saved.getPhone() + ", status=" + saved.getStatus());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Supplier updated, Authentication authentication) {
        return supplierRepository.findById(id)
                .map(s -> {
                    LocalDate recordDate = s.getCreatedAt() != null ? s.getCreatedAt() : LocalDate.now();
                    if (!recordAccessService.canModify(recordDate, s.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403).body("Supervisors can only edit their own supplier records on the same day (until 11:59 PM IST).");
                    }

                    String oldSnapshot = "code=" + s.getSupplierCode() + ", name=" + s.getName() + ", phone=" + s.getPhone() + ", email=" + s.getEmail() + ", gstin=" + s.getGstin() + ", status=" + s.getStatus();
                    s.setName(updated.getName());
                    s.setPhone(updated.getPhone());
                    s.setEmail(updated.getEmail());
                    s.setAddress(updated.getAddress());
                    s.setGstin(updated.getGstin());
                    s.setStatus(updated.getStatus());

                    Supplier saved = supplierRepository.save(s);
                    String username = authentication != null ? authentication.getName() : "System";
                    String newSnapshot = "code=" + saved.getSupplierCode() + ", name=" + saved.getName() + ", phone=" + saved.getPhone() + ", email=" + saved.getEmail() + ", gstin=" + saved.getGstin() + ", status=" + saved.getStatus();
                    auditLogService.log(username, "UPDATE", "SUPPLIER", id, "Supplier " + saved.getName() + " updated.", oldSnapshot, newSnapshot);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        return supplierRepository.findById(id)
                .map(s -> {
                    LocalDate recordDate = s.getCreatedAt() != null ? s.getCreatedAt() : LocalDate.now();
                    if (!recordAccessService.canModify(recordDate, s.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403).body("Supervisors can only delete their own supplier records on the same day (until 11:59 PM IST).");
                    }
                    String oldSnapshot = "code=" + s.getSupplierCode() + ", name=" + s.getName() + ", phone=" + s.getPhone() + ", status=" + s.getStatus();
                    supplierRepository.delete(s);
                    String username = authentication != null ? authentication.getName() : "System";
                    auditLogService.log(username, "DELETE", "SUPPLIER", id, "Supplier deleted.", oldSnapshot, null);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
