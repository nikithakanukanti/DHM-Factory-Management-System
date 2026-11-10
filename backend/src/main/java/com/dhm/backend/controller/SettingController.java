package com.dhm.backend.controller;

import com.dhm.backend.entity.AppSetting;
import com.dhm.backend.repository.AppSettingRepository;
import com.dhm.backend.service.AuditLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingController {

    private final AppSettingRepository settingRepository;
    private final AuditLogService auditLogService;

    public SettingController(AppSettingRepository settingRepository, AuditLogService auditLogService) {
        this.settingRepository = settingRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public Map<String, String> getAllSettings() {
        Map<String, String> settings = new HashMap<>();
        for (AppSetting s : settingRepository.findAll()) {
            settings.put(s.getSettingKey(), s.getSettingValue());
        }
        return settings;
    }

    @PutMapping
    public ResponseEntity<?> updateSettings(@RequestBody Map<String, String> updates, Authentication authentication) {
        if (updates == null || updates.isEmpty()) {
            return ResponseEntity.badRequest().body("No settings provided.");
        }

        Map<String, String> oldValues = new HashMap<>();
        for (Map.Entry<String, String> entry : updates.entrySet()) {
            AppSetting setting = settingRepository.findBySettingKey(entry.getKey())
                    .orElseGet(() -> {
                        AppSetting s = new AppSetting();
                        s.setSettingKey(entry.getKey());
                        return s;
                    });
            oldValues.put(entry.getKey(), setting.getSettingValue());
            setting.setSettingValue(entry.getValue());
            settingRepository.save(setting);
        }

        String username = authentication != null ? authentication.getName() : "System";
        auditLogService.log(username, "UPDATE", "SETTINGS", null, "Application and Factory settings updated.", oldValues.toString(), updates.toString());
        return ResponseEntity.ok(Map.of("message", "Settings updated successfully."));
    }
}
