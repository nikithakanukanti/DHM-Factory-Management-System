package com.dhm.backend.controller;

import com.dhm.backend.repository.PurchaseRepository;
import com.dhm.backend.repository.ReactorTimingRepository;
import com.dhm.backend.repository.SaleRepository;
import com.dhm.backend.repository.VehicleRepository;

import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final VehicleRepository vehicleRepository;
    private final SaleRepository saleRepository;
    private final PurchaseRepository purchaseRepository;
    private final ReactorTimingRepository reactorTimingRepository;

    public DashboardController(
            VehicleRepository vehicleRepository,
            SaleRepository saleRepository,
            PurchaseRepository purchaseRepository,
            ReactorTimingRepository reactorTimingRepository) {

        this.vehicleRepository = vehicleRepository;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.reactorTimingRepository = reactorTimingRepository;
    }

    @GetMapping("/stats")
    public Map<String, Long> getStats() {

        Map<String, Long> stats = new HashMap<>();

        stats.put("vehicles", vehicleRepository.count());
        stats.put("sales", saleRepository.count());
        stats.put("purchases", purchaseRepository.count());
        stats.put("reactorTimings", reactorTimingRepository.count());

        return stats;
    }
}