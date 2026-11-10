package com.dhm.backend.controller;

import com.dhm.backend.entity.Purchase;
import com.dhm.backend.entity.Sale;
import com.dhm.backend.entity.Vehicle;
import com.dhm.backend.repository.PurchaseRepository;
import com.dhm.backend.repository.SaleRepository;
import com.dhm.backend.repository.VehicleRepository;
import com.dhm.backend.service.AuditLogService;
import com.dhm.backend.service.GeofenceService;
import com.dhm.backend.service.NotificationService;
import com.dhm.backend.service.RecordAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleRepository vehicleRepository;
    private final SaleRepository saleRepository;
    private final PurchaseRepository purchaseRepository;
    private final RecordAccessService recordAccessService;
    private final GeofenceService geofenceService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public VehicleController(VehicleRepository vehicleRepository,
                             SaleRepository saleRepository,
                             PurchaseRepository purchaseRepository,
                             RecordAccessService recordAccessService,
                             GeofenceService geofenceService,
                             NotificationService notificationService,
                             AuditLogService auditLogService) {
        this.vehicleRepository = vehicleRepository;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.recordAccessService = recordAccessService;
        this.geofenceService = geofenceService;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
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
    // GET VEHICLES FOR MAP VIEW (WITH GPS)
    // ==============================
    @GetMapping("/map")
    public Map<String, Object> getMapVehicles() {
        List<Vehicle> all = vehicleRepository.findAll();
        List<Vehicle> withGps = all.stream()
                .filter(v -> v.getLatitude() != null && v.getLongitude() != null)
                .collect(Collectors.toList());

        return Map.of(
                "factoryLatitude", geofenceService.getFactoryLatitude(),
                "factoryLongitude", geofenceService.getFactoryLongitude(),
                "geofenceRadiusMeters", geofenceService.getGeofenceRadiusMeters(),
                "vehicles", withGps
        );
    }

    // ==============================
    // CREATE VEHICLE (Master Weighbridge Entry with GPS & Camera)
    // ==============================
    @PostMapping
    @Transactional
    public ResponseEntity<?> createVehicle(@RequestBody Vehicle vehicle, Authentication authentication) {
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

        String vNo = vehicle.getVehicleNo().trim().toUpperCase();
        vehicle.setVehicleNo(vNo);

        // Accidental duplicate submission prevention
        Optional<Vehicle> activeInside = vehicleRepository.findFirstByVehicleNoIgnoreCaseAndStatus(vNo, "INSIDE");
        if (activeInside.isPresent()) {
            return ResponseEntity.badRequest().body("Vehicle " + vNo + " is already marked as INSIDE the factory (Entry #" + activeInside.get().getId() + "). Please mark its exit before creating a new entry.");
        }

        String username = authentication != null ? authentication.getName() : "System";
        vehicle.setCreatedBy(username);

        // Default entry time if not supplied
        if (vehicle.getEntryTime() == null || vehicle.getEntryTime().trim().isEmpty()) {
            vehicle.setEntryTime(LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm")));
        }

        // GPS Geofence verification
        if (vehicle.getLatitude() != null && vehicle.getLongitude() != null) {
            boolean isInside = geofenceService.isInsideGeofence(vehicle.getLatitude(), vehicle.getLongitude());
            vehicle.setInsideGeofence(isInside);
        }

        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        // Sync with Sales Register if selected
        if ("SALES".equalsIgnoreCase(savedVehicle.getRegisterType())) {
            Sale sale = new Sale();
            sale.setVehicleId(savedVehicle.getId());
            sale.setCreatedBy(username);
            sale.setDate(savedVehicle.getDate());
            sale.setVehicleNo(savedVehicle.getVehicleNo());
            sale.setCustomerName(savedVehicle.getPartyName());
            sale.setGrossWeight(savedVehicle.getGrossWeight());
            sale.setTareWeight(savedVehicle.getTareWeight());
            sale.setCommodity(savedVehicle.getCommodity());
            sale.setRemarks(savedVehicle.getRemarks());
            recalculateSaleFinancials(sale);
            saleRepository.save(sale);
        }
        // Sync with Purchase Register if selected
        else if ("PURCHASE".equalsIgnoreCase(savedVehicle.getRegisterType())) {
            Purchase purchase = new Purchase();
            purchase.setVehicleId(savedVehicle.getId());
            purchase.setCreatedBy(username);
            purchase.setDate(savedVehicle.getDate());
            purchase.setVehicleNo(savedVehicle.getVehicleNo());
            purchase.setSupplierName(savedVehicle.getPartyName());
            purchase.setGrossWeight(savedVehicle.getGrossWeight());
            purchase.setTareWeight(savedVehicle.getTareWeight());
            purchase.setCommodity(savedVehicle.getCommodity());
            purchase.setRemarks(savedVehicle.getRemarks());
            recalculatePurchaseFinancials(purchase);
            purchaseRepository.save(purchase);
        }

        auditLogService.log(username, "CREATE", "VEHICLE", savedVehicle.getId(),
                "Vehicle " + savedVehicle.getVehicleNo() + " logged at weighbridge. Net: " + savedVehicle.getNetWeight() + " KG");

        String geofenceStatus = savedVehicle.getInsideGeofence() != null
                ? (savedVehicle.getInsideGeofence() ? " (Inside Geofence)" : " (Outside Geofence)")
                : "";
        notificationService.notify("Weighbridge Entry: " + savedVehicle.getVehicleNo(),
                "Vehicle registered for " + savedVehicle.getRegisterType() + " with " + savedVehicle.getCommodity() + geofenceStatus,
                "INFO", "VEHICLE");

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
                    if (!recordAccessService.canModify(vehicle.getDate(), vehicle.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisors can only edit their own records on the same day (until 11:59 PM IST).");
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

                    String oldSnapshot = "date=" + vehicle.getDate() + ", vehicleNo=" + vehicle.getVehicleNo() + ", gross=" + vehicle.getGrossWeight() + ", tare=" + vehicle.getTareWeight() + ", net=" + vehicle.getNetWeight() + ", commodity=" + vehicle.getCommodity() + ", party=" + vehicle.getPartyName() + ", registerType=" + vehicle.getRegisterType() + ", status=" + vehicle.getStatus() + ", entry=" + vehicle.getEntryTime() + ", exit=" + vehicle.getExitTime();

                    vehicle.setDate(updatedVehicle.getDate());
                    vehicle.setVehicleNo(updatedVehicle.getVehicleNo().trim().toUpperCase());
                    vehicle.setGrossWeight(updatedVehicle.getGrossWeight());
                    vehicle.setTareWeight(updatedVehicle.getTareWeight());
                    vehicle.setLocal(updatedVehicle.isLocal());
                    vehicle.setImported(updatedVehicle.isImported());
                    vehicle.setCommodity(updatedVehicle.getCommodity());
                    vehicle.setRemarks(updatedVehicle.getRemarks());
                    vehicle.setRegisterType(updatedVehicle.getRegisterType());
                    vehicle.setDriverName(updatedVehicle.getDriverName());
                    vehicle.setDriverContact(updatedVehicle.getDriverContact());
                    vehicle.setVehicleType(updatedVehicle.getVehicleType());
                    vehicle.setInwardOutward(updatedVehicle.getInwardOutward());
                    vehicle.setPurpose(updatedVehicle.getPurpose());
                    vehicle.setPartyName(updatedVehicle.getPartyName());
                    vehicle.setStatus(updatedVehicle.getStatus() != null ? updatedVehicle.getStatus() : vehicle.getStatus());

                    if (updatedVehicle.getLatitude() != null && updatedVehicle.getLongitude() != null) {
                        vehicle.setLatitude(updatedVehicle.getLatitude());
                        vehicle.setLongitude(updatedVehicle.getLongitude());
                        vehicle.setInsideGeofence(geofenceService.isInsideGeofence(updatedVehicle.getLatitude(), updatedVehicle.getLongitude()));
                    }

                    if (updatedVehicle.getLocationAddress() != null) {
                        vehicle.setLocationAddress(updatedVehicle.getLocationAddress());
                    }

                    if (updatedVehicle.getVehiclePhoto() != null) {
                        vehicle.setVehiclePhoto(updatedVehicle.getVehiclePhoto());
                    }
                    if (updatedVehicle.getGrossWeightPhoto() != null) {
                        vehicle.setGrossWeightPhoto(updatedVehicle.getGrossWeightPhoto());
                    }
                    if (updatedVehicle.getTareWeightPhoto() != null) {
                        vehicle.setTareWeightPhoto(updatedVehicle.getTareWeightPhoto());
                    }
                    if (updatedVehicle.getPhotoData() != null) {
                        vehicle.setPhotoData(updatedVehicle.getPhotoData());
                    }

                    Vehicle savedVehicle = vehicleRepository.save(vehicle);

                    // Sync linked Sale
                    Optional<Sale> existingSaleOpt = saleRepository.findByVehicleId(savedVehicle.getId());
                    if ("SALES".equalsIgnoreCase(savedVehicle.getRegisterType())) {
                        Sale sale = existingSaleOpt.orElseGet(() -> {
                            Sale s = new Sale();
                            s.setVehicleId(savedVehicle.getId());
                            s.setCreatedBy(authentication != null ? authentication.getName() : "System");
                            return s;
                        });
                        sale.setDate(savedVehicle.getDate());
                        sale.setVehicleNo(savedVehicle.getVehicleNo());
                        sale.setCustomerName(savedVehicle.getPartyName());
                        sale.setGrossWeight(savedVehicle.getGrossWeight());
                        sale.setTareWeight(savedVehicle.getTareWeight());
                        sale.setCommodity(savedVehicle.getCommodity());
                        sale.setRemarks(savedVehicle.getRemarks());
                        recalculateSaleFinancials(sale);
                        saleRepository.save(sale);

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
                            p.setCreatedBy(authentication != null ? authentication.getName() : "System");
                            return p;
                        });
                        purchase.setDate(savedVehicle.getDate());
                        purchase.setVehicleNo(savedVehicle.getVehicleNo());
                        purchase.setSupplierName(savedVehicle.getPartyName());
                        purchase.setGrossWeight(savedVehicle.getGrossWeight());
                        purchase.setTareWeight(savedVehicle.getTareWeight());
                        purchase.setCommodity(savedVehicle.getCommodity());
                        purchase.setRemarks(savedVehicle.getRemarks());
                        recalculatePurchaseFinancials(purchase);
                        purchaseRepository.save(purchase);

                        saleRepository.findByVehicleId(savedVehicle.getId()).ifPresent(saleRepository::delete);
                    } else if (existingPurchaseOpt.isPresent()) {
                        purchaseRepository.delete(existingPurchaseOpt.get());
                    }

                    String username = authentication != null ? authentication.getName() : "System";
                    String newSnapshot = "date=" + savedVehicle.getDate() + ", vehicleNo=" + savedVehicle.getVehicleNo() + ", gross=" + savedVehicle.getGrossWeight() + ", tare=" + savedVehicle.getTareWeight() + ", net=" + savedVehicle.getNetWeight() + ", commodity=" + savedVehicle.getCommodity() + ", party=" + savedVehicle.getPartyName() + ", registerType=" + savedVehicle.getRegisterType() + ", status=" + savedVehicle.getStatus() + ", entry=" + savedVehicle.getEntryTime() + ", exit=" + savedVehicle.getExitTime();
                    auditLogService.log(username, "UPDATE", "VEHICLE", savedVehicle.getId(),
                            "Vehicle " + savedVehicle.getVehicleNo() + " updated.", oldSnapshot, newSnapshot);

                    return ResponseEntity.ok(savedVehicle);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ==============================
    // MARK VEHICLE AS EXITED
    // ==============================
    @PutMapping("/{id}/exit")
    public ResponseEntity<?> markVehicleExit(@PathVariable Long id, Authentication authentication) {
        return vehicleRepository.findById(id)
                .map(vehicle -> {
                    if (!recordAccessService.canModify(vehicle.getDate(), vehicle.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisors can only mark exit for their own records on the same day (until 11:59 PM IST).");
                    }

                    String oldSnapshot = "status=" + vehicle.getStatus() + ", exitDate=" + vehicle.getExitDate() + ", exitTime=" + vehicle.getExitTime();
                    vehicle.setStatus("EXITED");
                    vehicle.setExitTime(LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm")));
                    vehicle.setExitDate(LocalDate.now());
                    Vehicle saved = vehicleRepository.save(vehicle);

                    String username = authentication != null ? authentication.getName() : "System";
                    String newSnapshot = "status=" + saved.getStatus() + ", exitDate=" + saved.getExitDate() + ", exitTime=" + saved.getExitTime();
                    auditLogService.log(username, "EXIT", "VEHICLE", id, "Vehicle " + vehicle.getVehicleNo() + " exited factory at " + vehicle.getExitTime(), oldSnapshot, newSnapshot);
                    return ResponseEntity.ok(saved);
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
                    if (!recordAccessService.canModify(vehicle.getDate(), vehicle.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403)
                                .body("Supervisors can only delete their own records on the same day (until 11:59 PM IST).");
                    }

                    saleRepository.findByVehicleId(id).ifPresent(saleRepository::delete);
                    purchaseRepository.findByVehicleId(id).ifPresent(purchaseRepository::delete);

                    String oldSnapshot = "date=" + vehicle.getDate() + ", vehicleNo=" + vehicle.getVehicleNo() + ", gross=" + vehicle.getGrossWeight() + ", tare=" + vehicle.getTareWeight() + ", net=" + vehicle.getNetWeight() + ", commodity=" + vehicle.getCommodity() + ", party=" + vehicle.getPartyName() + ", registerType=" + vehicle.getRegisterType() + ", status=" + vehicle.getStatus();
                    vehicleRepository.delete(vehicle);

                    String username = authentication != null ? authentication.getName() : "System";
                    auditLogService.log(username, "DELETE", "VEHICLE", id, "Vehicle " + vehicle.getVehicleNo() + " deleted.", oldSnapshot, null);

                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private void recalculateSaleFinancials(Sale sale) {
        if (sale.getGrossWeight() != null && sale.getTareWeight() != null) {
            sale.setNetWeight(sale.getGrossWeight().subtract(sale.getTareWeight()));
        }
        BigDecimal net = sale.getNetWeight() != null ? sale.getNetWeight() : BigDecimal.ZERO;
        BigDecimal price = sale.getUnitPrice() != null ? sale.getUnitPrice() : (sale.getRate() != null ? sale.getRate() : BigDecimal.ZERO);
        BigDecimal disc = sale.getDiscount() != null ? sale.getDiscount() : BigDecimal.ZERO;
        BigDecimal tax = sale.getTaxRate() != null ? sale.getTaxRate() : new BigDecimal("18.00");

        // Only recompute totals when pricing context exists; preserve manually-set records with no rate context minimally.
        if (price.compareTo(BigDecimal.ZERO) > 0 || sale.getSubtotal() != null || sale.getGrandTotal() != null) {
            BigDecimal sub = net.multiply(price).subtract(disc);
            if (sub.compareTo(BigDecimal.ZERO) < 0) sub = BigDecimal.ZERO;
            BigDecimal taxVal = sub.multiply(tax).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            BigDecimal grand = sub.add(taxVal);
            sale.setSubtotal(sub.setScale(2, RoundingMode.HALF_UP));
            sale.setTaxAmount(taxVal);
            sale.setGrandTotal(grand.setScale(2, RoundingMode.HALF_UP));

            BigDecimal paid = sale.getPaidAmount() != null ? sale.getPaidAmount() : BigDecimal.ZERO;
            if (grand.compareTo(BigDecimal.ZERO) > 0 && paid.compareTo(grand) >= 0) {
                sale.setPaymentStatus("PAID");
            } else if (paid.compareTo(BigDecimal.ZERO) > 0) {
                sale.setPaymentStatus("PARTIAL");
            } else if (sale.getPaymentStatus() == null || sale.getPaymentStatus().trim().isEmpty()) {
                sale.setPaymentStatus("PENDING");
            }
        }
    }

    private void recalculatePurchaseFinancials(Purchase purchase) {
        if (purchase.getGrossWeight() != null && purchase.getTareWeight() != null) {
            purchase.setNetWeight(purchase.getGrossWeight().subtract(purchase.getTareWeight()));
        }
        BigDecimal net = purchase.getNetWeight() != null ? purchase.getNetWeight() : BigDecimal.ZERO;
        BigDecimal price = purchase.getUnitPrice() != null ? purchase.getUnitPrice() : (purchase.getRate() != null ? purchase.getRate() : BigDecimal.ZERO);
        BigDecimal disc = purchase.getDiscount() != null ? purchase.getDiscount() : BigDecimal.ZERO;
        BigDecimal tax = purchase.getTaxRate() != null ? purchase.getTaxRate() : new BigDecimal("18.00");

        if (price.compareTo(BigDecimal.ZERO) > 0 || purchase.getSubtotal() != null || purchase.getGrandTotal() != null) {
            BigDecimal sub = net.multiply(price).subtract(disc);
            if (sub.compareTo(BigDecimal.ZERO) < 0) sub = BigDecimal.ZERO;
            BigDecimal taxVal = sub.multiply(tax).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            BigDecimal grand = sub.add(taxVal);
            purchase.setSubtotal(sub.setScale(2, RoundingMode.HALF_UP));
            purchase.setTaxAmount(taxVal);
            purchase.setGrandTotal(grand.setScale(2, RoundingMode.HALF_UP));

            BigDecimal paid = purchase.getPaidAmount() != null ? purchase.getPaidAmount() : BigDecimal.ZERO;
            if (grand.compareTo(BigDecimal.ZERO) > 0 && paid.compareTo(grand) >= 0) {
                purchase.setPaymentStatus("PAID");
            } else if (paid.compareTo(BigDecimal.ZERO) > 0) {
                purchase.setPaymentStatus("PARTIAL");
            } else if (purchase.getPaymentStatus() == null || purchase.getPaymentStatus().trim().isEmpty()) {
                purchase.setPaymentStatus("PENDING");
            }
        }
    }
}
