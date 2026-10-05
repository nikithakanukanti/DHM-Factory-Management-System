package com.dhm.backend.controller;

import com.dhm.backend.entity.Vehicle;
import com.dhm.backend.repository.VehicleRepository;

import com.dhm.backend.service.RecordAccessService;
import org.springframework.security.core.Authentication;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleRepository vehicleRepository;
    private final RecordAccessService recordAccessService;

    public VehicleController(VehicleRepository vehicleRepository, RecordAccessService recordAccessService) {
        this.vehicleRepository = vehicleRepository;
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
    public ResponseEntity<Vehicle> getVehicleById(
            @PathVariable Long id) {

        return vehicleRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ==============================
    // CREATE VEHICLE
    // ==============================

    @PostMapping
    public ResponseEntity<?> createVehicle(
            @RequestBody Vehicle vehicle) {

        if (vehicle.getDate() == null) {
            return ResponseEntity.badRequest()
                    .body("Date is required.");
        }

        if (vehicle.getVehicleNo() == null ||
                vehicle.getVehicleNo().trim().isEmpty()) {

            return ResponseEntity.badRequest()
                    .body("Vehicle number is required.");
        }

        if (vehicle.getGrossWeight() == null ||
                vehicle.getGrossWeight().compareTo(BigDecimal.ZERO) <= 0) {

            return ResponseEntity.badRequest()
                    .body("Gross weight must be greater than zero.");
        }

        if (vehicle.getTareWeight() == null ||
                vehicle.getTareWeight().compareTo(BigDecimal.ZERO) < 0) {

            return ResponseEntity.badRequest()
                    .body("Tare weight cannot be negative.");
        }

        if (vehicle.getTareWeight()
                .compareTo(vehicle.getGrossWeight()) >= 0) {

            return ResponseEntity.badRequest()
                    .body("Tare weight must be less than gross weight.");
        }

        vehicle.setVehicleNo(
                vehicle.getVehicleNo().trim()
        );

        Vehicle savedVehicle =
                vehicleRepository.save(vehicle);

        return ResponseEntity.ok(savedVehicle);
    }

    // ==============================
    // UPDATE VEHICLE
    // ==============================

    @PutMapping("/{id}")
    public ResponseEntity<?> updateVehicle(
            @PathVariable Long id,
            @RequestBody Vehicle updatedVehicle,
            Authentication authentication) {

        return vehicleRepository.findById(id)
                .map(vehicle -> {

                    if (!recordAccessService.canModify(
                            vehicle.getDate(),
                            authentication)) {

                        return ResponseEntity.status(403)
                                .body("Supervisor cannot edit previous-day records.");
                    }

                    if (updatedVehicle.getDate() == null) {
                        return ResponseEntity.badRequest()
                                .body("Date is required.");
                    }

                    if (updatedVehicle.getVehicleNo() == null ||
                            updatedVehicle.getVehicleNo()
                                    .trim()
                                    .isEmpty()) {

                        return ResponseEntity.badRequest()
                                .body("Vehicle number is required.");
                    }

                    if (updatedVehicle.getGrossWeight() == null ||
                            updatedVehicle.getGrossWeight()
                                    .compareTo(BigDecimal.ZERO) <= 0) {

                        return ResponseEntity.badRequest()
                                .body("Gross weight must be greater than zero.");
                    }

                    if (updatedVehicle.getTareWeight() == null ||
                            updatedVehicle.getTareWeight()
                                    .compareTo(BigDecimal.ZERO) < 0) {

                        return ResponseEntity.badRequest()
                                .body("Tare weight cannot be negative.");
                    }

                    if (updatedVehicle.getTareWeight()
                            .compareTo(updatedVehicle.getGrossWeight()) >= 0) {

                        return ResponseEntity.badRequest()
                                .body("Tare weight must be less than gross weight.");
                    }

                    vehicle.setDate(updatedVehicle.getDate());

                    vehicle.setVehicleNo(
                            updatedVehicle.getVehicleNo().trim()
                    );

                    vehicle.setGrossWeight(
                            updatedVehicle.getGrossWeight()
                    );

                    vehicle.setTareWeight(
                            updatedVehicle.getTareWeight()
                    );

                    vehicle.setLocal(
                            updatedVehicle.isLocal()
                    );

                    vehicle.setImported(
                            updatedVehicle.isImported()
                    );

                    vehicle.setCommodity(
                            updatedVehicle.getCommodity()
                    );

                    vehicle.setRemarks(
                            updatedVehicle.getRemarks()
                    );

                    return ResponseEntity.ok(
                            vehicleRepository.save(vehicle)
                    );
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ==============================
    // DELETE VEHICLE
    // ==============================

    @DeleteMapping("/{id}")
public ResponseEntity<?> deleteVehicle(
        @PathVariable Long id,
        Authentication authentication) {

    return vehicleRepository.findById(id)
            .map(vehicle -> {

                if (!recordAccessService.canModify(
                        vehicle.getDate(),
                        authentication)) {

                    return ResponseEntity.status(403)
                            .body("Supervisor cannot delete previous-day records.");
                }

                vehicleRepository.delete(vehicle);

                return ResponseEntity.noContent().build();
            })
            .orElse(ResponseEntity.notFound().build());
}
}
