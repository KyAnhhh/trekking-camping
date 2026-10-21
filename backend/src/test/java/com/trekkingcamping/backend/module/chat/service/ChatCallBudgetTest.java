package com.trekkingcamping.backend.module.chat.service;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.net.*;
import java.util.concurrent.atomic.AtomicLong;
import static org.junit.jupiter.api.Assertions.*;
class ChatCallBudgetTest {
    @Test void deadlineAndCallsAreSharedAndBounded() {
        var time=new AtomicLong();var b=new ChatCallBudget(time::get,80000,60000);
        for(int i=0;i<4;i++)b.claim();
        assertEquals(502,assertThrows(ResponseStatusException.class,b::claim).getStatusCode().value());
        time.set(80_000_000_000L);
        assertEquals(504,assertThrows(ResponseStatusException.class,b::remaining).getStatusCode().value());
    }
    @Test void connectionTimeoutsShrinkWithoutChangingOtherRequests() throws Exception {
        var time=new AtomicLong();var b=new ChatCallBudget(time::get,80000,60000);
        var factory=new ChatCallBudget.RequestFactory();
        try {
            ChatCallBudget.CURRENT.set(b);
            var connection=(HttpURLConnection)new URL("http://localhost").openConnection();
            factory.prepareConnection(connection,"POST");assertEquals(60000,connection.getReadTimeout());
            time.set(70_000_000_000L);factory.prepareConnection(connection,"POST");
            assertTrue(connection.getReadTimeout()+connection.getConnectTimeout()<=10000);
        } finally { ChatCallBudget.CURRENT.remove(); }
        var other=(HttpURLConnection)new URL("http://localhost").openConnection();factory.prepareConnection(other,"POST");
        assertEquals(25000,other.getReadTimeout());
    }
}
