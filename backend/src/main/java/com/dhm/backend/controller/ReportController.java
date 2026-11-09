package com.dhm.backend.controller;

import com.dhm.backend.service.ExcelReportService;
import com.dhm.backend.service.PdfReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ExcelReportService excelReportService;
    private final PdfReportService pdfReportService;

    public ReportController(
            ExcelReportService excelReportService,
            PdfReportService pdfReportService) {

        this.excelReportService = excelReportService;
        this.pdfReportService = pdfReportService;
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        try {
            byte[] excelFile = excelReportService.generateReport(from, to);

            String filename = "DHM_Report.xlsx";
            if (from != null && to != null) {
                filename = "DHM_Report_" + from + "_to_" + to + ".xlsx";
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelFile);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        try {
            byte[] pdfFile = pdfReportService.generateReport(from, to);

            String filename = "DHM_Report.pdf";
            if (from != null && to != null) {
                filename = "DHM_Report_" + from + "_to_" + to + ".pdf";
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfFile);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
