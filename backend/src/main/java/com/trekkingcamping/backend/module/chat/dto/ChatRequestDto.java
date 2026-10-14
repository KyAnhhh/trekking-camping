package com.trekkingcamping.backend.module.chat.dto;

public class ChatRequestDto {
    private String sessionToken;
    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String token) { sessionToken=token; }
    private String sessionId;
    private String message;

    public ChatRequestDto() {}

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
