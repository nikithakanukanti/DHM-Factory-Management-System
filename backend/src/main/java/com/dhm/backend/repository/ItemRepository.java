package com.dhm.backend.repository;

import com.dhm.backend.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {
    Optional<Item> findByItemCode(String itemCode);
    List<Item> findByCategory(String category);
    List<Item> findByNameContainingIgnoreCase(String name);

    @Query("SELECT i FROM Item i WHERE i.currentStock <= i.minStockAlert AND i.minStockAlert > 0")
    List<Item> findLowStockItems();
}
