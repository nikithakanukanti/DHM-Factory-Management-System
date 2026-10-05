package com.dhm.backend.controller;

import com.dhm.backend.entity.Purchase;
import com.dhm.backend.repository.PurchaseRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.dhm.backend.service.RecordAccessService;
import org.springframework.security.core.Authentication;

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
    public ResponseEntity<Purchase> getPurchaseById(
            @PathVariable Long id) {

        return purchaseRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Create purchase
    @PostMapping
    public Purchase createPurchase(
            @RequestBody Purchase purchase) {

        return purchaseRepository.save(purchase);
    }

    // Update purchase
   @PutMapping("/{id}")
public ResponseEntity<?> updatePurchase(
        @PathVariable Long id,
        @RequestBody Purchase updatedPurchase,
        Authentication authentication) {

    return purchaseRepository.findById(id)
            .map(purchase -> {

                if (!recordAccessService.canModify(
                        purchase.getDate(),
                        authentication)) {

                    return ResponseEntity.status(403)
                            .body("Supervisor cannot edit previous-day records.");
                }

                purchase.setDate(updatedPurchase.getDate());
                purchase.setGrossWeight(
                        updatedPurchase.getGrossWeight()
                );
                purchase.setTareWeight(
                        updatedPurchase.getTareWeight()
                );
                purchase.setCommodity(
                        updatedPurchase.getCommodity()
                );
                purchase.setRemarks(
                        updatedPurchase.getRemarks()
                );

                return ResponseEntity.ok(
                        purchaseRepository.save(purchase)
                );
            })
            .orElse(ResponseEntity.notFound().build());
}

@DeleteMapping("/{id}")
public ResponseEntity<?> deletePurchase(
        @PathVariable Long id,
        Authentication authentication) {

    return purchaseRepository.findById(id)
            .map(purchase -> {

                if (!recordAccessService.canModify(
                        purchase.getDate(),
                        authentication)) {

                    return ResponseEntity.status(403)
                            .body("Supervisor cannot delete previous-day records.");
                }

                purchaseRepository.delete(purchase);

                return ResponseEntity.noContent().build();
            })
            .orElse(ResponseEntity.notFound().build());
        }
}