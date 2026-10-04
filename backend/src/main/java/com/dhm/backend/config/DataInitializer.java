package com.dhm.backend.config;

import com.dhm.backend.entity.Role;
import com.dhm.backend.entity.User;
import com.dhm.backend.repository.UserRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner createUsers(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        return args -> {

            // ADMIN
            if (userRepository.findByUsername("admin").isEmpty()) {

                User admin = new User();

                admin.setUsername("admin");
                admin.setPassword(
                        passwordEncoder.encode("Admin@123")
                );
                admin.setRole(Role.ADMIN);

                userRepository.save(admin);
            }

            // SUPERVISOR
            if (userRepository.findByUsername("supervisor").isEmpty()) {

                User supervisor = new User();

                supervisor.setUsername("supervisor");
                supervisor.setPassword(
                        passwordEncoder.encode("Supervisor@123")
                );
                supervisor.setRole(Role.SUPERVISOR);

                userRepository.save(supervisor);
            }
        };
    }
}