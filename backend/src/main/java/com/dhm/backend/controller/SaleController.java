package com.dhm.backend.controller;

import com.dhm.backend.entity.Sale;
import com.dhm.backend.repository.SaleRepository;
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
@RequestMapping("/api/sales")
public class SaleController {

    private final SaleRepository saleRepository;
    private final RecordAccessService recordAccessService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    public SaleController(SaleRepository saleRepository,
                          RecordAccessService recordAccessService,
                          AuditLogService auditLogService,
                          NotificationService notificationService) {
        this.saleRepository = saleRepository;
        this.recordAccessService = recordAccessService;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    // Get all sales
    @GetMapping
    public List<Sale> getAllSales() {
        return saleRepository.findAll();
    }

    // Get sale by ID
    @GetMapping("/{id}")
    public ResponseEntity<Sale> getSaleById(@PathVariable Long id) {
        return saleRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Create sale
    @PostMapping
    public ResponseEntity<?> createSale(@RequestBody Sale sale, Authentication authentication) {
        if (sale.getDate() == null) {
            return ResponseEntity.badRequest().body("Date is required.");
        }

        if (sale.getVehicleNo() == null || sale.getVehicleNo().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vehicle number is required.");
        }

        if (sale.getCommodity() == null || sale.getCommodity().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Commodity is required.");
        }

        sale.setVehicleNo(sale.getVehicleNo().trim().toUpperCase());

        // Prevent duplicate transaction creation for the same vehicle
        if (sale.getVehicleId() != null) {
            java.util.Optional<Sale> existing = saleRepository.findByVehicleId(sale.getVehicleId());
            if (existing.isPresent()) {
                return ResponseEntity.badRequest().body("A Sales invoice (" + existing.get().getInvoiceNo() + ") is already linked to vehicle entry #" + sale.getVehicleId());
            }
        }

        String username = authentication != null ? authentication.getName() : "System";
        sale.setCreatedBy(username);

        // Generate invoice number if not provided
        if (sale.getInvoiceNo() == null || sale.getInvoiceNo().trim().isEmpty()) {
            sale.setInvoiceNo("INV-" + LocalDate.now().getYear() + "-" + String.format("%04d", saleRepository.count() + 1));
        }

        calculateFinancials(sale);

        Sale saved = saleRepository.save(sale);

        String newSnapshot = "date=" + saved.getDate() + ", invoice=" + saved.getInvoiceNo() + ", vehicleId=" + saved.getVehicleId() + ", vehicleNo=" + saved.getVehicleNo() + ", customer=" + saved.getCustomerName() + ", net=" + saved.getNetWeight() + ", grand=" + saved.getGrandTotal() + ", paid=" + saved.getPaidAmount() + ", status=" + saved.getPaymentStatus();
        auditLogService.log(username, "CREATE", "SALES", saved.getId(), "Invoice " + saved.getInvoiceNo() + " created. Amount: Rs." + saved.getGrandTotal(), null, newSnapshot);
        notificationService.notify("Sales Invoice Generated: " + saved.getInvoiceNo(),
                "Sale of " + saved.getCommodity() + " (" + saved.getNetWeight() + " KG) to " + (saved.getCustomerName() != null ? saved.getCustomerName() : "Customer"),
                "SUCCESS", "SALES");

        return ResponseEntity.ok(saved);
    }

    // Update sale
    @PutMapping("/{id}")
    public ResponseEntity<?> updateSale(@PathVariable Long id,
                                        @RequestBody Sale updatedSale,
                                        Authentication authentication) {

        return saleRepository.findById(id)
                .map(sale -> {
                    if (!recordAccessService.canModify(sale.getDate(), sale.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisors can only edit their own sales records on the same day (until 11:59 PM IST).");
                    }

                    if (updatedSale.getDate() == null) {
                        return ResponseEntity.badRequest().body("Date is required.");
                    }

                    if (updatedSale.getVehicleNo() == null || updatedSale.getVehicleNo().trim().isEmpty()) {
                        return ResponseEntity.badRequest().body("Vehicle number is required.");
                    }

                    String oldSnapshot = "date=" + sale.getDate() + ", invoice=" + sale.getInvoiceNo() + ", vehicleId=" + sale.getVehicleId() + ", vehicleNo=" + sale.getVehicleNo() + ", customer=" + sale.getCustomerName() + ", net=" + sale.getNetWeight() + ", grand=" + sale.getGrandTotal() + ", paid=" + sale.getPaidAmount() + ", status=" + sale.getPaymentStatus();

                    // If vehicle link is changed, prevent duplicate link to another sale
                    if (updatedSale.getVehicleId() != null && !updatedSale.getVehicleId().equals(sale.getVehicleId())) {
                        java.util.Optional<Sale> existing = saleRepository.findByVehicleId(updatedSale.getVehicleId());
                        if (existing.isPresent() && !existing.get().getId().equals(sale.getId())) {
                            return ResponseEntity.badRequest().body("A Sales invoice (" + existing.get().getInvoiceNo() + ") is already linked to vehicle entry #" + updatedSale.getVehicleId());
                        }
                    }

                    sale.setDate(updatedSale.getDate());
                    sale.setVehicleNo(updatedSale.getVehicleNo().trim().toUpperCase());
                    sale.setCustomerId(updatedSale.getCustomerId());
                    sale.setCustomerName(updatedSale.getCustomerName());
                    sale.setGrossWeight(updatedSale.getGrossWeight());
                    sale.setTareWeight(updatedSale.getTareWeight());
                    sale.setCommodity(updatedSale.getCommodity());
                    sale.setUnitPrice(updatedSale.getUnitPrice());
                    sale.setDiscount(updatedSale.getDiscount());
                    sale.setTaxRate(updatedSale.getTaxRate());
                    sale.setPaidAmount(updatedSale.getPaidAmount());
                    sale.setPaymentStatus(updatedSale.getPaymentStatus());
                    sale.setRemarks(updatedSale.getRemarks());
                    if (updatedSale.getVehicleId() != null) {
                        sale.setVehicleId(updatedSale.getVehicleId());
                    }

                    calculateFinancials(sale);

                    Sale saved = saleRepository.save(sale);

                    String username = authentication != null ? authentication.getName() : "System";
                    String newSnapshot = "date=" + saved.getDate() + ", invoice=" + saved.getInvoiceNo() + ", vehicleId=" + saved.getVehicleId() + ", vehicleNo=" + saved.getVehicleNo() + ", customer=" + saved.getCustomerName() + ", net=" + saved.getNetWeight() + ", grand=" + saved.getGrandTotal() + ", paid=" + saved.getPaidAmount() + ", status=" + saved.getPaymentStatus();
                    auditLogService.log(username, "UPDATE", "SALES", saved.getId(), "Invoice " + saved.getInvoiceNo() + " updated.", oldSnapshot, newSnapshot);

                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete sale
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSale(@PathVariable Long id, Authentication authentication) {
        return saleRepository.findById(id)
                .map(sale -> {
                    if (!recordAccessService.canModify(sale.getDate(), sale.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisors can only delete their own sales records on the same day (until 11:59 PM IST).");
                    }

                    String oldSnapshot = "date=" + sale.getDate() + ", invoice=" + sale.getInvoiceNo() + ", vehicleId=" + sale.getVehicleId() + ", customer=" + sale.getCustomerName() + ", net=" + sale.getNetWeight() + ", grand=" + sale.getGrandTotal() + ", status=" + sale.getPaymentStatus();
                    saleRepository.delete(sale);

                    String username = authentication != null ? authentication.getName() : "System";
                    auditLogService.log(username, "DELETE", "SALES", id, "Sale record deleted.", oldSnapshot, null);

                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private void calculateFinancials(Sale sale) {
        if (sale.getGrossWeight() != null && sale.getTareWeight() != null) {
            sale.setNetWeight(sale.getGrossWeight().subtract(sale.getTareWeight()));
        }

        BigDecimal net = sale.getNetWeight() != null ? sale.getNetWeight() : BigDecimal.ZERO;
        BigDecimal price = sale.getUnitPrice() != null ? sale.getUnitPrice() : BigDecimal.ZERO;
        BigDecimal disc = sale.getDiscount() != null ? sale.getDiscount() : BigDecimal.ZERO;
        BigDecimal tax = sale.getTaxRate() != null ? sale.getTaxRate() : new BigDecimal("18.00");

        BigDecimal sub = net.multiply(price).subtract(disc);
        if (sub.compareTo(BigDecimal.ZERO) < 0) sub = BigDecimal.ZERO;

        BigDecimal taxVal = sub.multiply(tax).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal grand = sub.add(taxVal);

        sale.setSubtotal(sub.setScale(2, RoundingMode.HALF_UP));
        sale.setTaxAmount(taxVal);
        sale.setGrandTotal(grand.setScale(2, RoundingMode.HALF_UP));

        BigDecimal paid = sale.getPaidAmount() != null ? sale.getPaidAmount() : BigDecimal.ZERO;
        if (grand.compareTo(BigDecimal.ZERO) > 0) {
            if (paid.compareTo(grand) >= 0) {
                sale.setPaymentStatus("PAID");
            } else if (paid.compareTo(BigDecimal.ZERO) > 0) {
                sale.setPaymentStatus("PARTIAL");
            } else {
                sale.setPaymentStatus("PENDING");
            }
        }
    }
}
