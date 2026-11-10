package com.dhm.backend.service;

import com.dhm.backend.entity.AppSetting;
import com.dhm.backend.repository.AppSettingRepository;
import org.springframework.stereotype.Service;

@Service
public class GeofenceService {

    private final AppSettingRepository settingRepository;

    // Default factory coordinates (Pune/Maharashtra industrial MIDC region)
    private static final double DEFAULT_FACTORY_LAT = 18.5204;
    private static final double DEFAULT_FACTORY_LON = 73.8567;
    private static final double DEFAULT_RADIUS_METERS = 500.0;

    public GeofenceService(AppSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    public double getFactoryLatitude() {
        return settingRepository.findBySettingKey("factory_latitude")
                .map(AppSetting::getSettingValue)
                .map(Double::parseDouble)
                .orElse(DEFAULT_FACTORY_LAT);
    }

    public double getFactoryLongitude() {
        return settingRepository.findBySettingKey("factory_longitude")
                .map(AppSetting::getSettingValue)
                .map(Double::parseDouble)
                .orElse(DEFAULT_FACTORY_LON);
    }

    public double getGeofenceRadiusMeters() {
        return settingRepository.findBySettingKey("factory_geofence_meters")
                .map(AppSetting::getSettingValue)
                .map(Double::parseDouble)
                .orElse(DEFAULT_RADIUS_METERS);
    }

    /**
     * Determines whether the given coordinates fall within the factory geofence circle.
     */
    public boolean isInsideGeofence(Double lat, Double lon) {
        if (lat == null || lon == null) {
            return false;
        }

        double factoryLat = getFactoryLatitude();
        double factoryLon = getFactoryLongitude();
        double allowedRadius = getGeofenceRadiusMeters();

        double distanceMeters = calculateDistanceMeters(lat, lon, factoryLat, factoryLon);
        return distanceMeters <= allowedRadius;
    }

    /**
     * Haversine formula for distance between two points on Earth in meters.
     */
    public double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // Earth's radius in meters

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
