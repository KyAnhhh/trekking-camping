package com.trekkingcamping.backend.module.booking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.config.MomoProperties;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MomoPaymentServiceTest {
    MomoProperties config = mock(MomoProperties.class);
    MomoPaymentStore store = mock(MomoPaymentStore.class);
    MomoGateway gateway = mock(MomoGateway.class);
    MomoPaymentService service = new MomoPaymentService(config, store, gateway);
    MomoPaymentStore.Attempt attempt = new MomoPaymentStore.Attempt(1L, "MM-test", 2000000, "Test", "PENDING");

    @Test void creationCommitsAttemptBeforeHttpAndNeverMarksPaid() {
        when(store.prepare("test", 1L)).thenReturn(attempt);
        var response = new ObjectMapper().createObjectNode().put("resultCode", 0);
        when(gateway.create(attempt)).thenReturn(response);
        when(gateway.paymentUrl(response)).thenReturn("https://test-payment.momo.vn/test");
        assertEquals("PENDING", service.start("test", 1L).status());
        var order = inOrder(store, gateway); order.verify(store).prepare("test", 1L); order.verify(gateway).create(attempt);
        verify(store, never()).applyResult(any(), anyLong(), anyInt(), any(), any());
    }

    @Test void networkFailureDoesNotMarkTransactionFailed() {
        when(store.prepare("test", 1L)).thenReturn(attempt);
        when(gateway.create(attempt)).thenThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY));
        assertThrows(ResponseStatusException.class, () -> service.start("test", 1L));
        verify(store, never()).applyResult(any(), anyLong(), anyInt(), any(), any());
    }

    @Test void missingConfigDoesNotCreatePendingTransaction() {
        doThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE)).when(config).requireCheckout();
        assertThrows(ResponseStatusException.class, () -> service.start("test", 1L));
        verifyNoInteractions(store, gateway);
    }

    @Test void signatureRejectedBeforeTouchingDatabase() {
        var body = new ObjectMapper().createObjectNode();
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST)).when(gateway).verifyNotification(body);
        assertThrows(ResponseStatusException.class, () -> service.notification(body)); verifyNoInteractions(store);
    }

    @Test void refreshAuthorizesBeforeCallingGateway() {
        when(store.getForUser("other", "MM-test")).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));
        assertThrows(ResponseStatusException.class, () -> service.refresh("other", "MM-test")); verifyNoInteractions(gateway);
    }
}
