package com.dhm.backend.controller;

import com.dhm.backend.entity.Item;
import com.dhm.backend.entity.StockMovement;
import com.dhm.backend.repository.ItemRepository;
import com.dhm.backend.repository.StockMovementRepository;
import com.dhm.backend.service.AuditLogService;
import com.dhm.backend.service.NotificationService;
import com.dhm.backend.service.RecordAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final ItemRepository itemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final RecordAccessService recordAccessService;

    public InventoryController(ItemRepository itemRepository,
                               StockMovementRepository stockMovementRepository,
                               AuditLogService auditLogService,
                               NotificationService notificationService,
                               RecordAccessService recordAccessService) {
        this.itemRepository = itemRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
        this.recordAccessService = recordAccessService;
    }

    // =========================
    // ITEMS MASTER
    // =========================
    @GetMapping("/items")
    public List<Item> getItems() {
        return itemRepository.findAll();
    }

    @PostMapping("/items")
    public ResponseEntity<?> createItem(@RequestBody Item item, Authentication authentication) {
        if (item.getName() == null || item.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Item name is required.");
        }

        if (item.getItemCode() == null || item.getItemCode().trim().isEmpty()) {
            item.setItemCode("ITM-" + String.format("%04d", itemRepository.count() + 1));
        }
        if (item.getCreatedAt() == null) item.setCreatedAt(LocalDate.now());

        String username = authentication != null ? authentication.getName() : "System";
        item.setCreatedBy(username);
        Item saved = itemRepository.save(item);
        auditLogService.log(username, "CREATE", "INVENTORY", saved.getId(), "Inventory item " + saved.getName() + " created.",
                null, "code=" + saved.getItemCode() + ", name=" + saved.getName() + ", cat=" + saved.getCategory() + ", unit=" + saved.getUnit() + ", stock=" + saved.getCurrentStock() + ", min=" + saved.getMinStockAlert());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<?> updateItem(@PathVariable Long id, @RequestBody Item updated, Authentication authentication) {
        return itemRepository.findById(id)
                .map(item -> {
                    LocalDate recordDate = item.getCreatedAt() != null ? item.getCreatedAt() : LocalDate.now();
                    if (!recordAccessService.canModify(recordDate, item.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403).body("Supervisors can only edit their own inventory items on the same day (until 11:59 PM IST).");
                    }
                    String oldSnapshot = "code=" + item.getItemCode() + ", name=" + item.getName() + ", cat=" + item.getCategory() + ", unit=" + item.getUnit() + ", stock=" + item.getCurrentStock() + ", min=" + item.getMinStockAlert() + ", price=" + item.getUnitPrice();
                    item.setName(updated.getName());
                    item.setCategory(updated.getCategory());
                    item.setUnit(updated.getUnit());
                    item.setMinStockAlert(updated.getMinStockAlert());
                    item.setUnitPrice(updated.getUnitPrice());

                    Item saved = itemRepository.save(item);
                    String username = authentication != null ? authentication.getName() : "System";
                    String newSnapshot = "code=" + saved.getItemCode() + ", name=" + saved.getName() + ", cat=" + saved.getCategory() + ", unit=" + saved.getUnit() + ", stock=" + saved.getCurrentStock() + ", min=" + saved.getMinStockAlert() + ", price=" + saved.getUnitPrice();
                    auditLogService.log(username, "UPDATE", "INVENTORY", id, "Inventory item " + saved.getName() + " updated.", oldSnapshot, newSnapshot);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<?> deleteItem(@PathVariable Long id, Authentication authentication) {
        return itemRepository.findById(id)
                .map(item -> {
                    LocalDate recordDate = item.getCreatedAt() != null ? item.getCreatedAt() : LocalDate.now();
                    if (!recordAccessService.canModify(recordDate, item.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403).body("Supervisors can only delete their own inventory items on the same day (until 11:59 PM IST).");
                    }
                    String oldSnapshot = "code=" + item.getItemCode() + ", name=" + item.getName() + ", cat=" + item.getCategory() + ", unit=" + item.getUnit() + ", stock=" + item.getCurrentStock();
                    itemRepository.delete(item);
                    String username = authentication != null ? authentication.getName() : "System";
                    auditLogService.log(username, "DELETE", "INVENTORY", id, "Item deleted.", oldSnapshot, null);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // =========================
    // STOCK MOVEMENTS
    // =========================
    @GetMapping("/movements")
    public List<StockMovement> getMovements() {
        return stockMovementRepository.findTop50ByOrderByDateDescIdDesc();
    }

    @PostMapping("/movements")
    @Transactional
    public ResponseEntity<?> recordMovement(@RequestBody StockMovement movement, Authentication authentication) {
        if (movement.getItemId() == null || movement.getQuantity() == null) {
            return ResponseEntity.badRequest().body("A valid item and quantity are required.");
        }

        String movementType = movement.getMovementType() != null
                ? movement.getMovementType().trim().toUpperCase()
                : "";
        if (!List.of("STOCK_IN", "STOCK_OUT", "ADJUSTMENT").contains(movementType)) {
            return ResponseEntity.badRequest().body("Movement type must be STOCK_IN, STOCK_OUT, or ADJUSTMENT.");
        }

        if (movement.getQuantity().compareTo(BigDecimal.ZERO) < 0
                || (!"ADJUSTMENT".equals(movementType) && movement.getQuantity().compareTo(BigDecimal.ZERO) == 0)) {
            return ResponseEntity.badRequest().body("Stock movement quantity must be positive; adjustment stock cannot be negative.");
        }

        return itemRepository.findById(movement.getItemId())
                .map(item -> {
                    movement.setItemName(item.getName());
                    movement.setMovementType(movementType);
                    BigDecimal current = item.getCurrentStock() != null ? item.getCurrentStock() : BigDecimal.ZERO;

                    if ("STOCK_IN".equals(movementType)) {
                        item.setCurrentStock(current.add(movement.getQuantity()));
                    } else if ("STOCK_OUT".equals(movementType)) {
                        if (movement.getQuantity().compareTo(current) > 0) {
                            return ResponseEntity.badRequest().body("Stock out quantity exceeds current stock.");
                        }
                        item.setCurrentStock(current.subtract(movement.getQuantity()));
                    } else {
                        item.setCurrentStock(movement.getQuantity());
                    }

                    BigDecimal oldStock = current;
                    itemRepository.save(item);

                    String username = authentication != null ? authentication.getName() : "System";
                    movement.setCreatedBy(username);
                    if (movement.getDate() == null) movement.setDate(LocalDate.now());
                    StockMovement savedMovement = stockMovementRepository.save(movement);

                    // Check low stock
                    if (item.getMinStockAlert() != null && item.getCurrentStock().compareTo(item.getMinStockAlert()) <= 0) {
                        notificationService.notify("Low Stock Warning: " + item.getName(),
                                "Stock level dropped to " + item.getCurrentStock() + " " + item.getUnit() + " (Minimum: " + item.getMinStockAlert() + ")",
                                "WARNING", "INVENTORY");
                    }

                    String details = movement.getMovementType() + " " + movement.getQuantity() + " " + item.getUnit() + " of " + item.getName();
                    String oldVal = "stock=" + oldStock;
                    String newVal = "stock=" + item.getCurrentStock() + ", movementId=" + savedMovement.getId();
                    auditLogService.log(username, "STOCK_MOVEMENT", "INVENTORY", item.getId(), details, oldVal, newVal);

                    return ResponseEntity.ok(savedMovement);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/low-stock")
    public List<Item> getLowStockItems() {
        return itemRepository.findLowStockItems();
    }
}
