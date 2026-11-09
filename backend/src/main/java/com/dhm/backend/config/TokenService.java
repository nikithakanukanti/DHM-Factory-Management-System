package com.dhm.backend.config;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

@Service
public class TokenService {

    // 256-bit default secret key for DHM Pyrotech Enterprise tokens
    private static final String SECRET_KEY = "DHM_PYROTECH_ENTERPRISE_SECURE_AUTH_TOKEN_KEY_2026";
    private static final long EXPIRATION_MILLIS = 7L * 24 * 60 * 60 * 1000; // 7 days

    public String generateToken(String username, String role) {
        long expiresAt = System.currentTimeMillis() + EXPIRATION_MILLIS;
        String payload = username + ":" + role + ":" + expiresAt;
        String encodedPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String signature = hmacSha256(encodedPayload);
        return encodedPayload + "." + signature;
    }

    public TokenInfo validateToken(String token) {
        if (token == null || !token.contains(".")) {
            return null;
        }

        String[] parts = token.split("\\.");
        if (parts.length != 2) {
            return null;
        }

        String encodedPayload = parts[0];
        String signature = parts[1];

        String expectedSignature = hmacSha256(encodedPayload);
        if (!MessageDigest.isEqual(signature.getBytes(StandardCharsets.UTF_8), expectedSignature.getBytes(StandardCharsets.UTF_8))) {
            return null;
        }

        try {
            byte[] decoded = Base64.getUrlDecoder().decode(encodedPayload);
            String payload = new String(decoded, StandardCharsets.UTF_8);
            String[] payloadParts = payload.split(":");
            if (payloadParts.length != 3) {
                return null;
            }

            String username = payloadParts[0];
            String role = payloadParts[1];
            long expiresAt = Long.parseLong(payloadParts[2]);

            if (System.currentTimeMillis() > expiresAt) {
                return null; // Expired
            }

            return new TokenInfo(username, role);
        } catch (Exception e) {
            return null;
        }
    }

    private String hmacSha256(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(SECRET_KEY.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate HMAC SHA256", e);
        }
    }

    public static class TokenInfo {
        private final String username;
        private final String role;

        public TokenInfo(String username, String role) {
            this.username = username;
            this.role = role;
        }

        public String getUsername() {
            return username;
        }

        public String getRole() {
            return role;
        }
    }
}
