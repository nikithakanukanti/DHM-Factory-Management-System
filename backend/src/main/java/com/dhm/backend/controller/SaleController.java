package com.dhm.backend.controller;

import com.dhm.backend.entity.Sale;
import com.dhm.backend.repository.SaleRepository;
import com.dhm.backend.service.RecordAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
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
    public ResponseEntity<?> createSale(@RequestBody Sale sale) {
        if (sale.getDate() == null) {
            return ResponseEntity.badRequest().body("Date is required.");
        }

        if (sale.getVehicleNo() == null || sale.getVehicleNo().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vehicle number is required.");
        }

        if (sale.getCommodity() == null || sale.getCommodity().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Commodity is required.");
        }

        sale.setVehicleNo(sale.getVehicleNo().trim());

        if (sale.getGrossWeight() != null && sale.getTareWeight() != null) {
            if (sale.getTareWeight().compareTo(sale.getGrossWeight()) >= 0) {
                return ResponseEntity.badRequest().body("Tare weight must be less than gross weight.");
            }
            sale.setNetWeight(sale.getGrossWeight().subtract(sale.getTareWeight()));
        }

        Sale saved = saleRepository.save(sale);
        return ResponseEntity.ok(saved);
    }

    // Update sale
    @PutMapping("/{id}")
    public ResponseEntity<?> updateSale(@PathVariable Long id,
                                        @RequestBody Sale updatedSale,
                                        Authentication authentication) {

        return saleRepository.findById(id)
                .map(sale -> {
                    if (!recordAccessService.canModify(sale.getDate(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisor cannot edit previous-day records.");
                    }

                    if (updatedSale.getDate() == null) {
                        return ResponseEntity.badRequest().body("Date is required.");
                    }

                    if (updatedSale.getVehicleNo() == null || updatedSale.getVehicleNo().trim().isEmpty()) {
                        return ResponseEntity.badRequest().body("Vehicle number is required.");
                    }

                    sale.setDate(updatedSale.getDate());
                    sale.setVehicleNo(updatedSale.getVehicleNo().trim());
                    sale.setGrossWeight(updatedSale.getGrossWeight());
                    sale.setTareWeight(updatedSale.getTareWeight());

                    if (updatedSale.getGrossWeight() != null && updatedSale.getTareWeight() != null) {
                        sale.setNetWeight(updatedSale.getGrossWeight().subtract(updatedSale.getTareWeight()));
                    } else if (updatedSale.getNetWeight() != null) {
                        sale.setNetWeight(updatedSale.getNetWeight());
                    }

                    sale.setCommodity(updatedSale.getCommodity());
                    sale.setRemarks(updatedSale.getRemarks());

                    return ResponseEntity.ok(saleRepository.save(sale));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete sale
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSale(@PathVariable Long id, Authentication authentication) {
        return saleRepository.findById(id)
                .map(sale -> {
                    if (!recordAccessService.canModify(sale.getDate(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisor cannot delete previous-day records.");
                    }

                    saleRepository.delete(sale);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
