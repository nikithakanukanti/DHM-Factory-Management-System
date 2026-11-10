package com.dhm.backend.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.dhm.backend.entity.User;
import com.dhm.backend.repository.UserRepo;
import com.dhm.backend.service.AuditLogService;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepo userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public UserController(
            UserRepo userRepository,
            PasswordEncoder passwordEncoder,
            AuditLogService auditLogService) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    // GET ALL USERS
    @GetMapping
    public ResponseEntity<List<User>> getUsers() {
        List<User> list = userRepository.findAll();
        list.forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(list);
    }

    // CREATE USER
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user, Authentication authentication) {
        if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Username is required.");
        }

        if (user.getPassword() == null || user.getPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Password is required.");
        }

        if (user.getRole() == null) {
            return ResponseEntity.badRequest().body("Role is required.");
        }

        String username = user.getUsername().trim();
        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body("Username already exists.");
        }

        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setActive(true);

        User savedUser = userRepository.save(user);
        savedUser.setPassword(null);

        String actor = authentication != null ? authentication.getName() : "Admin";
        auditLogService.log(actor, "CREATE_USER", "USERS", savedUser.getId(),
                "Created user account " + savedUser.getUsername() + " with role " + savedUser.getRole());

        return ResponseEntity.ok(savedUser);
    }

    // EDIT USER
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User updated, Authentication authentication) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = opt.get();
        String oldSnapshot = "username=" + user.getUsername() + ", role=" + user.getRole() + ", active=" + user.isActive() + ", fullName=" + user.getFullName() + ", phone=" + user.getPhone() + ", modules=" + user.getPermittedModules();

        if (updated.getFullName() != null) {
            user.setFullName(updated.getFullName().trim());
        }
        if (updated.getPhone() != null) {
            user.setPhone(updated.getPhone().trim());
        }
        if (updated.getRole() != null) {
            // Cannot demote primary admin username
            if ("admin".equalsIgnoreCase(user.getUsername()) && updated.getRole() != user.getRole()) {
                return ResponseEntity.badRequest().body("Default admin role cannot be changed.");
            }
            user.setRole(updated.getRole());
        }
        if (updated.getPermittedModules() != null) {
            user.setPermittedModules(updated.getPermittedModules());
        }
        // Optional password reset
        boolean passwordReset = updated.getPassword() != null && !updated.getPassword().trim().isEmpty();
        if (passwordReset) {
            user.setPassword(passwordEncoder.encode(updated.getPassword().trim()));
        }

        User saved = userRepository.save(user);
        String newSnapshot = "username=" + saved.getUsername() + ", role=" + saved.getRole() + ", active=" + saved.isActive() + ", fullName=" + saved.getFullName() + ", phone=" + saved.getPhone() + ", modules=" + saved.getPermittedModules() + ", passwordReset=" + passwordReset;
        saved.setPassword(null);

        String actor = authentication != null ? authentication.getName() : "Admin";
        auditLogService.log(actor, "UPDATE_USER", "USERS", saved.getId(),
                "Updated user account " + saved.getUsername() + " (Role: " + saved.getRole() + ")", oldSnapshot, newSnapshot);

        return ResponseEntity.ok(saved);
    }

    // TOGGLE USER ACTIVE / DEACTIVE STATUS
    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id, Authentication authentication) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = opt.get();
        if ("admin".equalsIgnoreCase(user.getUsername())) {
            return ResponseEntity.badRequest().body("Default admin account cannot be deactivated.");
        }

        String oldSnapshot = "username=" + user.getUsername() + ", active=" + user.isActive() + ", role=" + user.getRole();
        user.setActive(!user.isActive());
        User saved = userRepository.save(user);
        String newSnapshot = "username=" + saved.getUsername() + ", active=" + saved.isActive() + ", role=" + saved.getRole();
        saved.setPassword(null);

        String actor = authentication != null ? authentication.getName() : "Admin";
        String statusText = saved.isActive() ? "ACTIVATED" : "DEACTIVATED";
        auditLogService.log(actor, statusText + "_USER", "USERS", saved.getId(),
                "User account " + saved.getUsername() + " was " + statusText.toLowerCase(), oldSnapshot, newSnapshot);

        return ResponseEntity.ok(saved);
    }

    // DELETE USER
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id, Authentication authentication) {
        if (id == null || id <= 0) {
            return ResponseEntity.badRequest().body("User ID is invalid.");
        }

        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = opt.get();
        if ("admin".equalsIgnoreCase(user.getUsername())) {
            return ResponseEntity.badRequest().body("Default admin account cannot be deleted.");
        }

        String oldSnapshot = "username=" + user.getUsername() + ", role=" + user.getRole() + ", active=" + user.isActive() + ", modules=" + user.getPermittedModules();
        userRepository.deleteById(id);

        String actor = authentication != null ? authentication.getName() : "Admin";
        auditLogService.log(actor, "DELETE_USER", "USERS", id,
                "Deleted user account " + user.getUsername(), oldSnapshot, null);

        return ResponseEntity.ok("User deleted successfully.");
    }
}