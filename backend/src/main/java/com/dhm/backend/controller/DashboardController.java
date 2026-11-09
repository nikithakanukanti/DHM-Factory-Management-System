package com.dhm.backend.controller;

import com.dhm.backend.entity.Purchase;
import com.dhm.backend.entity.Sale;
import com.dhm.backend.entity.Vehicle;
import com.dhm.backend.repository.PurchaseRepository;
import com.dhm.backend.repository.ReactorTimingRepository;
import com.dhm.backend.repository.SaleRepository;
import com.dhm.backend.repository.VehicleRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private static final ZoneId FACTORY_ZONE = ZoneId.of("Asia/Kolkata");

    private final VehicleRepository vehicleRepository;
    private final SaleRepository saleRepository;
    private final PurchaseRepository purchaseRepository;
    private final ReactorTimingRepository reactorTimingRepository;

    public DashboardController(VehicleRepository vehicleRepository,
                               SaleRepository saleRepository,
                               PurchaseRepository purchaseRepository,
                               ReactorTimingRepository reactorTimingRepository) {
        this.vehicleRepository = vehicleRepository;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.reactorTimingRepository = reactorTimingRepository;
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();

        long totalVehicles = vehicleRepository.count();
        long totalSales = saleRepository.count();
        long totalPurchases = purchaseRepository.count();
        long totalReactorTimings = reactorTimingRepository.count();

        LocalDate today = LocalDate.now(FACTORY_ZONE);
        long todayVehicles = vehicleRepository.countByDate(today);
        long todayReactorTimings = reactorTimingRepository.countByDate(today);

        List<Sale> sales = saleRepository.findAll();
        List<Purchase> purchases = purchaseRepository.findAll();

        BigDecimal totalSalesWeight = sales.stream()
                .map(Sale::getNetWeight)
                .filter(w -> w != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPurchasesWeight = purchases.stream()
                .map(Purchase::getNetWeight)
                .filter(w -> w != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long todaySales = sales.stream()
                .filter(s -> today.equals(s.getDate()))
                .count();

        long todayPurchases = purchases.stream()
                .filter(p -> today.equals(p.getDate()))
                .count();

        stats.put("vehicles", totalVehicles);
        stats.put("sales", totalSales);
        stats.put("purchases", totalPurchases);
        stats.put("reactorTimings", totalReactorTimings);
        stats.put("todayVehicles", todayVehicles);
        stats.put("todaySales", todaySales);
        stats.put("todayPurchases", todayPurchases);
        stats.put("todayReactorTimings", todayReactorTimings);
        stats.put("totalSalesWeightKg", totalSalesWeight);
        stats.put("totalPurchasesWeightKg", totalPurchasesWeight);

        return stats;
    }
}
