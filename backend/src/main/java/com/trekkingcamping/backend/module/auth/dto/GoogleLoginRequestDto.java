package com.trekkingcamping.backend.module.auth.dto;

public class GoogleLoginRequestDto {
    private String idToken;

    public GoogleLoginRequestDto() {}

    public GoogleLoginRequestDto(String idToken) {
        this.idToken = idToken;
    }

    public String getIdToken() {
        return idToken;
    }

    public void setIdToken(String idToken) {
        this.idToken = idToken;
    }
}
