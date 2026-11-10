package com.dhm.backend.service;

import com.dhm.backend.entity.Notification;
import com.dhm.backend.repository.NotificationRepository;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public void notify(String title, String message, String type, String module) {
        try {
            Notification notification = new Notification(title, message, type, module);
            notificationRepository.save(notification);
        } catch (Exception e) {
            System.err.println("Notification error: " + e.getMessage());
        }
    }
}
