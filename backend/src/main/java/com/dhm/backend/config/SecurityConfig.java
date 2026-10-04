package com.dhm.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
            .csrf(csrf -> csrf.disable())

            .cors(cors -> {})

            .authorizeHttpRequests(auth -> auth
    .requestMatchers("/login").permitAll()

    .requestMatchers("/api/auth/me").authenticated()

    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .requestMatchers("/api/reports/**").hasRole("ADMIN")
    .requestMatchers("/api/dashboard/**").hasRole("ADMIN")
    .requestMatchers("/api/users/**").hasRole("ADMIN")

    .requestMatchers("/api/vehicles/**")
        .hasAnyRole("ADMIN", "SUPERVISOR")

    .requestMatchers("/api/sales/**")
        .hasAnyRole("ADMIN", "SUPERVISOR")

    .requestMatchers("/api/purchases/**")
        .hasAnyRole("ADMIN", "SUPERVISOR")

    .requestMatchers("/api/reactor-timings/**")
        .hasAnyRole("ADMIN", "SUPERVISOR")

    .anyRequest().authenticated()
)

            .formLogin(form -> form
                .loginPage("/login")

                .successHandler((request, response, authentication) -> {
                    response.setStatus(200);
                })

                .failureHandler((request, response, exception) -> {
                    response.setStatus(401);
                })

                .permitAll()
            )

            .logout(logout -> logout
                .logoutUrl("/logout")

                .logoutSuccessHandler((request, response, authentication) -> {
                    response.setStatus(200);
                })

                .permitAll()
            );

        return http.build();
    }
}