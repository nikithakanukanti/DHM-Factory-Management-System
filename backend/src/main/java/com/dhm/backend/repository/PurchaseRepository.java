package com.dhm.backend.repository;

import com.dhm.backend.entity.Purchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    Optional<Purchase> findByVehicleId(Long vehicleId);
    void deleteByVehicleId(Long vehicleId);
    List<Purchase> findByDateBetween(LocalDate from, LocalDate to);
    List<Purchase> findByDateGreaterThanEqual(LocalDate from);
    List<Purchase> findByDateLessThanEqual(LocalDate to);
}
