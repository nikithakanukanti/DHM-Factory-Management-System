package com.dhm.backend.service;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class RecordAccessService {

    public static final ZoneId FACTORY_ZONE = ZoneId.of("Asia/Kolkata");

    /**
     * Admin can always edit/delete any record.
     * Supervisor can edit/delete their own records ONLY on the same day (until 11:59:59 PM IST).
     * Client accounts cannot modify records (read-only by default).
     */
    public boolean canModify(LocalDate recordDate, String createdBy, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        boolean isAdmin = authentication.getAuthorities()
                .stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));

        if (isAdmin) {
            return true;
        }

        boolean isSupervisor = authentication.getAuthorities()
                .stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_SUPERVISOR"));

        if (isSupervisor) {
            LocalDate todayInFactory = LocalDate.now(FACTORY_ZONE);
            boolean isSameDay = todayInFactory.equals(recordDate);
            if (!isSameDay) {
                return false;
            }

            // Supervisor can only edit their own records if createdBy is recorded
            String currentUsername = authentication.getName();
            if (createdBy != null && !createdBy.trim().isEmpty()) {
                return createdBy.equalsIgnoreCase(currentUsername);
            }

            // Legacy records without createdBy can be edited on same day by shift supervisor
            return true;
        }

        return false;
    }

    /**
     * Backwards-compatible overload for existing calls.
     */
    public boolean canModify(LocalDate recordDate, Authentication authentication) {
        return canModify(recordDate, null, authentication);
    }

    /**
     * Helper to verify if user has Admin privileges
     */
    public boolean isAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities()
                .stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
    }
}
