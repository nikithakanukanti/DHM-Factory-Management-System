package com.dhm.backend.controller;

import com.dhm.backend.config.TokenService;
import com.dhm.backend.entity.User;
import com.dhm.backend.repository.UserRepo;
import com.dhm.backend.service.AuditLogService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepo userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final AuditLogService auditLogService;

    public AuthController(UserRepo userRepository,
                          PasswordEncoder passwordEncoder,
                          TokenService tokenService,
                          AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.auditLogService = auditLogService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        if (loginRequest == null || loginRequest.getUsername() == null || loginRequest.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required."));
        }

        String username = loginRequest.getUsername().trim();
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty() || !passwordEncoder.matches(loginRequest.getPassword(), userOpt.get().getPassword())) {
            auditLogService.log(username, "LOGIN_FAILED", "SECURITY", null, "Failed login attempt for " + username);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password."));
        }

        User user = userOpt.get();
        if (!user.isActive()) {
            auditLogService.log(username, "LOGIN_BLOCKED", "SECURITY", user.getId(), "Deactivated account login attempt: " + username);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Your account has been deactivated. Please contact an Administrator."));
        }

        String roleStr = user.getRole().name();
        String token = tokenService.generateToken(user.getUsername(), roleStr);

        auditLogService.log(user.getUsername(), "LOGIN", "SECURITY", user.getId(), "User logged in with role " + roleStr);

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("username", user.getUsername());
        response.put("role", roleStr);
        response.put("fullName", user.getFullName() != null ? user.getFullName() : user.getUsername());
        response.put("permittedModules", user.getPermittedModules() != null ? user.getPermittedModules() : "");

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated."));
        }

        String username = authentication.getName();
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isPresent()) {
            User u = userOpt.get();
            if (!u.isActive()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Your account has been deactivated."));
            }
            Map<String, Object> response = new HashMap<>();
            response.put("username", u.getUsername());
            response.put("role", u.getRole().name());
            response.put("fullName", u.getFullName() != null ? u.getFullName() : u.getUsername());
            response.put("phone", u.getPhone() != null ? u.getPhone() : "");
            response.put("permittedModules", u.getPermittedModules() != null ? u.getPermittedModules() : "");
            return ResponseEntity.ok(response);
        }

        Map<String, String> response = new HashMap<>();
        String role = authentication.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("");

        if (role.startsWith("ROLE_")) {
            role = role.substring(5);
        }

        response.put("username", username);
        response.put("role", role);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "New password must be at least 6 characters."));
        }

        String username = authentication.getName();
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password is incorrect."));
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        auditLogService.log(username, "CHANGE_PASSWORD", "SECURITY", user.getId(), "Password updated successfully");
        return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
    }

    public static class LoginRequest {
        private String username;
        private String password;

        public LoginRequest() {}

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class ChangePasswordRequest {
        private String currentPassword;
        private String newPassword;

        public ChangePasswordRequest() {}

        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }
}
