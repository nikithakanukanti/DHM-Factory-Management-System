package com.dhm.backend.service;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class RecordAccessService {

    /**
     * Admin can always edit/delete.
     * Supervisor can edit/delete only today's records.
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
            return LocalDate.now().equals(recordDate);
        }

        return false;
    }
}
