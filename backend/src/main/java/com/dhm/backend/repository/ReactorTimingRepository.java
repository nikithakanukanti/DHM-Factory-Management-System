package com.dhm.backend.repository;

import com.dhm.backend.entity.ReactorTiming;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReactorTimingRepository extends JpaRepository<ReactorTiming, Long> {
    List<ReactorTiming> findByDateBetween(LocalDate from, LocalDate to);
    List<ReactorTiming> findByDateGreaterThanEqual(LocalDate from);
    List<ReactorTiming> findByDateLessThanEqual(LocalDate to);
    long countByDate(LocalDate date);
}
