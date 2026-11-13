package com.trekkingcamping.backend.module.chat.dto;

public class ChatRequestDto {
    private Long settingsRevision;
    public Long getSettingsRevision(){return settingsRevision;}
    public void setSettingsRevision(Long value){settingsRevision=value;}
    private String sessionToken;
    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String token) { sessionToken=token; }
    private String sessionId;
    private String message;
    private ActiveTourContext activeTourContext;

    public ChatRequestDto() {}

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public ActiveTourContext getActiveTourContext() { return activeTourContext; }
    public void setActiveTourContext(ActiveTourContext activeTourContext) { this.activeTourContext = activeTourContext; }

    public static class ActiveTourContext {
        private Long id;
        private String title;
        private String slug;
        private String location;

        public ActiveTourContext() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getSlug() { return slug; }
        public void setSlug(String slug) { this.slug = slug; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
    }
}
