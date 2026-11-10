package com.dhm.backend.controller;

import com.dhm.backend.entity.Payment;
import com.dhm.backend.entity.Purchase;
import com.dhm.backend.entity.Sale;
import com.dhm.backend.repository.PaymentRepository;
import com.dhm.backend.repository.PurchaseRepository;
import com.dhm.backend.repository.SaleRepository;
import com.dhm.backend.service.AuditLogService;
import com.dhm.backend.service.NotificationService;
import com.dhm.backend.service.RecordAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentRepository paymentRepository;
    private final SaleRepository saleRepository;
    private final PurchaseRepository purchaseRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final RecordAccessService recordAccessService;

    public PaymentController(PaymentRepository paymentRepository,
                             SaleRepository saleRepository,
                             PurchaseRepository purchaseRepository,
                             AuditLogService auditLogService,
                             NotificationService notificationService,
                             RecordAccessService recordAccessService) {
        this.paymentRepository = paymentRepository;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
        this.recordAccessService = recordAccessService;
    }

    @GetMapping
    public List<Payment> getAll() {
        return paymentRepository.findTop50ByOrderByPaymentDateDescIdDesc();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> recordPayment(@RequestBody Payment payment, Authentication authentication) {
        ResponseEntity<?> validationError = validatePayment(payment);
        if (validationError != null) return validationError;

        String username = authentication != null ? authentication.getName() : "System";
        payment.setRecordedBy(username);

        Payment saved = paymentRepository.save(payment);
        applyPaymentEffect(saved, 1);

        auditLogService.log(username, "CREATE", "PAYMENT", saved.getId(),
                payment.getPaymentType() + " of ₹" + payment.getAmount() + " for " + payment.getPartyName(),
                null, snapshot(saved));
        notificationService.notify("Payment Recorded: ₹" + payment.getAmount(),
                payment.getPaymentType() + " via " + payment.getPaymentMethod() + " (" + payment.getPartyName() + ")",
                "SUCCESS", "PAYMENT");

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updatePayment(@PathVariable Long id, @RequestBody Payment updated, Authentication authentication) {
        return paymentRepository.findById(id)
                .map(existing -> {
                    if (!recordAccessService.canModify(existing.getPaymentDate(), existing.getRecordedBy(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisors can only edit their own payment records on the same day (until 11:59 PM IST).");
                    }

                    ResponseEntity<?> validationError = validatePayment(updated);
                    if (validationError != null) return validationError;

                    String oldSnapshot = snapshot(existing);
                    // Reverse old effect, apply new effect
                    applyPaymentEffect(existing, -1);

                    existing.setPaymentDate(updated.getPaymentDate() != null ? updated.getPaymentDate() : existing.getPaymentDate());
                    existing.setPaymentType(updated.getPaymentType());
                    existing.setPartyId(updated.getPartyId());
                    existing.setPartyName(updated.getPartyName());
                    existing.setReferenceType(updated.getReferenceType());
                    existing.setReferenceId(updated.getReferenceId());
                    existing.setReferenceNo(updated.getReferenceNo());
                    existing.setAmount(updated.getAmount());
                    existing.setPaymentMethod(updated.getPaymentMethod());
                    existing.setTransactionRef(updated.getTransactionRef());
                    existing.setRemarks(updated.getRemarks());

                    Payment saved = paymentRepository.save(existing);
                    applyPaymentEffect(saved, 1);

                    String username = authentication != null ? authentication.getName() : "System";
                    auditLogService.log(username, "UPDATE", "PAYMENT", saved.getId(), "Payment updated.", oldSnapshot, snapshot(saved));
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deletePayment(@PathVariable Long id, Authentication authentication) {
        return paymentRepository.findById(id)
                .map(p -> {
                    if (!recordAccessService.canModify(p.getPaymentDate(), p.getRecordedBy(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisors can only delete their own payment records on the same day (until 11:59 PM IST).");
                    }

                    String oldSnapshot = snapshot(p);
                    applyPaymentEffect(p, -1);
                    paymentRepository.delete(p);
                    String username = authentication != null ? authentication.getName() : "System";
                    auditLogService.log(username, "DELETE", "PAYMENT", id, "Payment deleted.", oldSnapshot, null);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private ResponseEntity<?> validatePayment(Payment payment) {
        if (payment.getAmount() == null || payment.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body("Payment amount must be greater than zero.");
        }
        if (payment.getPartyName() == null || payment.getPartyName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Party name (Customer/Supplier) is required.");
        }
        if (payment.getPaymentType() == null || payment.getPaymentType().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Payment type is required.");
        }
        if (payment.getPaymentDate() == null) {
            payment.setPaymentDate(java.time.LocalDate.now());
        }
        return null;
    }

    private String snapshot(Payment p) {
        return "date=" + p.getPaymentDate() + ", type=" + p.getPaymentType() + ", party=" + p.getPartyName() + ", amount=" + p.getAmount() + ", method=" + p.getPaymentMethod() + ", refType=" + p.getReferenceType() + ", refId=" + p.getReferenceId() + ", refNo=" + p.getReferenceNo() + ", txnRef=" + p.getTransactionRef() + ", recordedBy=" + p.getRecordedBy();
    }

    private void applyPaymentEffect(Payment payment, int direction) {
        if (payment == null || payment.getReferenceId() == null || payment.getAmount() == null) return;
        BigDecimal delta = payment.getAmount().multiply(BigDecimal.valueOf(direction));

        if ("CUSTOMER_PAYMENT".equalsIgnoreCase(payment.getPaymentType())) {
            saleRepository.findById(payment.getReferenceId()).ifPresent(sale -> {
                BigDecimal currentPaid = sale.getPaidAmount() != null ? sale.getPaidAmount() : BigDecimal.ZERO;
                BigDecimal newPaid = currentPaid.add(delta);
                if (newPaid.compareTo(BigDecimal.ZERO) < 0) newPaid = BigDecimal.ZERO;
                sale.setPaidAmount(newPaid);
                updateSalePaymentStatus(sale);
                saleRepository.save(sale);
            });
        } else if ("SUPPLIER_PAYMENT".equalsIgnoreCase(payment.getPaymentType())) {
            purchaseRepository.findById(payment.getReferenceId()).ifPresent(purchase -> {
                BigDecimal currentPaid = purchase.getPaidAmount() != null ? purchase.getPaidAmount() : BigDecimal.ZERO;
                BigDecimal newPaid = currentPaid.add(delta);
                if (newPaid.compareTo(BigDecimal.ZERO) < 0) newPaid = BigDecimal.ZERO;
                purchase.setPaidAmount(newPaid);
                updatePurchasePaymentStatus(purchase);
                purchaseRepository.save(purchase);
            });
        }
    }

    private void updateSalePaymentStatus(Sale sale) {
        BigDecimal paid = sale.getPaidAmount() != null ? sale.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal grand = sale.getGrandTotal() != null ? sale.getGrandTotal() : BigDecimal.ZERO;
        if (grand.compareTo(BigDecimal.ZERO) > 0 && paid.compareTo(grand) >= 0) {
            sale.setPaymentStatus("PAID");
        } else if (paid.compareTo(BigDecimal.ZERO) > 0) {
            sale.setPaymentStatus("PARTIAL");
        } else {
            sale.setPaymentStatus("PENDING");
        }
    }

    private void updatePurchasePaymentStatus(Purchase purchase) {
        BigDecimal paid = purchase.getPaidAmount() != null ? purchase.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal grand = purchase.getGrandTotal() != null ? purchase.getGrandTotal() : BigDecimal.ZERO;
        if (grand.compareTo(BigDecimal.ZERO) > 0 && paid.compareTo(grand) >= 0) {
            purchase.setPaymentStatus("PAID");
        } else if (paid.compareTo(BigDecimal.ZERO) > 0) {
            purchase.setPaymentStatus("PARTIAL");
        } else {
            purchase.setPaymentStatus("PENDING");
        }
    }
}
