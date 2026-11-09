package com.dhm.backend.repository;

import com.dhm.backend.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByCustomerCode(String customerCode);
    List<Customer> findByStatus(String status);
    List<Customer> findByNameContainingIgnoreCase(String name);
}
