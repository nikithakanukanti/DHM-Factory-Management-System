package com.dhm.backend.config;

import com.dhm.backend.entity.User;
import com.dhm.backend.repository.UserRepo;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class ClientPermissionFilter extends OncePerRequestFilter {

    private final UserRepo userRepository;

    public ClientPermissionFilter(UserRepo userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean isClient = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_CLIENT".equals(a.getAuthority()));
        if (!isClient) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        String requiredModule = requiredModuleForPath(path);
        if (requiredModule == null) {
            filterChain.doFilter(request, response);
            return;
        }

        // Clients are read-only for permitted business modules (records/reports visibility only)
        String method = request.getMethod();
        boolean readOnlyMethod = "GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method);
        if (!readOnlyMethod) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Client accounts have read-only access to permitted modules.\"}");
            return;
        }

        Optional<User> userOpt = userRepository.findByUsername(authentication.getName());
        if (userOpt.isEmpty() || !userOpt.get().isActive()) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Access denied.\"}");
            return;
        }

        Set<String> permitted = Arrays.stream(
                        Optional.ofNullable(userOpt.get().getPermittedModules()).orElse("")
                                .split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toUpperCase)
                .collect(Collectors.toSet());

        // Compatibility aliases: customers/suppliers historically tied to sales/purchases in UI configs.
        boolean allowed = permitted.contains(requiredModule);
        if (!allowed) {
            if ("CUSTOMERS".equals(requiredModule)) allowed = permitted.contains("SALES");
            if ("SUPPLIERS".equals(requiredModule)) allowed = permitted.contains("PURCHASES");
            if ("ATTENDANCE".equals(requiredModule)) allowed = permitted.contains("EMPLOYEES");
            if ("SALES".equals(requiredModule)) allowed = permitted.contains("CUSTOMERS");
            if ("PURCHASES".equals(requiredModule)) allowed = permitted.contains("SUPPLIERS");
            if ("EMPLOYEES".equals(requiredModule)) allowed = permitted.contains("ATTENDANCE");
        }

        if (!allowed) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"You do not have permission to access this module.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String requiredModuleForPath(String path) {
        if (path == null) return null;
        // Allow auth/self endpoints for authenticated clients
        if (path.startsWith("/api/auth/me") || path.startsWith("/api/auth/change-password")) return null;

        if (path.startsWith("/api/dashboard")) return "DASHBOARD";
        if (path.startsWith("/api/reports")) return "REPORTS";

        if (path.startsWith("/api/vehicles")) return "VEHICLES";

        if (path.startsWith("/api/sales")) return "SALES";
        if (path.startsWith("/api/customers")) return "CUSTOMERS";

        if (path.startsWith("/api/purchases")) return "PURCHASES";
        if (path.startsWith("/api/suppliers")) return "SUPPLIERS";

        if (path.startsWith("/api/inventory")) return "INVENTORY";
        if (path.startsWith("/api/payments")) return "PAYMENTS";
        if (path.startsWith("/api/reactor-timings")) return "REACTOR";
        if (path.startsWith("/api/employees")) return "EMPLOYEES";
        if (path.startsWith("/api/attendance")) return "ATTENDANCE";
        if (path.startsWith("/api/notifications")) return "NOTIFICATIONS";

        // Users/audit/settings are admin-only by SecurityConfig; no client module mapping.
        return null;
    }
}
