package com.dhm.backend.repository;

import com.dhm.backend.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByEmployeeCode(String employeeCode);
    List<Employee> findByStatus(String status);
    List<Employee> findByDepartment(String department);
    List<Employee> findByNameContainingIgnoreCase(String name);
}
