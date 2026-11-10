package com.dhm.backend.controller;

import com.dhm.backend.entity.Purchase;
import com.dhm.backend.repository.PurchaseRepository;
import com.dhm.backend.service.AuditLogService;
import com.dhm.backend.service.NotificationService;
import com.dhm.backend.service.RecordAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/purchases")
public class PurchaseController {

    private final RecordAccessService recordAccessService;
    private final PurchaseRepository purchaseRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    public PurchaseController(RecordAccessService recordAccessService,
                              PurchaseRepository purchaseRepository,
                              AuditLogService auditLogService,
                              NotificationService notificationService) {
        this.recordAccessService = recordAccessService;
        this.purchaseRepository = purchaseRepository;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    // Get all purchases
    @GetMapping
    public List<Purchase> getAllPurchases() {
        return purchaseRepository.findAll();
    }

    // Get purchase by ID
    @GetMapping("/{id}")
    public ResponseEntity<Purchase> getPurchaseById(@PathVariable Long id) {
        return purchaseRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Create purchase
    @PostMapping
    public ResponseEntity<?> createPurchase(@RequestBody Purchase purchase, Authentication authentication) {
        if (purchase.getDate() == null) {
            return ResponseEntity.badRequest().body("Date is required.");
        }

        if (purchase.getCommodity() == null || purchase.getCommodity().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Commodity is required.");
        }

        if (purchase.getVehicleNo() != null) {
            purchase.setVehicleNo(purchase.getVehicleNo().trim().toUpperCase());
        }

        // Prevent duplicate transaction creation for the same vehicle
        if (purchase.getVehicleId() != null) {
            java.util.Optional<Purchase> existing = purchaseRepository.findByVehicleId(purchase.getVehicleId());
            if (existing.isPresent()) {
                return ResponseEntity.badRequest().body("A Purchase entry (" + existing.get().getPurchaseOrderNo() + ") is already linked to vehicle entry #" + purchase.getVehicleId());
            }
        }

        String username = authentication != null ? authentication.getName() : "System";
        purchase.setCreatedBy(username);

        if (purchase.getPurchaseOrderNo() == null || purchase.getPurchaseOrderNo().trim().isEmpty()) {
            purchase.setPurchaseOrderNo("PO-" + LocalDate.now().getYear() + "-" + String.format("%04d", purchaseRepository.count() + 1));
        }

        calculateFinancials(purchase);

        Purchase saved = purchaseRepository.save(purchase);

        String newSnapshot = "date=" + saved.getDate() + ", po=" + saved.getPurchaseOrderNo() + ", vehicleId=" + saved.getVehicleId() + ", vehicleNo=" + saved.getVehicleNo() + ", supplier=" + saved.getSupplierName() + ", net=" + saved.getNetWeight() + ", grand=" + saved.getGrandTotal() + ", paid=" + saved.getPaidAmount() + ", status=" + saved.getPaymentStatus();
        auditLogService.log(username, "CREATE", "PURCHASE", saved.getId(), "Purchase PO " + saved.getPurchaseOrderNo() + " recorded.", null, newSnapshot);
        notificationService.notify("Raw Material Inward: " + saved.getCommodity(),
                "Inward entry of " + saved.getNetWeight() + " KG recorded from " + (saved.getSupplierName() != null ? saved.getSupplierName() : "Supplier"),
                "INFO", "PURCHASE");

        return ResponseEntity.ok(saved);
    }

    // Update purchase
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePurchase(@PathVariable Long id,
                                            @RequestBody Purchase updatedPurchase,
                                            Authentication authentication) {

        return purchaseRepository.findById(id)
                .map(purchase -> {
                    if (!recordAccessService.canModify(purchase.getDate(), purchase.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisors can only edit their own purchase records on the same day (until 11:59 PM IST).");
                    }

                    if (updatedPurchase.getDate() == null) {
                        return ResponseEntity.badRequest().body("Date is required.");
                    }

                    String oldSnapshot = "date=" + purchase.getDate() + ", po=" + purchase.getPurchaseOrderNo() + ", vehicleId=" + purchase.getVehicleId() + ", vehicleNo=" + purchase.getVehicleNo() + ", supplier=" + purchase.getSupplierName() + ", net=" + purchase.getNetWeight() + ", grand=" + purchase.getGrandTotal() + ", paid=" + purchase.getPaidAmount() + ", status=" + purchase.getPaymentStatus();

                    if (updatedPurchase.getVehicleId() != null && !updatedPurchase.getVehicleId().equals(purchase.getVehicleId())) {
                        java.util.Optional<Purchase> existing = purchaseRepository.findByVehicleId(updatedPurchase.getVehicleId());
                        if (existing.isPresent() && !existing.get().getId().equals(purchase.getId())) {
                            return ResponseEntity.badRequest().body("A Purchase entry (" + existing.get().getPurchaseOrderNo() + ") is already linked to vehicle entry #" + updatedPurchase.getVehicleId());
                        }
                    }

                    purchase.setDate(updatedPurchase.getDate());

                    if (updatedPurchase.getVehicleNo() != null) {
                        purchase.setVehicleNo(updatedPurchase.getVehicleNo().trim().toUpperCase());
                    }

                    purchase.setPurchaseOrderNo(updatedPurchase.getPurchaseOrderNo());
                    purchase.setSupplierInvoiceNo(updatedPurchase.getSupplierInvoiceNo());
                    purchase.setSupplierId(updatedPurchase.getSupplierId());
                    purchase.setSupplierName(updatedPurchase.getSupplierName());
                    purchase.setGrossWeight(updatedPurchase.getGrossWeight());
                    purchase.setTareWeight(updatedPurchase.getTareWeight());
                    purchase.setUnitPrice(updatedPurchase.getUnitPrice());
                    purchase.setDiscount(updatedPurchase.getDiscount());
                    purchase.setTaxRate(updatedPurchase.getTaxRate());
                    purchase.setPaidAmount(updatedPurchase.getPaidAmount());
                    purchase.setPaymentStatus(updatedPurchase.getPaymentStatus());
                    purchase.setCommodity(updatedPurchase.getCommodity());
                    purchase.setRemarks(updatedPurchase.getRemarks());
                    if (updatedPurchase.getVehicleId() != null) {
                        purchase.setVehicleId(updatedPurchase.getVehicleId());
                    }

                    calculateFinancials(purchase);

                    Purchase saved = purchaseRepository.save(purchase);

                    String username = authentication != null ? authentication.getName() : "System";
                    String newSnapshot = "date=" + saved.getDate() + ", po=" + saved.getPurchaseOrderNo() + ", vehicleId=" + saved.getVehicleId() + ", vehicleNo=" + saved.getVehicleNo() + ", supplier=" + saved.getSupplierName() + ", net=" + saved.getNetWeight() + ", grand=" + saved.getGrandTotal() + ", paid=" + saved.getPaidAmount() + ", status=" + saved.getPaymentStatus();
                    auditLogService.log(username, "UPDATE", "PURCHASE", saved.getId(), "Purchase record updated.", oldSnapshot, newSnapshot);

                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete purchase
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePurchase(@PathVariable Long id, Authentication authentication) {
        return purchaseRepository.findById(id)
                .map(purchase -> {
                    if (!recordAccessService.canModify(purchase.getDate(), purchase.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisors can only delete their own purchase records on the same day (until 11:59 PM IST).");
                    }

                    String oldSnapshot = "date=" + purchase.getDate() + ", po=" + purchase.getPurchaseOrderNo() + ", vehicleId=" + purchase.getVehicleId() + ", supplier=" + purchase.getSupplierName() + ", net=" + purchase.getNetWeight() + ", grand=" + purchase.getGrandTotal() + ", status=" + purchase.getPaymentStatus();
                    purchaseRepository.delete(purchase);

                    String username = authentication != null ? authentication.getName() : "System";
                    auditLogService.log(username, "DELETE", "PURCHASE", id, "Purchase record deleted.", oldSnapshot, null);

                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private void calculateFinancials(Purchase purchase) {
        if (purchase.getGrossWeight() != null && purchase.getTareWeight() != null) {
            purchase.setNetWeight(purchase.getGrossWeight().subtract(purchase.getTareWeight()));
        }

        BigDecimal net = purchase.getNetWeight() != null ? purchase.getNetWeight() : BigDecimal.ZERO;
        BigDecimal price = purchase.getUnitPrice() != null ? purchase.getUnitPrice() : BigDecimal.ZERO;
        BigDecimal disc = purchase.getDiscount() != null ? purchase.getDiscount() : BigDecimal.ZERO;
        BigDecimal tax = purchase.getTaxRate() != null ? purchase.getTaxRate() : new BigDecimal("18.00");

        BigDecimal sub = net.multiply(price).subtract(disc);
        if (sub.compareTo(BigDecimal.ZERO) < 0) sub = BigDecimal.ZERO;

        BigDecimal taxVal = sub.multiply(tax).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal grand = sub.add(taxVal);

        purchase.setSubtotal(sub.setScale(2, RoundingMode.HALF_UP));
        purchase.setTaxAmount(taxVal);
        purchase.setGrandTotal(grand.setScale(2, RoundingMode.HALF_UP));

        BigDecimal paid = purchase.getPaidAmount() != null ? purchase.getPaidAmount() : BigDecimal.ZERO;
        if (grand.compareTo(BigDecimal.ZERO) > 0) {
            if (paid.compareTo(grand) >= 0) {
                purchase.setPaymentStatus("PAID");
            } else if (paid.compareTo(BigDecimal.ZERO) > 0) {
                purchase.setPaymentStatus("PARTIAL");
            } else {
                purchase.setPaymentStatus("PENDING");
            }
        }
    }
}
