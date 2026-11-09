package com.dhm.backend.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.*;

@Entity
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "vehicle_no", nullable = false)
    private String vehicleNo;

    @Column(name = "gross_weight", precision = 10, scale = 2)
    private BigDecimal grossWeight;

    @Column(name = "tare_weight", precision = 10, scale = 2)
    private BigDecimal tareWeight;

    @Column(name = "commodity")
    private String commodity;

    private boolean local;

    private boolean imported;

    private String remarks;

    @Column(name = "register_type")
    private String registerType; // "SALES", "PURCHASE", or "NONE"

    // Driver & Vehicle Profile
    @Column(name = "driver_name")
    private String driverName;

    @Column(name = "driver_contact")
    private String driverContact;

    @Column(name = "vehicle_type")
    private String vehicleType; // Truck, Trailer, Tanker, Tractor, Pickup, Other

    @Column(name = "inward_outward")
    private String inwardOutward = "INWARD"; // INWARD, OUTWARD

    @Column(name = "entry_time")
    private String entryTime;

    @Column(name = "exit_time")
    private String exitTime;

    private String purpose;

    @Column(name = "party_name")
    private String partyName; // Customer or Supplier

    // GPS Geolocation Details
    private Double latitude;

    private Double longitude;

    @Column(name = "location_address")
    private String locationAddress;

    @Column(name = "is_inside_geofence")
    private Boolean insideGeofence;

    // Geolocation Camera Snapshot (Base64 JPEG with stamped coordinates)
    @Lob
    @Column(name = "photo_data", columnDefinition = "LONGTEXT")
    private String photoData;

    @Column(nullable = false)
    private String status = "INSIDE"; // INSIDE, EXITED

    public Vehicle() {
    }

    public Long getId() {
        return id;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getVehicleNo() {
        return vehicleNo;
    }

    public void setVehicleNo(String vehicleNo) {
        this.vehicleNo = vehicleNo;
    }

    public BigDecimal getGrossWeight() {
        return grossWeight;
    }

    public void setGrossWeight(BigDecimal grossWeight) {
        this.grossWeight = grossWeight;
    }

    public BigDecimal getTareWeight() {
        return tareWeight;
    }

    public void setTareWeight(BigDecimal tareWeight) {
        this.tareWeight = tareWeight;
    }

    @Transient
    public BigDecimal getNetWeight() {
        if (grossWeight == null || tareWeight == null) {
            return null;
        }
        return grossWeight.subtract(tareWeight);
    }

    public boolean isLocal() {
        return local;
    }

    public void setLocal(boolean local) {
        this.local = local;
    }

    public boolean isImported() {
        return imported;
    }

    public void setImported(boolean imported) {
        this.imported = imported;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public String getCommodity() {
        return commodity;
    }

    public void setCommodity(String commodity) {
        this.commodity = commodity;
    }

    public String getRegisterType() {
        return registerType;
    }

    public void setRegisterType(String registerType) {
        this.registerType = registerType;
    }

    public String getDriverName() {
        return driverName;
    }

    public void setDriverName(String driverName) {
        this.driverName = driverName;
    }

    public String getDriverContact() {
        return driverContact;
    }

    public void setDriverContact(String driverContact) {
        this.driverContact = driverContact;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public String getInwardOutward() {
        return inwardOutward;
    }

    public void setInwardOutward(String inwardOutward) {
        this.inwardOutward = inwardOutward;
    }

    public String getEntryTime() {
        return entryTime;
    }

    public void setEntryTime(String entryTime) {
        this.entryTime = entryTime;
    }

    public String getExitTime() {
        return exitTime;
    }

    public void setExitTime(String exitTime) {
        this.exitTime = exitTime;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }

    public String getPartyName() {
        return partyName;
    }

    public void setPartyName(String partyName) {
        this.partyName = partyName;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getLocationAddress() {
        return locationAddress;
    }

    public void setLocationAddress(String locationAddress) {
        this.locationAddress = locationAddress;
    }

    public Boolean getInsideGeofence() {
        return insideGeofence;
    }

    public void setInsideGeofence(Boolean insideGeofence) {
        this.insideGeofence = insideGeofence;
    }

    public String getPhotoData() {
        return photoData;
    }

    public void setPhotoData(String photoData) {
        this.photoData = photoData;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
