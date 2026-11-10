package com.dhm.backend.config;

import com.dhm.backend.entity.*;
import com.dhm.backend.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner createUsers(
            UserRepo userRepository,
            PasswordEncoder passwordEncoder,
            AppSettingRepository settingRepository,
            ItemRepository itemRepository,
            NotificationRepository notificationRepository) {

        return args -> {

            // 1. ADMIN USER
            if (userRepository.findByUsername("admin").isEmpty()) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("Admin@123"));
                admin.setRole(Role.ADMIN);
                userRepository.save(admin);
            }

            // 2. SUPERVISOR USER
            if (userRepository.findByUsername("supervisor").isEmpty()) {
                User supervisor = new User();
                supervisor.setUsername("supervisor");
                supervisor.setPassword(passwordEncoder.encode("Supervisor@123"));
                supervisor.setRole(Role.SUPERVISOR);
                supervisor.setFullName("Plant Supervisor");
                userRepository.save(supervisor);
            }

            // 3. CLIENT USER
            if (userRepository.findByUsername("client").isEmpty()) {
                User client = new User();
                client.setUsername("client");
                client.setPassword(passwordEncoder.encode("Client@123"));
                client.setRole(Role.CLIENT);
                client.setFullName("Enterprise Client");
                client.setPermittedModules("DASHBOARD,REPORTS");
                userRepository.save(client);
            }

            // 3. DEFAULT FACTORY & APP SETTINGS
            initSetting(settingRepository, "factory_name", "DHM Pyrotech Enterprises", "Company Brand Name");
            initSetting(settingRepository, "factory_address", "Plot No. 12, MIDC Industrial Area, Maharashtra, India", "Factory Physical Address");
            initSetting(settingRepository, "factory_latitude", "18.5204", "Factory GPS Latitude");
            initSetting(settingRepository, "factory_longitude", "73.8567", "Factory GPS Longitude");
            initSetting(settingRepository, "factory_geofence_meters", "500", "Authorized Factory Geofence Boundary in Meters");
            initSetting(settingRepository, "default_tax_rate", "18", "Standard GST Tax Rate (%)");
            initSetting(settingRepository, "invoice_prefix", "DHM-INV-", "Tax Invoice Serial Prefix");

            // 4. DEFAULT INVENTORY ITEMS (Pyrolysis & Tyres)
            if (itemRepository.count() == 0) {
                createItem(itemRepository, "ITM-001", "Local Waste Rubber Tyre", "RAW_MATERIAL", "KG", new BigDecimal("12500"), new BigDecimal("2000"), new BigDecimal("18.50"));
                createItem(itemRepository, "ITM-002", "Imported Waste Rubber Tyre", "RAW_MATERIAL", "KG", new BigDecimal("24000"), new BigDecimal("3000"), new BigDecimal("22.00"));
                createItem(itemRepository, "ITM-003", "Fuel Oil", "FINISHED_GOODS", "LITRE", new BigDecimal("8500"), new BigDecimal("1000"), new BigDecimal("55.00"));
                createItem(itemRepository, "ITM-004", "Carbon Black Powder", "FINISHED_GOODS", "KG", new BigDecimal("16000"), new BigDecimal("1500"), new BigDecimal("32.00"));
                createItem(itemRepository, "ITM-005", "Metal Steel Scrap", "SCRAP", "KG", new BigDecimal("6200"), new BigDecimal("800"), new BigDecimal("28.00"));
            }

            // 5. WELCOME NOTIFICATION
            if (notificationRepository.count() == 0) {
                Notification welcome = new Notification(
                        "System Initialized",
                        "DHM Factory Management System is online with GPS Weighbridge, Master Registers, and Live Reports.",
                        "SUCCESS",
                        "SYSTEM"
                );
                notificationRepository.save(welcome);
            }
        };
    }

    private void initSetting(AppSettingRepository repo, String key, String value, String desc) {
        if (repo.findBySettingKey(key).isEmpty()) {
            repo.save(new AppSetting(key, value, desc));
        }
    }

    private void createItem(ItemRepository repo, String code, String name, String category, String unit, BigDecimal stock, BigDecimal minAlert, BigDecimal price) {
        Item item = new Item();
        item.setItemCode(code);
        item.setName(name);
        item.setCategory(category);
        item.setUnit(unit);
        item.setCurrentStock(stock);
        item.setMinStockAlert(minAlert);
        item.setUnitPrice(price);
        item.setCreatedAt(LocalDate.now());
        repo.save(item);
    }
}
