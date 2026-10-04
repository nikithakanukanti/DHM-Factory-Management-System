package com.dhm.backend.service;

import com.dhm.backend.entity.Purchase;
import com.dhm.backend.entity.ReactorTiming;
import com.dhm.backend.entity.Sale;
import com.dhm.backend.entity.Vehicle;
import com.dhm.backend.repository.PurchaseRepository;
import com.dhm.backend.repository.ReactorTimingRepository;
import com.dhm.backend.repository.SaleRepository;
import com.dhm.backend.repository.VehicleRepository;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class ExcelReportService {

    private final VehicleRepository vehicleRepository;
    private final SaleRepository saleRepository;
    private final PurchaseRepository purchaseRepository;
    private final ReactorTimingRepository reactorTimingRepository;

    public ExcelReportService(
            VehicleRepository vehicleRepository,
            SaleRepository saleRepository,
            PurchaseRepository purchaseRepository,
            ReactorTimingRepository reactorTimingRepository) {

        this.vehicleRepository = vehicleRepository;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.reactorTimingRepository = reactorTimingRepository;
    }

    public byte[] generateReport() throws IOException {

        List<Vehicle> vehicles = vehicleRepository.findAll();
        List<Sale> sales = saleRepository.findAll();
        List<Purchase> purchases = purchaseRepository.findAll();
        List<ReactorTiming> reactorTimings =
                reactorTimingRepository.findAll();

        try (Workbook workbook = new XSSFWorkbook()) {

            // =========================
            // STYLES
            // =========================

            CellStyle headerStyle = workbook.createCellStyle();

            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 11);

            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(
                    IndexedColors.GREY_25_PERCENT.getIndex()
            );
            headerStyle.setFillPattern(
                    FillPatternType.SOLID_FOREGROUND
            );

            // =========================
            // SUMMARY
            // =========================

            Sheet summary = workbook.createSheet("Summary");

            Row summaryTitle = summary.createRow(0);
            summaryTitle.createCell(0).setCellValue(
                    "DHM FACTORY DIGITAL ENTRY"
            );

            Row vehicleCount = summary.createRow(2);
            vehicleCount.createCell(0).setCellValue(
                    "Total Vehicles"
            );
            vehicleCount.createCell(1).setCellValue(
                    vehicles.size()
            );

            Row salesCount = summary.createRow(3);
            salesCount.createCell(0).setCellValue(
                    "Total Sales"
            );
            salesCount.createCell(1).setCellValue(
                    sales.size()
            );

            Row purchaseCount = summary.createRow(4);
            purchaseCount.createCell(0).setCellValue(
                    "Total Purchases"
            );
            purchaseCount.createCell(1).setCellValue(
                    purchases.size()
            );

            Row reactorCount = summary.createRow(5);
            reactorCount.createCell(0).setCellValue(
                    "Reactor Records"
            );
            reactorCount.createCell(1).setCellValue(
                    reactorTimings.size()
            );

            summary.autoSizeColumn(0);
            summary.autoSizeColumn(1);

            // =========================
            // VEHICLE REGISTER
            // =========================

            Sheet vehicleSheet =
                    workbook.createSheet("Vehicle Register");

            Row vehicleHeader = vehicleSheet.createRow(0);

            String[] vehicleColumns = {
                    "Date",
                    "Vehicle No",
                    "Gross Weight",
                    "Tare Weight",
                    "Net Weight",
                    "Local",
                    "Imported",
                    "Remarks"
            };

            createHeader(
                    vehicleHeader,
                    vehicleColumns,
                    headerStyle
            );

            int vehicleRow = 1;

            for (Vehicle vehicle : vehicles) {

                Row row = vehicleSheet.createRow(vehicleRow++);

                row.createCell(0).setCellValue(
                        safe(vehicle.getDate())
                );

                row.createCell(1).setCellValue(
                        safe(vehicle.getVehicleNo())
                );

                row.createCell(2).setCellValue(
                        number(vehicle.getGrossWeight())
                );

                row.createCell(3).setCellValue(
                        number(vehicle.getTareWeight())
                );

                row.createCell(4).setCellValue(
                        number(vehicle.getNetWeight())
                );

                row.createCell(5).setCellValue(
                        safe(vehicle.isLocal())
                );

                row.createCell(6).setCellValue(
                        safe(vehicle.isImported())
                );

                row.createCell(7).setCellValue(
                        safe(vehicle.getRemarks())
                );
            }

            autoSizeColumns(vehicleSheet, vehicleColumns.length);

            // =========================
            // SALES REGISTER
            // =========================

            Sheet salesSheet =
                    workbook.createSheet("Sales Register");

            Row salesHeader = salesSheet.createRow(0);

            String[] salesColumns = {
                    "Date",
                    "Vehicle No",
                    "Gross Weight",
                    "Tare Weight",
                    "Net Weight",
                    "Commodity",
                    "Remarks"
            };

            createHeader(
                    salesHeader,
                    salesColumns,
                    headerStyle
            );

            int salesRow = 1;

            for (Sale sale : sales) {

                Row row = salesSheet.createRow(salesRow++);

                row.createCell(0).setCellValue(
                        safe(sale.getDate())
                );

                row.createCell(1).setCellValue(
                        safe(sale.getVehicleNo())
                );

                row.createCell(2).setCellValue(
                        number(sale.getGrossWeight())
                );

                row.createCell(3).setCellValue(
                        number(sale.getTareWeight())
                );

                row.createCell(4).setCellValue(
                        number(sale.getNetWeight())
                );

                row.createCell(5).setCellValue(
                        safe(sale.getCommodity())
                );

                row.createCell(6).setCellValue(
                        safe(sale.getRemarks())
                );
            }

            autoSizeColumns(salesSheet, salesColumns.length);

            // =========================
            // PURCHASE REGISTER
            // =========================

            Sheet purchaseSheet =
                    workbook.createSheet("Purchase Register");

            Row purchaseHeader =
                    purchaseSheet.createRow(0);

            String[] purchaseColumns = {
                    "Date",
                    "Net Weight",
                    "Commodity",
                    "Remarks"
            };

            createHeader(
                    purchaseHeader,
                    purchaseColumns,
                    headerStyle
            );

            int purchaseRow = 1;

            for (Purchase purchase : purchases) {

                Row row =
                        purchaseSheet.createRow(purchaseRow++);

                row.createCell(0).setCellValue(
                        safe(purchase.getDate())
                );

                row.createCell(1).setCellValue(
                        number(purchase.getNetWeight())
                );

                row.createCell(2).setCellValue(
                        safe(purchase.getCommodity())
                );

                row.createCell(3).setCellValue(
                        safe(purchase.getRemarks())
                );
            }

            autoSizeColumns(
                    purchaseSheet,
                    purchaseColumns.length
            );

            // =========================
            // REACTOR TIMING
            // =========================

            Sheet reactorSheet =
                    workbook.createSheet("Reactor Timing");

            Row reactorHeader =
                    reactorSheet.createRow(0);

            String[] reactorColumns = {
                    "Date",
                    "Reactor 1 Time",
                    "Reactor 2 Time"
            };

            createHeader(
                    reactorHeader,
                    reactorColumns,
                    headerStyle
            );

            int reactorRow = 1;

            for (ReactorTiming timing : reactorTimings) {

                Row row =
                        reactorSheet.createRow(reactorRow++);

                row.createCell(0).setCellValue(
                        safe(timing.getDate())
                );

                row.createCell(1).setCellValue(
                        safe(timing.getReactor1Time())
                );

                row.createCell(2).setCellValue(
                        safe(timing.getReactor2Time())
                );

                
            }

            autoSizeColumns(
                    reactorSheet,
                    reactorColumns.length
            );

            // =========================
            // RETURN EXCEL FILE
            // =========================

            ByteArrayOutputStream outputStream =
                    new ByteArrayOutputStream();

            workbook.write(outputStream);

            return outputStream.toByteArray();
        }
    }

    private void createHeader(
            Row row,
            String[] columns,
            CellStyle style) {

        for (int i = 0; i < columns.length; i++) {

            Cell cell = row.createCell(i);

            cell.setCellValue(columns[i]);
            cell.setCellStyle(style);
        }
    }

    private void autoSizeColumns(
            Sheet sheet,
            int columnCount) {

        for (int i = 0; i < columnCount; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private String safe(Object value) {

        return value == null
                ? ""
                : value.toString();
    }

    private double number(Number value) {

        return value == null
                ? 0
                : value.doubleValue();
    }
}