package com.dhm.backend.controller;

import com.dhm.backend.service.ExcelReportService;
import com.dhm.backend.service.PdfReportService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<byte[]> exportExcel() {

        try {

            byte[] excelFile =
                    excelReportService.generateReport();

            return ResponseEntity.ok()
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=DHM_Report.xlsx"
                    )
                    .contentType(
                            MediaType.parseMediaType(
                                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            )
                    )
                    .body(excelFile);

        } catch (Exception e) {

            return ResponseEntity
                    .internalServerError()
                    .build();
        }
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf() {

        try {

            byte[] pdfFile =
                    pdfReportService.generateReport();

            return ResponseEntity.ok()
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=DHM_Report.pdf"
                    )
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfFile);

        } catch (Exception e) {

            return ResponseEntity
                    .internalServerError()
                    .build();
        }
    }
}