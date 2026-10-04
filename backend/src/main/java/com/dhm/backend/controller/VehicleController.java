package com.dhm.backend.controller;

import com.dhm.backend.entity.Vehicle;
import com.dhm.backend.repository.VehicleRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleRepository vehicleRepository;

    public VehicleController(VehicleRepository vehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }

    // Get all vehicles
    @GetMapping
    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    // Get vehicle by ID
    @GetMapping("/{id}")
    public ResponseEntity<Vehicle> getVehicleById(@PathVariable Long id) {

        return vehicleRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Add vehicle
    @PostMapping
    public Vehicle createVehicle(@RequestBody Vehicle vehicle) {
        return vehicleRepository.save(vehicle);
    }

    // Update vehicle
    @PutMapping("/{id}")
    public ResponseEntity<Vehicle> updateVehicle(
            @PathVariable Long id,
            @RequestBody Vehicle updatedVehicle) {

        return vehicleRepository.findById(id)
                .map(vehicle -> {

                    vehicle.setDate(updatedVehicle.getDate());
                    vehicle.setVehicleNo(updatedVehicle.getVehicleNo());
                    vehicle.setGrossWeight(updatedVehicle.getGrossWeight());
                    vehicle.setTareWeight(updatedVehicle.getTareWeight());
                    vehicle.setLocal(updatedVehicle.isLocal());
                    vehicle.setImported(updatedVehicle.isImported());
                    vehicle.setRemarks(updatedVehicle.getRemarks());

                    return ResponseEntity.ok(
                            vehicleRepository.save(vehicle)
                    );
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete vehicle
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVehicle(@PathVariable Long id) {

        if (!vehicleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        vehicleRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}
