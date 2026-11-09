package com.dhm.backend.repository;

import com.dhm.backend.entity.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {
    Optional<Sale> findByVehicleId(Long vehicleId);
    void deleteByVehicleId(Long vehicleId);
    List<Sale> findByDateBetween(LocalDate from, LocalDate to);
    List<Sale> findByDateGreaterThanEqual(LocalDate from);
    List<Sale> findByDateLessThanEqual(LocalDate to);
}
