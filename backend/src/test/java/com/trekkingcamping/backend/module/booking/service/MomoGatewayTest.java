package com.trekkingcamping.backend.module.booking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.trekkingcamping.backend.config.MomoProperties;
import org.junit.jupiter.api.*;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class MomoGatewayTest {
    MomoProperties config;
    MomoGateway gateway;
    MockRestServiceServer server;
    ObjectMapper mapper = new ObjectMapper();
    MomoPaymentStore.Attempt attempt = new MomoPaymentStore.Attempt(1L, "MM-test", 2000000, "Thanh toan tour BK-TEST", "PENDING");

    @BeforeEach void setup() {
        config = new MomoProperties();
        ReflectionTestUtils.setField(config, "partnerCode", "TEST_PARTNER");
        ReflectionTestUtils.setField(config, "accessKey", "synthetic-access");
        ReflectionTestUtils.setField(config, "secretKey", "synthetic-secret");
        ReflectionTestUtils.setField(config, "ipnUrl", "https://example.test/api/payments/momo/ipn");
        gateway = new MomoGateway(config);
        server = MockRestServiceServer.bindTo((RestTemplate) ReflectionTestUtils.getField(gateway, "http")).build();
    }

    @Test void hmacMatchesRfc4231Vector() {
        assertEquals("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
                MomoGateway.sign("Jefe", "what do ya want for nothing?"));
    }

    @Test void createsOnlyOnSandboxWithCanonicalSignatureAndStableIds() {
        String expected = MomoGateway.sign("synthetic-secret", "accessKey=synthetic-access&amount=2000000&extraData=&ipnUrl=https://example.test/api/payments/momo/ipn&orderId=MM-test&orderInfo=Thanh toan tour BK-TEST&partnerCode=TEST_PARTNER&redirectUrl=http://localhost:5173/payment/momo/return&requestId=MM-test&requestType=captureWallet");
        server.expect(requestTo("https://test-payment.momo.vn/v2/gateway/api/create"))
                .andExpect(method(HttpMethod.POST)).andExpect(jsonPath("$.signature").value(expected))
                .andExpect(jsonPath("$.autoCapture").value(true)).andExpect(jsonPath("$.amount").value(2000000))
                .andExpect(jsonPath("$.requestId").value("MM-test"))
                .andRespond(withSuccess("{\"partnerCode\":\"TEST_PARTNER\",\"requestId\":\"MM-test\",\"orderId\":\"MM-test\",\"amount\":2000000,\"resultCode\":0,\"payUrl\":\"https://test-payment.momo.vn/v2/gateway/pay?t=test\"}", MediaType.APPLICATION_JSON));
        assertTrue(gateway.paymentUrl(gateway.create(attempt)).startsWith("https://test-payment.momo.vn/"));
        server.verify();
    }

    @Test void validSignedNotificationAcceptedButTamperedAmountOrPartnerRejected() {
        ObjectNode body = notification();
        assertDoesNotThrow(() -> gateway.verifyNotification(body));
        body.put("amount", 1);
        assertThrows(ResponseStatusException.class, () -> gateway.verifyNotification(body));
        ObjectNode other = notification(); other.put("partnerCode", "OTHER");
        assertThrows(ResponseStatusException.class, () -> gateway.verifyNotification(other));
        assertThrows(ResponseStatusException.class, () -> gateway.verifyNotification(mapper.createObjectNode()));
    }

    @Test void querySignsFreshRequestAndChecksServerAmount() {
        server.expect(requestTo("https://test-payment.momo.vn/v2/gateway/api/query"))
                .andExpect(request -> {
                    var json = mapper.readTree(((org.springframework.mock.http.client.MockClientHttpRequest) request).getBodyAsString());
                    assertEquals(MomoGateway.sign("synthetic-secret", "accessKey=synthetic-access&orderId=MM-test&partnerCode=TEST_PARTNER&requestId=" + json.path("requestId").asText()), json.path("signature").asText());
                }).andRespond(request -> {
                    var json = mapper.readTree(((org.springframework.mock.http.client.MockClientHttpRequest) request).getBodyAsString());
                    ObjectNode response = mapper.createObjectNode().put("partnerCode", "TEST_PARTNER")
                            .put("orderId", "MM-test").put("requestId", json.path("requestId").asText()).put("amount", 1).put("resultCode", 0);
                    return withSuccess(response.toString(), MediaType.APPLICATION_JSON).createResponse(request);
                });
        assertThrows(ResponseStatusException.class, () -> gateway.query(attempt)); server.verify();
    }

    @Test void refusesUntrustedCheckoutUrls() {
        for (String url : new String[]{"http://test-payment.momo.vn/pay", "https://evil.test/pay", "https://test-payment.momo.vn.evil.test/", "https://user@test-payment.momo.vn/"}) {
            assertThrows(ResponseStatusException.class, () -> gateway.paymentUrl(mapper.createObjectNode().put("payUrl", url)));
        }
    }

    @Test void missingConfigurationFailsWithoutHttpRequest() {
        assertThrows(ResponseStatusException.class, () -> new MomoProperties().requireCheckout());
        ReflectionTestUtils.setField(config, "ipnUrl", "http://localhost:8080/api/payments/momo/ipn");
        assertThrows(ResponseStatusException.class, () -> gateway.create(attempt)); server.verify();
    }

    private ObjectNode notification() {
        ObjectNode body = mapper.createObjectNode().put("amount", 2000000).put("extraData", "")
                .put("message", "Successful.").put("orderId", "MM-test").put("orderInfo", "Thanh toan tour BK-TEST")
                .put("orderType", "momo_wallet").put("partnerCode", "TEST_PARTNER").put("payType", "qr")
                .put("requestId", "MM-test").put("responseTime", 1721720663942L).put("resultCode", 0).put("transId", 4088878653L);
        body.put("signature", MomoGateway.sign("synthetic-secret", "accessKey=synthetic-access&amount=2000000&extraData=&message=Successful.&orderId=MM-test&orderInfo=Thanh toan tour BK-TEST&orderType=momo_wallet&partnerCode=TEST_PARTNER&payType=qr&requestId=MM-test&responseTime=1721720663942&resultCode=0&transId=4088878653"));
        return body;
    }
}
