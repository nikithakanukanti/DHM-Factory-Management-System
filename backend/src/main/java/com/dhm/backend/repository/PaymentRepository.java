package com.dhm.backend.repository;

import com.dhm.backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByPaymentType(String paymentType);
    List<Payment> findByPartyIdAndPaymentType(Long partyId, String paymentType);
    List<Payment> findByPaymentDateBetween(LocalDate from, LocalDate to);
    List<Payment> findTop50ByOrderByPaymentDateDescIdDesc();
}
