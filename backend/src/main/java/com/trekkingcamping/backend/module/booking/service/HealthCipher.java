package com.trekkingcamping.backend.module.booking.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class HealthCipher {
    private final String configuredKey;
    public HealthCipher(@Value("${HEALTH_DATA_KEY:}") String key) { configuredKey=key; }
    public String encrypt(Long bookingId,String content) {
        try {
            byte[] nonce=new byte[12]; new SecureRandom().nextBytes(nonce);
            Cipher cipher=cipher(Cipher.ENCRYPT_MODE,bookingId,nonce);
            return "v1."+Base64.getEncoder().encodeToString(nonce)+"."+Base64.getEncoder().encodeToString(cipher.doFinal(content.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw unavailable(); }
    }
    public String decrypt(Long bookingId,String content) {
        try {
            String[] parts=content.split("\\.");
            if(parts.length!=3 || !"v1".equals(parts[0])) throw new IllegalArgumentException();
            return new String(cipher(Cipher.DECRYPT_MODE,bookingId,Base64.getDecoder().decode(parts[1]))
                    .doFinal(Base64.getDecoder().decode(parts[2])),StandardCharsets.UTF_8);
        } catch (Exception e) { throw unavailable(); }
    }
    private Cipher cipher(int mode,Long id,byte[] nonce) throws Exception {
        byte[] key=Base64.getDecoder().decode(configuredKey.trim());
        if(key.length!=32 || nonce.length!=12) throw new IllegalArgumentException();
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(mode,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,nonce));
        cipher.updateAAD(("participation:v1:"+id).getBytes(StandardCharsets.UTF_8));
        return cipher;
    }
    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Chưa thể lưu/đọc khai báo riêng tư. Quản trị viên cần kiểm tra HEALTH_DATA_KEY; không gửi khóa qua chat.");
    }
}
