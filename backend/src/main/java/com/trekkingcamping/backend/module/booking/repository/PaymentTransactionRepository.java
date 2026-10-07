package com.trekkingcamping.backend.module.booking.repository;

import com.trekkingcamping.backend.module.booking.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    java.util.Optional<PaymentTransaction> findByTransactionCode(String transactionCode);
    @org.springframework.data.jpa.repository.Query("select p.booking.id from PaymentTransaction p where p.transactionCode = :code")
    java.util.Optional<Long> findBookingIdByTransactionCode(@org.springframework.data.repository.query.Param("code") String code);
    List<PaymentTransaction> findByBookingIdOrderByIdDesc(Long bookingId);
}
