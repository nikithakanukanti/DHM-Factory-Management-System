package com.dhm.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dhm.backend.entity.User;
import com.dhm.backend.repository.UserRepository;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // GET ALL USERS
    @GetMapping
    public ResponseEntity<List<User>> getUsers() {

        return ResponseEntity.ok(
                userRepository.findAll()
        );
    }

    // CREATE USER
    @PostMapping
    public ResponseEntity<?> createUser(
            @RequestBody User user) {

        if (user.getUsername() == null ||
                user.getUsername().trim().isEmpty()) {

            return ResponseEntity.badRequest()
                    .body("Username is required.");
        }

        if (user.getPassword() == null ||
                user.getPassword().trim().isEmpty()) {

            return ResponseEntity.badRequest()
                    .body("Password is required.");
        }

        if (user.getRole() == null) {

            return ResponseEntity.badRequest()
                    .body("Role is required.");
        }

        if (userRepository
                .findByUsername(user.getUsername())
                .isPresent()) {

            return ResponseEntity.badRequest()
                    .body("Username already exists.");
        }

        user.setUsername(
                user.getUsername().trim()
        );

        user.setPassword(
                passwordEncoder.encode(
                        user.getPassword()
                )
        );

        User savedUser =
                userRepository.save(user);

        savedUser.setPassword(null);

        return ResponseEntity.ok(savedUser);
    }

    // DELETE USER
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(
            @PathVariable Long id) {

        if (!userRepository.existsById(id)) {

            return ResponseEntity.notFound().build();
        }

        userRepository.deleteById(id);

        return ResponseEntity.ok(
                "User deleted successfully."
        );
    }
}