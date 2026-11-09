package com.dhm.backend.service;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class RecordAccessService {

    private static final ZoneId FACTORY_ZONE = ZoneId.of("Asia/Kolkata");

    /**
     * Admin can always edit/delete.
     * Supervisor can edit/delete only today's records (in Factory Timezone: Asia/Kolkata).
     */
    public boolean canModify(LocalDate recordDate,
                             Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        boolean isAdmin = authentication.getAuthorities()
                .stream()
                .anyMatch(authority ->
                        authority.getAuthority().equals("ROLE_ADMIN"));

        if (isAdmin) {
            return true;
        }

        boolean isSupervisor = authentication.getAuthorities()
                .stream()
                .anyMatch(authority ->
                        authority.getAuthority().equals("ROLE_SUPERVISOR"));

        if (isSupervisor) {
            LocalDate todayInFactory = LocalDate.now(FACTORY_ZONE);
            return todayInFactory.equals(recordDate);
        }

        return false;
    }
}
