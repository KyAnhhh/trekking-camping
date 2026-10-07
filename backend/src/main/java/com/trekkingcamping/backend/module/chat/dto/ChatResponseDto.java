package com.trekkingcamping.backend.module.chat.dto;

public class ChatResponseDto {
    private String sessionId;
    private String reply;

    public ChatResponseDto() {}

    public ChatResponseDto(String sessionId, String reply) {
        this.sessionId = sessionId;
        this.reply = reply;
    }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public String getReply() { return reply; }
    public void setReply(String reply) { this.reply = reply; }
}