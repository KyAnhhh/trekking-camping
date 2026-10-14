package com.trekkingcamping.backend.module.chat.service;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
@Component
public class ChatRateLimit {
    private record Window(long until,int count) {}
    private final Map<String,Window> windows=new HashMap<>();
    public synchronized void check(String remote,String action,int limit) {
        long now=System.currentTimeMillis();windows.entrySet().removeIf(e -> e.getValue().until()<=now);
        String key=remote+":"+action;var w=windows.get(key);
        if((w==null && windows.size()>=4096) || (w!=null && w.count()>=limit))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Bạn gửi nhiều yêu cầu trong một phút. Vui lòng thử lại sau.");
        windows.put(key,new Window(w==null?now+60000:w.until(),w==null?1:w.count()+1));
    }
}
