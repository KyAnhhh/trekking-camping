package com.trekkingcamping.backend.module.chat.service;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.util.function.LongSupplier;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.server.ResponseStatusException;

/** One budget across retries and tool rounds; timeout state is isolated per worker. */
final class ChatCallBudget {
    static final ThreadLocal<ChatCallBudget> CURRENT=new ThreadLocal<>();
    private final LongSupplier clock;
    private final long deadline;
    private final int readCap;
    private int calls;
    ChatCallBudget(boolean gemma) { this(System::nanoTime,80_000,gemma?60_000:25_000); }
    ChatCallBudget(LongSupplier clock,long millis,int readCap) {
        this.clock=clock;this.deadline=clock.getAsLong()+millis*1_000_000;this.readCap=readCap;
    }
    int remaining() {
        long ms=(deadline-clock.getAsLong())/1_000_000;
        if(ms<=0 || Thread.currentThread().isInterrupted()) throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT,"AI đã hết thời gian xử lý lượt này. Vui lòng thử lại sau.");
        return (int)Math.min(ms,Integer.MAX_VALUE);
    }
    void claim() {
        remaining();
        if(calls>=4) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"AI chưa hoàn tất sau số lần gọi cho phép. Hãy thu hẹp câu hỏi.");
        calls++;
    }
    static class RequestFactory extends SimpleClientHttpRequestFactory {
        RequestFactory(){setConnectTimeout(5000);setReadTimeout(25000);}
        @Override protected void prepareConnection(HttpURLConnection connection,String method) throws IOException {
            super.prepareConnection(connection,method);
            var budget=CURRENT.get();
            if(budget!=null) {
                int remaining=budget.remaining();
                // Reserve connect time within the remaining budget, never mutate shared factory settings.
                int connect=Math.max(1,Math.min(5000,remaining/4));
                connection.setConnectTimeout(connect);
                connection.setReadTimeout(Math.max(1,Math.min(budget.readCap,remaining-connect)));
            }
        }
    }
}
