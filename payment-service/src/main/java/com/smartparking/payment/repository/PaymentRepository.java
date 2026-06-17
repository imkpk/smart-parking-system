package com.smartparking.payment.repository;

import com.smartparking.payment.model.Payment;
import com.smartparking.payment.model.PaymentStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByGatewayOrderId(String gatewayOrderId);
    List<Payment> findAllByOrderByCreatedAtDesc();

    List<Payment> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByStatus(PaymentStatus status);
}
