package com.dhm.backend.repository;

import com.dhm.backend.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    Optional<Supplier> findBySupplierCode(String supplierCode);
    List<Supplier> findByStatus(String status);
    List<Supplier> findByNameContainingIgnoreCase(String name);
}
