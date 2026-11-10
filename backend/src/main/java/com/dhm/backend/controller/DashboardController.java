package com.dhm.backend.controller;

import com.dhm.backend.entity.Item;
import com.dhm.backend.entity.Purchase;
import com.dhm.backend.entity.Sale;
import com.dhm.backend.entity.Vehicle;
import com.dhm.backend.repository.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private static final ZoneId FACTORY_ZONE = ZoneId.of("Asia/Kolkata");

    private final VehicleRepository vehicleRepository;
    private final SaleRepository saleRepository;
    private final PurchaseRepository purchaseRepository;
    private final ReactorTimingRepository reactorTimingRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;
    private final EmployeeRepository employeeRepository;
    private final ItemRepository itemRepository;
    private final PaymentRepository paymentRepository;

    public DashboardController(VehicleRepository vehicleRepository,
                               SaleRepository saleRepository,
                               PurchaseRepository purchaseRepository,
                               ReactorTimingRepository reactorTimingRepository,
                               CustomerRepository customerRepository,
                               SupplierRepository supplierRepository,
                               EmployeeRepository employeeRepository,
                               ItemRepository itemRepository,
                               PaymentRepository paymentRepository) {
        this.vehicleRepository = vehicleRepository;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.reactorTimingRepository = reactorTimingRepository;
        this.customerRepository = customerRepository;
        this.supplierRepository = supplierRepository;
        this.employeeRepository = employeeRepository;
        this.itemRepository = itemRepository;
        this.paymentRepository = paymentRepository;
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();

        long totalVehicles = vehicleRepository.count();
        long totalSales = saleRepository.count();
        long totalPurchases = purchaseRepository.count();
        long totalReactorTimings = reactorTimingRepository.count();
        long totalCustomers = customerRepository.count();
        long totalSuppliers = supplierRepository.count();
        long totalEmployees = employeeRepository.count();
        long totalItems = itemRepository.count();

        LocalDate today = LocalDate.now(FACTORY_ZONE);
        long todayVehicles = vehicleRepository.countByDate(today);
        long todayReactorTimings = reactorTimingRepository.countByDate(today);

        List<Sale> sales = saleRepository.findAll();
        List<Purchase> purchases = purchaseRepository.findAll();
        List<Vehicle> allVehicles = vehicleRepository.findAll();

        BigDecimal totalSalesWeight = sales.stream()
                .map(Sale::getNetWeight)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPurchasesWeight = purchases.stream()
                .map(Purchase::getNetWeight)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSalesRevenue = sales.stream()
                .map(Sale::getGrandTotal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPurchaseExpense = purchases.stream()
                .map(Purchase::getGrandTotal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Today's Sales & Purchases counts and financial amounts
        long todaySalesCount = sales.stream().filter(s -> today.equals(s.getDate())).count();
        BigDecimal todaySalesAmount = sales.stream()
                .filter(s -> today.equals(s.getDate()) && s.getGrandTotal() != null)
                .map(Sale::getGrandTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long todayPurchasesCount = purchases.stream().filter(p -> today.equals(p.getDate())).count();
        BigDecimal todayPurchasesAmount = purchases.stream()
                .filter(p -> today.equals(p.getDate()) && p.getGrandTotal() != null)
                .map(Purchase::getGrandTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Active vehicles inside factory
        long vehiclesInsideCount = allVehicles.stream()
                .filter(v -> "INSIDE".equalsIgnoreCase(v.getStatus()))
                .count();

        // Pending Payments
        BigDecimal pendingCustomerReceivables = sales.stream()
                .filter(s -> !"PAID".equalsIgnoreCase(s.getPaymentStatus()))
                .map(s -> {
                    BigDecimal grand = s.getGrandTotal() != null ? s.getGrandTotal() : BigDecimal.ZERO;
                    BigDecimal paid = s.getPaidAmount() != null ? s.getPaidAmount() : BigDecimal.ZERO;
                    return grand.subtract(paid).max(BigDecimal.ZERO);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal pendingSupplierPayables = purchases.stream()
                .filter(p -> !"PAID".equalsIgnoreCase(p.getPaymentStatus()))
                .map(p -> {
                    BigDecimal grand = p.getGrandTotal() != null ? p.getGrandTotal() : BigDecimal.ZERO;
                    BigDecimal paid = p.getPaidAmount() != null ? p.getPaidAmount() : BigDecimal.ZERO;
                    return grand.subtract(paid).max(BigDecimal.ZERO);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Inventory summary
        List<Item> lowStockList = itemRepository.findLowStockItems();
        BigDecimal totalInventoryStockKg = itemRepository.findAll().stream()
                .map(Item::getCurrentStock)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Daily trend for the past 7 days (including today)
        List<Map<String, Object>> weeklyTrend = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            long dVehicles = allVehicles.stream().filter(v -> d.equals(v.getDate())).count();
            long dSales = sales.stream().filter(s -> d.equals(s.getDate())).count();
            long dPurchases = purchases.stream().filter(p -> d.equals(p.getDate())).count();

            Map<String, Object> dayMap = new HashMap<>();
            dayMap.put("date", d.toString());
            dayMap.put("dayLabel", d.getDayOfWeek().name().substring(0, 3));
            dayMap.put("vehicles", dVehicles);
            dayMap.put("sales", dSales);
            dayMap.put("purchases", dPurchases);
            weeklyTrend.add(dayMap);
        }

        // Monthly trend for the past 6 months (including current month)
        List<Map<String, Object>> monthlyTrend = new ArrayList<>();
        java.time.YearMonth currentMonth = java.time.YearMonth.from(today);
        for (int i = 5; i >= 0; i--) {
            java.time.YearMonth ym = currentMonth.minusMonths(i);
            LocalDate monthStart = ym.atDay(1);
            LocalDate monthEnd = ym.atEndOfMonth();

            long mVehicles = allVehicles.stream()
                    .filter(v -> v.getDate() != null && !v.getDate().isBefore(monthStart) && !v.getDate().isAfter(monthEnd))
                    .count();
            long mSales = sales.stream()
                    .filter(s -> s.getDate() != null && !s.getDate().isBefore(monthStart) && !s.getDate().isAfter(monthEnd))
                    .count();
            long mPurchases = purchases.stream()
                    .filter(p -> p.getDate() != null && !p.getDate().isBefore(monthStart) && !p.getDate().isAfter(monthEnd))
                    .count();
            BigDecimal mSalesAmount = sales.stream()
                    .filter(s -> s.getDate() != null && !s.getDate().isBefore(monthStart) && !s.getDate().isAfter(monthEnd) && s.getGrandTotal() != null)
                    .map(Sale::getGrandTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal mPurchaseAmount = purchases.stream()
                    .filter(p -> p.getDate() != null && !p.getDate().isBefore(monthStart) && !p.getDate().isAfter(monthEnd) && p.getGrandTotal() != null)
                    .map(Purchase::getGrandTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, Object> monthMap = new HashMap<>();
            monthMap.put("month", ym.toString());
            monthMap.put("label", ym.getMonth().name().substring(0, 3) + " " + ym.getYear());
            monthMap.put("vehicles", mVehicles);
            monthMap.put("sales", mSales);
            monthMap.put("purchases", mPurchases);
            monthMap.put("salesAmount", mSalesAmount);
            monthMap.put("purchaseAmount", mPurchaseAmount);
            monthlyTrend.add(monthMap);
        }

        // Recent 5 vehicles
        List<Vehicle> recentVehicles = allVehicles.stream()
                .sorted(Comparator.comparing(Vehicle::getId).reversed())
                .limit(5)
                .collect(Collectors.toList());

        // Recent 5 sales
        List<Sale> recentSales = sales.stream()
                .sorted(Comparator.comparing(Sale::getId).reversed())
                .limit(5)
                .collect(Collectors.toList());

        // Recent 5 purchases
        List<Purchase> recentPurchases = purchases.stream()
                .sorted(Comparator.comparing(Purchase::getId).reversed())
                .limit(5)
                .collect(Collectors.toList());

        stats.put("vehicles", totalVehicles);
        stats.put("sales", totalSales);
        stats.put("purchases", totalPurchases);
        stats.put("reactorTimings", totalReactorTimings);
        stats.put("customers", totalCustomers);
        stats.put("suppliers", totalSuppliers);
        stats.put("employees", totalEmployees);
        stats.put("items", totalItems);
        stats.put("lowStockCount", lowStockList.size());
        stats.put("lowStockItems", lowStockList.stream().limit(5).collect(Collectors.toList()));
        stats.put("totalInventoryStockKg", totalInventoryStockKg);

        stats.put("todayVehicles", todayVehicles);
        stats.put("vehiclesInsideCount", vehiclesInsideCount);
        stats.put("todaySales", todaySalesCount);
        stats.put("todaySalesAmount", todaySalesAmount);
        stats.put("todayPurchases", todayPurchasesCount);
        stats.put("todayPurchasesAmount", todayPurchasesAmount);
        stats.put("todayReactorTimings", todayReactorTimings);

        stats.put("pendingCustomerReceivables", pendingCustomerReceivables);
        stats.put("pendingSupplierPayables", pendingSupplierPayables);

        stats.put("totalSalesWeightKg", totalSalesWeight);
        stats.put("totalPurchasesWeightKg", totalPurchasesWeight);
        stats.put("totalSalesRevenue", totalSalesRevenue);
        stats.put("totalPurchaseExpense", totalPurchaseExpense);

        stats.put("weeklyTrend", weeklyTrend);
        stats.put("monthlyTrend", monthlyTrend);
        stats.put("recentVehicles", recentVehicles);
        stats.put("recentSales", recentSales);
        stats.put("recentPurchases", recentPurchases);

        return stats;
    }
}
