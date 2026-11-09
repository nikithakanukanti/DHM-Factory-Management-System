package com.dhm.backend.repository;

import com.dhm.backend.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    List<StockMovement> findByItemId(Long itemId);
    List<StockMovement> findByDateBetween(LocalDate from, LocalDate to);
    List<StockMovement> findTop50ByOrderByDateDescIdDesc();
}
