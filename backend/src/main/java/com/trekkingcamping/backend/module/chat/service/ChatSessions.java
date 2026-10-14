package com.trekkingcamping.backend.module.chat.service;

import com.trekkingcamping.backend.module.chat.entity.*;
import com.trekkingcamping.backend.module.chat.repository.*;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.Instant;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
public class ChatSessions {
    private final ChatSessionRepository sessions;
    private final ChatMessageRepository messages;
    private final UserRepository users;
    public ChatSessions(ChatSessionRepository sessions, ChatMessageRepository messages, UserRepository users) {
        this.sessions=sessions; this.messages=messages; this.users=users;
    }
    public record Credentials(String sessionId,String sessionToken) {}
    public record Turn(String sessionId,long revision,User owner,List<ChatMessage> history) {}
    @Transactional public Credentials create(String email) {
        User user=owner(email);
        String secret=UUID.randomUUID()+"-"+UUID.randomUUID();
        var s=new ChatSession(); s.setId(UUID.randomUUID().toString()); s.setUserId(user==null?null:user.getId());
        s.setSecretHash(hash(secret)); s.setExpiresAt(Instant.now().plusSeconds(86400)); sessions.save(s);
        return new Credentials(s.getId(),secret);
    }
    @Transactional public Turn begin(String id,String token,String email) {
        var user=owner(email); var s=authorized(id,token,user);
        Instant now=Instant.now();
        if(s.getBusyUntil()!=null && s.getBusyUntil().isAfter(now))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Một câu trả lời đang được xử lý trong phiên này.");
        if(s.getNextTurnAt()!=null && s.getNextTurnAt().isAfter(now))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Vui lòng chờ vài giây trước câu hỏi tiếp theo.");
        s.setTurn(s.getTurn()+1); s.setBusyUntil(now.plusSeconds(120)); s.setNextTurnAt(now.plusSeconds(3));
        var history=new ArrayList<>(messages.findTop6BySessionIdOrderByCreatedAtDescIdDesc(id));
        Collections.reverse(history);
        return new Turn(id,s.getTurn(),user,history);
    }
    @Transactional public void finish(Turn turn,String question,String answer) {
        var s=sessions.locked(turn.sessionId()).orElseThrow(ChatSessions::missing);
        if(s.getTurn()!=turn.revision() || s.getBusyUntil()==null || !s.getBusyUntil().isAfter(Instant.now()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Lượt trả lời đã hết hạn. Vui lòng gửi lại.");
        var a=new ChatMessage(); a.setSessionId(s.getId()); a.setUser(turn.owner()); a.setSender("USER"); a.setMessage(question);
        var b=new ChatMessage(); b.setSessionId(s.getId()); b.setUser(turn.owner()); b.setSender("BOT"); b.setMessage(answer);
        messages.saveAll(List.of(a,b)); s.setBusyUntil(null);
    }
    @Transactional public void release(Turn turn) {
        sessions.locked(turn.sessionId()).ifPresent(s -> { if(s.getTurn()==turn.revision()) s.setBusyUntil(null); });
    }
    @Transactional public List<ChatMessage> history(String id,String token,String email) {
        authorized(id,token,owner(email));
        var rows=new ArrayList<>(messages.findTop40BySessionIdOrderByCreatedAtDescIdDesc(id));
        Collections.reverse(rows); return rows;
    }
    private ChatSession authorized(String id,String token,User user) {
        if(id==null || id.length()!=36 || token==null || token.length()>100) throw missing();
        var s=sessions.locked(id).orElseThrow(ChatSessions::missing);
        if(!Objects.equals(s.getUserId(),user==null?null:user.getId()) || !s.getExpiresAt().isAfter(Instant.now())
                || !MessageDigest.isEqual(s.getSecretHash().getBytes(StandardCharsets.UTF_8),hash(token).getBytes(StandardCharsets.UTF_8))) throw missing();
        return s;
    }
    private User owner(String email) {
        if(email==null || "anonymousUser".equals(email)) return null;
        return users.findByEmail(email).filter(u -> Boolean.TRUE.equals(u.getIsActive()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Vui lòng đăng nhập lại."));
    }
    static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch(java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"Phiên chat không hợp lệ hoặc đã hết hạn. Hãy mở cuộc trò chuyện mới."); }
}
