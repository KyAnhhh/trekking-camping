package com.trekkingcamping.backend.module.booking.service;
import com.trekkingcamping.backend.config.VnpayProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class VnpayRecoveryTest {
    VnpayProperties config = new VnpayProperties();
    { config.setTmnCode("TEST0001"); config.setHashSecret("synthetic-test-only"); }
    MomoPaymentStore store = mock(MomoPaymentStore.class);
    VnpayGateway gateway = new VnpayGateway(config);
    String ref(int minutesAgo) { return "VN" + LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMinutes(minutesAgo).format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + "a".repeat(32); }
    MomoPaymentStore.Attempt attempt(String ref, String status) { return new MomoPaymentStore.Attempt(1L, ref, 2500000, "Thanh toan tour TEST", status); }
    @Test void expiredAttemptIsReconciledBeforeCreatingNewUrl() {
        var old = attempt(ref(30), "PENDING"); var fresh = attempt(ref(0), "PENDING");
        var query = mock(VnpayQueryClient.class); var service = new VnpayPaymentService(config, store, gateway, query);
        when(store.prepare("owner", 1L, "VNPAY_SANDBOX")).thenReturn(old, fresh);
        when(query.query(old, "127.0.0.1")).thenReturn(new VnpayQueryClient.QueryResult(old.orderId(), old.amount(), old.orderInfo(), false, false, true));
        when(store.expireVnpay(old.orderId(), old.amount(), old.orderInfo())).thenReturn(attempt(old.orderId(), "EXPIRED"));
        var result = service.start("owner", 1L, "127.0.0.1"); assertEquals(fresh.orderId(), result.orderId()); assertNotNull(result.paymentUrl());
        var order = inOrder(store, query); order.verify(store).prepare("owner", 1L, "VNPAY_SANDBOX"); order.verify(query).query(old, "127.0.0.1");
        order.verify(store).expireVnpay(old.orderId(), old.amount(), old.orderInfo()); order.verify(store).prepare("owner", 1L, "VNPAY_SANDBOX");
    }
    @Test void alreadyPaidDoesNotGenerateAnotherPayment() {
        var old = attempt(ref(30), "PENDING"); var query = mock(VnpayQueryClient.class);
        when(store.prepare("owner", 1L, "VNPAY_SANDBOX")).thenReturn(old);
        when(query.query(old, "127.0.0.1")).thenReturn(new VnpayQueryClient.QueryResult(old.orderId(), old.amount(), old.orderInfo(), true, false, false));
        when(store.applyVnpayResult(old.orderId(), old.amount(), true, false, old.orderInfo())).thenReturn(attempt(old.orderId(), "SUCCESS"));
        var result = new VnpayPaymentService(config, store, gateway, query).start("owner", 1L, "127.0.0.1");
        assertEquals("SUCCESS", result.status()); assertNull(result.paymentUrl()); verify(store, times(1)).prepare(any(), any(), any());
    }
    @Test void queryFailureNeverReleasesPendingAttempt() {
        var old = attempt(ref(30), "PENDING"); var query = mock(VnpayQueryClient.class);
        when(store.prepare("owner", 1L, "VNPAY_SANDBOX")).thenReturn(old); when(query.query(any(), any())).thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.BAD_GATEWAY));
        assertThrows(ResponseStatusException.class, () -> new VnpayPaymentService(config, store, gateway, query).start("owner", 1L, "127.0.0.1"));
        verify(store, never()).applyVnpayResult(any(), anyLong(), anyBoolean(), anyBoolean(), any());
    }
    @Test void notFoundOnlyReleasesExpiredUrlAfterGracePeriod() {
        var query = new VnpayQueryClient(config, gateway);
        var server = MockRestServiceServer.bindTo((RestTemplate)ReflectionTestUtils.getField(query, "http")).build();
        server.expect(anything()).andExpect(jsonPath("$.vnp_Command").value("querydr")).andRespond(withSuccess("{\"vnp_ResponseCode\":\"91\"}", MediaType.APPLICATION_JSON));
        assertTrue(query.query(attempt(ref(30), "PENDING"), "127.0.0.1").expired());
        server.reset(); server.expect(anything()).andRespond(withSuccess("{\"vnp_ResponseCode\":\"91\"}", MediaType.APPLICATION_JSON));
        assertThrows(ResponseStatusException.class, () -> query.query(attempt(ref(0), "PENDING"), "127.0.0.1")); server.verify();
    }
    @Test void verifiesQuerySignatureAmountAndDistinguishesResponseFromTransactionStatus() throws Exception {
        var old = attempt(ref(30), "PENDING"); var query = new VnpayQueryClient(config, gateway);
        var server = MockRestServiceServer.bindTo((RestTemplate)ReflectionTestUtils.getField(query, "http")).build();
        String[] fields = {"vnp_ResponseId","vnp_Command","vnp_ResponseCode","vnp_Message","vnp_TmnCode","vnp_TxnRef","vnp_Amount","vnp_BankCode","vnp_PayDate","vnp_TransactionNo","vnp_TransactionType","vnp_TransactionStatus","vnp_OrderInfo","vnp_PromotionCode","vnp_PromotionAmount"};
        for (String status : List.of("00", "01", "02", "04", "05", "06", "07", "08", "09", "11", "99")) {
            var values = new HashMap<String,String>(); for (String field : fields) values.put(field, "");
            values.put("vnp_ResponseId","test"); values.put("vnp_Command","querydr"); values.put("vnp_ResponseCode","00"); values.put("vnp_TmnCode",config.getTmnCode()); values.put("vnp_TxnRef",old.orderId());
            values.put("vnp_Amount","250000000"); values.put("vnp_TransactionType","01"); values.put("vnp_TransactionStatus",status); values.put("vnp_TransactionNo","01".equals(status) ? "0" : "12345");
            if ("08".equals(status)) values.put("vnp_PayDate", "20261001080000");
            values.put("vnp_SecureHash",gateway.sign(Arrays.stream(fields).map(values::get).collect(java.util.stream.Collectors.joining("|"))));
            server.reset(); server.expect(anything()).andRespond(withSuccess(new ObjectMapper().writeValueAsString(values),MediaType.APPLICATION_JSON));
            var result = query.query(old,"127.0.0.1"); assertEquals("00".equals(status),result.success()); assertEquals(Set.of("02", "11").contains(status),result.failed()); assertEquals("08".equals(status),result.expired());
            values.put("vnp_Amount","1"); server.reset(); server.expect(anything()).andRespond(withSuccess(new ObjectMapper().writeValueAsString(values),MediaType.APPLICATION_JSON));
            assertThrows(ResponseStatusException.class, () -> query.query(old,"127.0.0.1")); server.verify();
        }
    }
}
