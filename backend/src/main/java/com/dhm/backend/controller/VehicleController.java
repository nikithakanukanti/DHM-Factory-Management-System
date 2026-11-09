package com.dhm.backend.controller;

import com.dhm.backend.entity.Purchase;
import com.dhm.backend.entity.Sale;
import com.dhm.backend.entity.Vehicle;
import com.dhm.backend.repository.PurchaseRepository;
import com.dhm.backend.repository.SaleRepository;
import com.dhm.backend.repository.VehicleRepository;
import com.dhm.backend.service.RecordAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleRepository vehicleRepository;
    private final SaleRepository saleRepository;
    private final PurchaseRepository purchaseRepository;
    private final RecordAccessService recordAccessService;

    public VehicleController(VehicleRepository vehicleRepository,
                             SaleRepository saleRepository,
                             PurchaseRepository purchaseRepository,
                             RecordAccessService recordAccessService) {
        this.vehicleRepository = vehicleRepository;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.recordAccessService = recordAccessService;
    }

    // ==============================
    // GET ALL VEHICLES
    // ==============================
    @GetMapping
    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    // ==============================
    // GET VEHICLE BY ID
    // ==============================
    @GetMapping("/{id}")
    public ResponseEntity<Vehicle> getVehicleById(@PathVariable Long id) {
        return vehicleRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ==============================
    // CREATE VEHICLE (Master Weighbridge Entry)
    // ==============================
    @PostMapping
    @Transactional
    public ResponseEntity<?> createVehicle(@RequestBody Vehicle vehicle) {
        if (vehicle.getDate() == null) {
            return ResponseEntity.badRequest().body("Date is required.");
        }

        if (vehicle.getVehicleNo() == null || vehicle.getVehicleNo().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vehicle number is required.");
        }

        if (vehicle.getGrossWeight() == null || vehicle.getGrossWeight().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body("Gross weight must be greater than zero.");
        }

        if (vehicle.getTareWeight() == null || vehicle.getTareWeight().compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest().body("Tare weight cannot be negative.");
        }

        if (vehicle.getTareWeight().compareTo(vehicle.getGrossWeight()) >= 0) {
            return ResponseEntity.badRequest().body("Tare weight must be less than gross weight.");
        }

        vehicle.setVehicleNo(vehicle.getVehicleNo().trim());
        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        // Sync with Sales Register if selected
        if ("SALES".equalsIgnoreCase(savedVehicle.getRegisterType())) {
            Sale sale = new Sale();
            sale.setVehicleId(savedVehicle.getId());
            sale.setDate(savedVehicle.getDate());
            sale.setVehicleNo(savedVehicle.getVehicleNo());
            sale.setGrossWeight(savedVehicle.getGrossWeight());
            sale.setTareWeight(savedVehicle.getTareWeight());
            sale.setCommodity(savedVehicle.getCommodity());
            sale.setRemarks(savedVehicle.getRemarks());
            saleRepository.save(sale);
        }
        // Sync with Purchase Register if selected
        else if ("PURCHASE".equalsIgnoreCase(savedVehicle.getRegisterType())) {
            Purchase purchase = new Purchase();
            purchase.setVehicleId(savedVehicle.getId());
            purchase.setDate(savedVehicle.getDate());
            purchase.setVehicleNo(savedVehicle.getVehicleNo());
            purchase.setGrossWeight(savedVehicle.getGrossWeight());
            purchase.setTareWeight(savedVehicle.getTareWeight());
            purchase.setCommodity(savedVehicle.getCommodity());
            purchase.setRemarks(savedVehicle.getRemarks());
            purchaseRepository.save(purchase);
        }

        return ResponseEntity.ok(savedVehicle);
    }

    // ==============================
    // UPDATE VEHICLE (Synchronizes linked Sales/Purchase)
    // ==============================
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateVehicle(@PathVariable Long id,
                                          @RequestBody Vehicle updatedVehicle,
                                          Authentication authentication) {

        return vehicleRepository.findById(id)
                .map(vehicle -> {
                    if (!recordAccessService.canModify(vehicle.getDate(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisor cannot edit previous-day records.");
                    }

                    if (updatedVehicle.getDate() == null) {
                        return ResponseEntity.badRequest().body("Date is required.");
                    }

                    if (updatedVehicle.getVehicleNo() == null || updatedVehicle.getVehicleNo().trim().isEmpty()) {
                        return ResponseEntity.badRequest().body("Vehicle number is required.");
                    }

                    if (updatedVehicle.getGrossWeight() == null || updatedVehicle.getGrossWeight().compareTo(BigDecimal.ZERO) <= 0) {
                        return ResponseEntity.badRequest().body("Gross weight must be greater than zero.");
                    }

                    if (updatedVehicle.getTareWeight() == null || updatedVehicle.getTareWeight().compareTo(BigDecimal.ZERO) < 0) {
                        return ResponseEntity.badRequest().body("Tare weight cannot be negative.");
                    }

                    if (updatedVehicle.getTareWeight().compareTo(updatedVehicle.getGrossWeight()) >= 0) {
                        return ResponseEntity.badRequest().body("Tare weight must be less than gross weight.");
                    }

                    vehicle.setDate(updatedVehicle.getDate());
                    vehicle.setVehicleNo(updatedVehicle.getVehicleNo().trim());
                    vehicle.setGrossWeight(updatedVehicle.getGrossWeight());
                    vehicle.setTareWeight(updatedVehicle.getTareWeight());
                    vehicle.setLocal(updatedVehicle.isLocal());
                    vehicle.setImported(updatedVehicle.isImported());
                    vehicle.setCommodity(updatedVehicle.getCommodity());
                    vehicle.setRemarks(updatedVehicle.getRemarks());
                    vehicle.setRegisterType(updatedVehicle.getRegisterType());

                    Vehicle savedVehicle = vehicleRepository.save(vehicle);

                    // Sync linked Sale
                    Optional<Sale> existingSaleOpt = saleRepository.findByVehicleId(savedVehicle.getId());
                    if ("SALES".equalsIgnoreCase(savedVehicle.getRegisterType())) {
                        Sale sale = existingSaleOpt.orElseGet(() -> {
                            Sale s = new Sale();
                            s.setVehicleId(savedVehicle.getId());
                            return s;
                        });
                        sale.setDate(savedVehicle.getDate());
                        sale.setVehicleNo(savedVehicle.getVehicleNo());
                        sale.setGrossWeight(savedVehicle.getGrossWeight());
                        sale.setTareWeight(savedVehicle.getTareWeight());
                        sale.setCommodity(savedVehicle.getCommodity());
                        sale.setRemarks(savedVehicle.getRemarks());
                        saleRepository.save(sale);

                        // If it previously had a purchase, remove it
                        purchaseRepository.findByVehicleId(savedVehicle.getId()).ifPresent(purchaseRepository::delete);
                    } else if (existingSaleOpt.isPresent()) {
                        saleRepository.delete(existingSaleOpt.get());
                    }

                    // Sync linked Purchase
                    Optional<Purchase> existingPurchaseOpt = purchaseRepository.findByVehicleId(savedVehicle.getId());
                    if ("PURCHASE".equalsIgnoreCase(savedVehicle.getRegisterType())) {
                        Purchase purchase = existingPurchaseOpt.orElseGet(() -> {
                            Purchase p = new Purchase();
                            p.setVehicleId(savedVehicle.getId());
                            return p;
                        });
                        purchase.setDate(savedVehicle.getDate());
                        purchase.setVehicleNo(savedVehicle.getVehicleNo());
                        purchase.setGrossWeight(savedVehicle.getGrossWeight());
                        purchase.setTareWeight(savedVehicle.getTareWeight());
                        purchase.setCommodity(savedVehicle.getCommodity());
                        purchase.setRemarks(savedVehicle.getRemarks());
                        purchaseRepository.save(purchase);

                        // If it previously had a sale, remove it
                        saleRepository.findByVehicleId(savedVehicle.getId()).ifPresent(saleRepository::delete);
                    } else if (existingPurchaseOpt.isPresent()) {
                        purchaseRepository.delete(existingPurchaseOpt.get());
                    }

                    return ResponseEntity.ok(savedVehicle);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ==============================
    // DELETE VEHICLE (Cascade removes linked Sales/Purchase)
    // ==============================
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteVehicle(@PathVariable Long id, Authentication authentication) {
        return vehicleRepository.findById(id)
                .map(vehicle -> {
                    if (!recordAccessService.canModify(vehicle.getDate(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisor cannot delete previous-day records.");
                    }

                    // Delete linked sale or purchase
                    saleRepository.findByVehicleId(id).ifPresent(saleRepository::delete);
                    purchaseRepository.findByVehicleId(id).ifPresent(purchaseRepository::delete);

                    vehicleRepository.delete(vehicle);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
