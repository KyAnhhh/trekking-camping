package com.trekkingcamping.backend.module.booking.repository;

import com.trekkingcamping.backend.module.booking.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<PaymentTransaction> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths={"booking"})
    org.springframework.data.domain.Page<PaymentTransaction> findAll(org.springframework.data.jpa.domain.Specification<PaymentTransaction> spec, org.springframework.data.domain.Pageable pageable);
    long countByStatus(String status);
    @org.springframework.data.jpa.repository.Query("select coalesce(sum(p.amount),0) from PaymentTransaction p where p.status = :status")
    java.math.BigDecimal totalAmountByStatus(@org.springframework.data.repository.query.Param("status") String status);
    java.util.Optional<PaymentTransaction> findByTransactionCode(String transactionCode);
    @org.springframework.data.jpa.repository.Query("select p.booking.id from PaymentTransaction p where p.transactionCode = :code")
    java.util.Optional<Long> findBookingIdByTransactionCode(@org.springframework.data.repository.query.Param("code") String code);
    List<PaymentTransaction> findByBookingIdOrderByIdDesc(Long bookingId);
}
