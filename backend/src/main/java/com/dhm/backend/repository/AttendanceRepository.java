package com.dhm.backend.repository;

import com.dhm.backend.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByDate(LocalDate date);
    List<Attendance> findByEmployeeId(Long employeeId);
    List<Attendance> findByDateBetween(LocalDate from, LocalDate to);
    boolean existsByEmployeeIdAndDate(Long employeeId, LocalDate date);
}
