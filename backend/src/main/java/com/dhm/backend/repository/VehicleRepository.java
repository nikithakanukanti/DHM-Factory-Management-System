package com.dhm.backend.repository;

import com.dhm.backend.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByDateBetween(LocalDate from, LocalDate to);
    List<Vehicle> findByDateGreaterThanEqual(LocalDate from);
    List<Vehicle> findByDateLessThanEqual(LocalDate to);
    long countByDate(LocalDate date);
}
