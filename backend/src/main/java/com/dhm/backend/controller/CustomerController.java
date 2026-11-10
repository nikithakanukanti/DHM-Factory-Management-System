package com.dhm.backend.controller;

import com.dhm.backend.entity.Customer;
import com.dhm.backend.entity.Payment;
import com.dhm.backend.entity.Sale;
import com.dhm.backend.repository.CustomerRepository;
import com.dhm.backend.repository.PaymentRepository;
import com.dhm.backend.repository.SaleRepository;
import com.dhm.backend.service.AuditLogService;
import com.dhm.backend.service.RecordAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final SaleRepository saleRepository;
    private final PaymentRepository paymentRepository;
    private final AuditLogService auditLogService;
    private final RecordAccessService recordAccessService;

    public CustomerController(CustomerRepository customerRepository,
                              SaleRepository saleRepository,
                              PaymentRepository paymentRepository,
                              AuditLogService auditLogService,
                              RecordAccessService recordAccessService) {
        this.customerRepository = customerRepository;
        this.saleRepository = saleRepository;
        this.paymentRepository = paymentRepository;
        this.auditLogService = auditLogService;
        this.recordAccessService = recordAccessService;
    }

    @GetMapping
    public List<Customer> getAll() {
        return customerRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Customer> getById(@PathVariable Long id) {
        return customerRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Customer Statement (Sales history + Pending balances + Payment logs)
    @GetMapping("/{id}/statement")
    public ResponseEntity<?> getCustomerStatement(@PathVariable Long id) {
        return customerRepository.findById(id)
                .map(customer -> {
                    List<Sale> sales = saleRepository.findByCustomerId(id);
                    if (sales.isEmpty() && customer.getName() != null) {
                        sales = saleRepository.findByCustomerNameIgnoreCase(customer.getName().trim());
                    }

                    List<Payment> payments = paymentRepository.findByPartyIdAndPaymentType(id, "CUSTOMER_PAYMENT");

                    BigDecimal totalSalesAmount = sales.stream()
                            .map(Sale::getGrandTotal)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal totalPaidAmount = sales.stream()
                            .map(Sale::getPaidAmount)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal outstandingBalance = totalSalesAmount.subtract(totalPaidAmount).max(BigDecimal.ZERO);

                    Map<String, Object> statement = new HashMap<>();
                    statement.put("customer", customer);
                    statement.put("sales", sales);
                    statement.put("payments", payments);
                    statement.put("totalSalesCount", sales.size());
                    statement.put("totalSalesAmount", totalSalesAmount);
                    statement.put("totalPaidAmount", totalPaidAmount);
                    statement.put("outstandingBalance", outstandingBalance);
                    statement.put("creditLimit", customer.getCreditLimit());
                    statement.put("creditAvailable", customer.getCreditLimit() != null ? customer.getCreditLimit().subtract(outstandingBalance) : BigDecimal.ZERO);

                    return ResponseEntity.ok(statement);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Customer customer, Authentication authentication) {
        if (customer.getName() == null || customer.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Customer name is required.");
        }

        if (customer.getCustomerCode() == null || customer.getCustomerCode().trim().isEmpty()) {
            customer.setCustomerCode("CUST-" + String.format("%04d", customerRepository.count() + 1));
        }

        String username = authentication != null ? authentication.getName() : "System";
        if (customer.getCreatedAt() == null) customer.setCreatedAt(LocalDate.now());
        customer.setCreatedBy(username);

        Customer saved = customerRepository.save(customer);
        auditLogService.log(username, "CREATE", "CUSTOMER", saved.getId(), "Customer " + saved.getName() + " added.",
                null, "code=" + saved.getCustomerCode() + ", name=" + saved.getName() + ", phone=" + saved.getPhone() + ", status=" + saved.getStatus());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Customer updated, Authentication authentication) {
        return customerRepository.findById(id)
                .map(c -> {
                    LocalDate recordDate = c.getCreatedAt() != null ? c.getCreatedAt() : LocalDate.now();
                    if (!recordAccessService.canModify(recordDate, c.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403).body("Supervisors can only edit their own customer records on the same day (until 11:59 PM IST).");
                    }

                    String oldSnapshot = "code=" + c.getCustomerCode() + ", name=" + c.getName() + ", phone=" + c.getPhone() + ", email=" + c.getEmail() + ", gstin=" + c.getGstin() + ", credit=" + c.getCreditLimit() + ", status=" + c.getStatus();
                    c.setName(updated.getName());
                    c.setPhone(updated.getPhone());
                    c.setEmail(updated.getEmail());
                    c.setAddress(updated.getAddress());
                    c.setGstin(updated.getGstin());
                    c.setCreditLimit(updated.getCreditLimit());
                    c.setStatus(updated.getStatus());

                    Customer saved = customerRepository.save(c);
                    String username = authentication != null ? authentication.getName() : "System";
                    String newSnapshot = "code=" + saved.getCustomerCode() + ", name=" + saved.getName() + ", phone=" + saved.getPhone() + ", email=" + saved.getEmail() + ", gstin=" + saved.getGstin() + ", credit=" + saved.getCreditLimit() + ", status=" + saved.getStatus();
                    auditLogService.log(username, "UPDATE", "CUSTOMER", id, "Customer " + saved.getName() + " updated.", oldSnapshot, newSnapshot);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        return customerRepository.findById(id)
                .map(c -> {
                    LocalDate recordDate = c.getCreatedAt() != null ? c.getCreatedAt() : LocalDate.now();
                    if (!recordAccessService.canModify(recordDate, c.getCreatedBy(), authentication)) {
                        return ResponseEntity.status(403).body("Supervisors can only delete their own customer records on the same day (until 11:59 PM IST).");
                    }
                    String oldSnapshot = "code=" + c.getCustomerCode() + ", name=" + c.getName() + ", phone=" + c.getPhone() + ", status=" + c.getStatus();
                    customerRepository.delete(c);
                    String username = authentication != null ? authentication.getName() : "System";
                    auditLogService.log(username, "DELETE", "CUSTOMER", id, "Customer deleted.", oldSnapshot, null);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
