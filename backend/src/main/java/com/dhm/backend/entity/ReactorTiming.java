package com.dhm.backend.entity;

import jakarta.persistence.*;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "reactor_timings")
public class ReactorTiming {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    // Legacy fields retained for backward compatibility
    @Column(name = "reactor_1_time")
    private LocalTime reactor1Time;

    @Column(name = "reactor_2_time")
    private LocalTime reactor2Time;

    @Column(name = "operator_name")
    private String operatorName;

    private String shift = "SHIFT_A"; // SHIFT_A, SHIFT_B, NIGHT_SHIFT

    @Column(name = "batch_no")
    private String batchNo;

    private String remarks;

    // New/required operational fields
    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "responsible_user")
    private String responsibleUser;

    @Column(name = "related_transaction_type")
    private String relatedTransactionType;

    @Column(name = "related_transaction_id")
    private Long relatedTransactionId;

    @Column(name = "created_by")
    private String createdBy;

    public ReactorTiming() {
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

    public LocalTime getReactor1Time() {
        return reactor1Time;
    }

    public void setReactor1Time(LocalTime reactor1Time) {
        this.reactor1Time = reactor1Time;
        if (this.startTime == null) {
            this.startTime = reactor1Time;
        }
    }

    public LocalTime getReactor2Time() {
        return reactor2Time;
    }

    public void setReactor2Time(LocalTime reactor2Time) {
        this.reactor2Time = reactor2Time;
        if (this.endTime == null) {
            this.endTime = reactor2Time;
        }
    }

    public String getOperatorName() {
        return operatorName;
    }

    public void setOperatorName(String operatorName) {
        this.operatorName = operatorName;
        if (this.responsibleUser == null || this.responsibleUser.trim().isEmpty()) {
            this.responsibleUser = operatorName;
        }
    }

    public String getShift() {
        return shift;
    }

    public void setShift(String shift) {
        this.shift = shift;
    }

    public String getBatchNo() {
        return batchNo;
    }

    public void setBatchNo(String batchNo) {
        this.batchNo = batchNo;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public LocalTime getStartTime() {
        return startTime != null ? startTime : reactor1Time;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
        if (startTime != null) {
            this.reactor1Time = startTime;
        }
    }

    public LocalTime getEndTime() {
        return endTime != null ? endTime : reactor2Time;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
        if (endTime != null) {
            this.reactor2Time = endTime;
        }
    }

    public String getResponsibleUser() {
        if (responsibleUser != null && !responsibleUser.trim().isEmpty()) return responsibleUser;
        return operatorName;
    }

    public void setResponsibleUser(String responsibleUser) {
        this.responsibleUser = responsibleUser;
        if ((this.operatorName == null || this.operatorName.trim().isEmpty()) && responsibleUser != null) {
            this.operatorName = responsibleUser;
        }
    }

    public String getRelatedTransactionType() {
        return relatedTransactionType;
    }

    public void setRelatedTransactionType(String relatedTransactionType) {
        this.relatedTransactionType = relatedTransactionType;
    }

    public Long getRelatedTransactionId() {
        return relatedTransactionId;
    }

    public void setRelatedTransactionId(Long relatedTransactionId) {
        this.relatedTransactionId = relatedTransactionId;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
        if ((this.responsibleUser == null || this.responsibleUser.trim().isEmpty()) && createdBy != null) {
            this.responsibleUser = createdBy;
        }
    }

    @Transient
    public Long getDurationMinutes() {
        LocalTime start = getStartTime();
        LocalTime end = getEndTime();
        if (start == null || end == null) return null;
        long mins = Duration.between(start, end).toMinutes();
        // If end is past midnight relative to start, treat as next-day duration for operational logging
        if (mins < 0) mins += 24 * 60;
        return mins;
    }

    @Transient
    public String getDurationText() {
        Long mins = getDurationMinutes();
        if (mins == null) return null;
        long h = mins / 60;
        long m = mins % 60;
        return String.format("%02d:%02d", h, m);
    }
}
