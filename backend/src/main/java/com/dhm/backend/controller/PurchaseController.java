package com.dhm.backend.controller;

import com.dhm.backend.entity.Purchase;
import com.dhm.backend.repository.PurchaseRepository;
import com.dhm.backend.service.RecordAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/purchases")
public class PurchaseController {

    private final RecordAccessService recordAccessService;
    private final PurchaseRepository purchaseRepository;

    public PurchaseController(RecordAccessService recordAccessService, PurchaseRepository purchaseRepository) {
        this.recordAccessService = recordAccessService;
        this.purchaseRepository = purchaseRepository;
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
    public ResponseEntity<?> createPurchase(@RequestBody Purchase purchase) {
        if (purchase.getDate() == null) {
            return ResponseEntity.badRequest().body("Date is required.");
        }

        if (purchase.getCommodity() == null || purchase.getCommodity().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Commodity is required.");
        }

        if (purchase.getVehicleNo() != null) {
            purchase.setVehicleNo(purchase.getVehicleNo().trim());
        }

        // Calculate net weight if gross & tare are provided
        if (purchase.getGrossWeight() != null && purchase.getTareWeight() != null) {
            if (purchase.getTareWeight().compareTo(purchase.getGrossWeight()) >= 0) {
                return ResponseEntity.badRequest().body("Tare weight must be less than gross weight.");
            }
            purchase.setNetWeight(purchase.getGrossWeight().subtract(purchase.getTareWeight()));
        } else if (purchase.getNetWeight() == null || purchase.getNetWeight().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body("Valid net weight or gross/tare weight is required.");
        }

        Purchase saved = purchaseRepository.save(purchase);
        return ResponseEntity.ok(saved);
    }

    // Update purchase
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePurchase(@PathVariable Long id,
                                            @RequestBody Purchase updatedPurchase,
                                            Authentication authentication) {

        return purchaseRepository.findById(id)
                .map(purchase -> {
                    if (!recordAccessService.canModify(purchase.getDate(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisor cannot edit previous-day records.");
                    }

                    if (updatedPurchase.getDate() == null) {
                        return ResponseEntity.badRequest().body("Date is required.");
                    }

                    purchase.setDate(updatedPurchase.getDate());

                    if (updatedPurchase.getVehicleNo() != null) {
                        purchase.setVehicleNo(updatedPurchase.getVehicleNo().trim());
                    }

                    purchase.setGrossWeight(updatedPurchase.getGrossWeight());
                    purchase.setTareWeight(updatedPurchase.getTareWeight());

                    if (updatedPurchase.getGrossWeight() != null && updatedPurchase.getTareWeight() != null) {
                        purchase.setNetWeight(updatedPurchase.getGrossWeight().subtract(updatedPurchase.getTareWeight()));
                    } else if (updatedPurchase.getNetWeight() != null) {
                        purchase.setNetWeight(updatedPurchase.getNetWeight());
                    }

                    purchase.setCommodity(updatedPurchase.getCommodity());
                    purchase.setRemarks(updatedPurchase.getRemarks());

                    return ResponseEntity.ok(purchaseRepository.save(purchase));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete purchase
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePurchase(@PathVariable Long id, Authentication authentication) {
        return purchaseRepository.findById(id)
                .map(purchase -> {
                    if (!recordAccessService.canModify(purchase.getDate(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisor cannot delete previous-day records.");
                    }

                    purchaseRepository.delete(purchase);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
