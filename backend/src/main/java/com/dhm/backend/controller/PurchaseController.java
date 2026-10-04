package com.dhm.backend.controller;

import com.dhm.backend.entity.Purchase;
import com.dhm.backend.repository.PurchaseRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchases")
public class PurchaseController {

    private final PurchaseRepository purchaseRepository;

    public PurchaseController(PurchaseRepository purchaseRepository) {
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
    public ResponseEntity<Purchase> updatePurchase(
            @PathVariable Long id,
            @RequestBody Purchase updatedPurchase) {

        return purchaseRepository.findById(id)
                .map(purchase -> {

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

    // Delete purchase
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePurchase(
            @PathVariable Long id) {

        if (!purchaseRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        purchaseRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}