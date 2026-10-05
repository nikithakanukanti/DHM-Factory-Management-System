package com.dhm.backend.controller;

import com.dhm.backend.entity.Sale;
import com.dhm.backend.repository.SaleRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.dhm.backend.service.RecordAccessService;
import org.springframework.security.core.Authentication;

import java.util.List;

@RestController
@RequestMapping("/api/sales")
public class SaleController {

    private final SaleRepository saleRepository;
    private final RecordAccessService recordAccessService;

    public SaleController(SaleRepository saleRepository, RecordAccessService recordAccessService) {
        this.saleRepository = saleRepository;
        this.recordAccessService = recordAccessService;
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
    public Sale createSale(@RequestBody Sale sale) {
        return saleRepository.save(sale);
    }

    // Update sale
    @PutMapping("/{id}")
    public ResponseEntity<?> updateSale(
            @PathVariable Long id,
            @RequestBody Sale updatedSale,
            Authentication authentication) {

        return saleRepository.findById(id)
                .map(sale -> {
                    if (!recordAccessService.canModify(
                            sale.getDate(),
                            authentication)) {

                        return ResponseEntity.status(403)
                                .body("Supervisor cannot edit previous-day records.");
                    }

                    sale.setDate(updatedSale.getDate());
                    sale.setVehicleNo(updatedSale.getVehicleNo());
                    sale.setGrossWeight(updatedSale.getGrossWeight());
                    sale.setTareWeight(updatedSale.getTareWeight());
                    sale.setCommodity(updatedSale.getCommodity());
                    sale.setRemarks(updatedSale.getRemarks());

                    return ResponseEntity.ok(
                            saleRepository.save(sale)
                    );
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete sale
    @DeleteMapping("/{id}")
public ResponseEntity<?> deleteSale(
        @PathVariable Long id,
        Authentication authentication) {

    return saleRepository.findById(id)
            .map(sale -> {

                if (!recordAccessService.canModify(
                        sale.getDate(),
                        authentication)) {

                    return ResponseEntity.status(403)
                            .body("Supervisor cannot delete previous-day records.");
                }

                saleRepository.delete(sale);

                return ResponseEntity.noContent().build();
            })
            .orElse(ResponseEntity.notFound().build());
}
}
