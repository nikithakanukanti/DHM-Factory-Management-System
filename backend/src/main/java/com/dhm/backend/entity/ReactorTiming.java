package com.dhm.backend.entity;

import jakarta.persistence.*;
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
    }

    public LocalTime getReactor2Time() {
        return reactor2Time;
    }

    public void setReactor2Time(LocalTime reactor2Time) {
        this.reactor2Time = reactor2Time;
    }

    public String getOperatorName() {
        return operatorName;
    }

    public void setOperatorName(String operatorName) {
        this.operatorName = operatorName;
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
}
