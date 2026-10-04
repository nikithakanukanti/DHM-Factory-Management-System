package com.dhm.backend.controller;

import com.dhm.backend.entity.Sale;
import com.dhm.backend.repository.SaleRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sales")
public class SaleController {

    private final SaleRepository saleRepository;

    public SaleController(SaleRepository saleRepository) {
        this.saleRepository = saleRepository;
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
    public ResponseEntity<Sale> updateSale(
            @PathVariable Long id,
            @RequestBody Sale updatedSale) {

        return saleRepository.findById(id)
                .map(sale -> {

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
    public ResponseEntity<Void> deleteSale(@PathVariable Long id) {

        if (!saleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        saleRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}