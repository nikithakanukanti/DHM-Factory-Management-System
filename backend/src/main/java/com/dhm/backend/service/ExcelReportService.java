package com.dhm.backend.service;

import com.dhm.backend.entity.*;
import com.dhm.backend.repository.*;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ExcelReportService {

    private final VehicleRepository vehicleRepository;
    private final SaleRepository saleRepository;
    private final PurchaseRepository purchaseRepository;
    private final ReactorTimingRepository reactorTimingRepository;
    private final ItemRepository itemRepository;
    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final AuditLogRepository auditLogRepository;
    private final AppSettingRepository appSettingRepository;

    public ExcelReportService(
            VehicleRepository vehicleRepository,
            SaleRepository saleRepository,
            PurchaseRepository purchaseRepository,
            ReactorTimingRepository reactorTimingRepository,
            ItemRepository itemRepository,
            PaymentRepository paymentRepository,
            CustomerRepository customerRepository,
            SupplierRepository supplierRepository,
            EmployeeRepository employeeRepository,
            AttendanceRepository attendanceRepository,
            AuditLogRepository auditLogRepository,
            AppSettingRepository appSettingRepository) {

        this.vehicleRepository = vehicleRepository;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.reactorTimingRepository = reactorTimingRepository;
        this.itemRepository = itemRepository;
        this.paymentRepository = paymentRepository;
        this.customerRepository = customerRepository;
        this.supplierRepository = supplierRepository;
        this.employeeRepository = employeeRepository;
        this.attendanceRepository = attendanceRepository;
        this.auditLogRepository = auditLogRepository;
        this.appSettingRepository = appSettingRepository;
    }

    public byte[] generateReport(LocalDate from, LocalDate to) throws IOException {
        List<Vehicle> vehicles = filterByDate(vehicleRepository.findAll(), v -> v.getDate(), from, to);
        List<Sale> sales = filterByDate(saleRepository.findAll(), s -> s.getDate(), from, to);
        List<Purchase> purchases = filterByDate(purchaseRepository.findAll(), p -> p.getDate(), from, to);
        List<ReactorTiming> reactorTimings = filterByDate(reactorTimingRepository.findAll(), r -> r.getDate(), from, to);
        List<Payment> payments = filterByDate(paymentRepository.findAll(), p -> p.getPaymentDate(), from, to);
        List<Attendance> attendance = filterByDate(attendanceRepository.findAll(), a -> a.getDate(), from, to);
        List<AuditLog> auditLogs = filterByDateTime(auditLogRepository.findAll(), a -> a.getTimestamp(), from, to);

        // Master/reference data (date-range independent but included for reporting)
        List<Item> items = itemRepository.findAll();
        List<Customer> customers = customerRepository.findAll();
        List<Supplier> suppliers = supplierRepository.findAll();
        List<Employee> employees = employeeRepository.findAll();

        String companyName = appSettingRepository.findBySettingKey("factory_name")
                .map(AppSetting::getSettingValue).orElse("DHM Pyrotech Enterprises");

        try (Workbook workbook = new XSSFWorkbook()) {
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 11);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Summary
            Sheet summary = workbook.createSheet("Summary");
            int sr = 0;
            Row t = summary.createRow(sr++); t.createCell(0).setCellValue(companyName + " - Factory Management Report");
            Row d = summary.createRow(sr++); d.createCell(0).setCellValue("Date Range: " + rangeText(from, to));
            sr++;
            addSummaryRow(summary, sr++, "Vehicles", vehicles.size());
            addSummaryRow(summary, sr++, "Sales", sales.size());
            addSummaryRow(summary, sr++, "Purchases", purchases.size());
            addSummaryRow(summary, sr++, "Reactor Timings", reactorTimings.size());
            addSummaryRow(summary, sr++, "Payments", payments.size());
            addSummaryRow(summary, sr++, "Inventory Items", items.size());
            addSummaryRow(summary, sr++, "Customers", customers.size());
            addSummaryRow(summary, sr++, "Suppliers", suppliers.size());
            addSummaryRow(summary, sr++, "Employees", employees.size());
            addSummaryRow(summary, sr++, "Attendance Records", attendance.size());
            addSummaryRow(summary, sr++, "Audit Logs", auditLogs.size());
            summary.autoSizeColumn(0); summary.autoSizeColumn(1);

            // Vehicles
            Sheet vehicleSheet = workbook.createSheet("Vehicles");
            String[] vehicleCols = {"Date","Vehicle No","Driver","Contact","Type","Party","Purpose","Gross KG","Tare KG","Net KG","Register","Commodity","Status","GPS","Geofence","Created By","Remarks"};
            createHeader(vehicleSheet.createRow(0), vehicleCols, headerStyle);
            int r = 1;
            for (Vehicle v : vehicles) {
                Row row = vehicleSheet.createRow(r++);
                int c = 0;
                row.createCell(c++).setCellValue(safe(v.getDate()));
                row.createCell(c++).setCellValue(safe(v.getVehicleNo()));
                row.createCell(c++).setCellValue(safe(v.getDriverName()));
                row.createCell(c++).setCellValue(safe(v.getDriverContact()));
                row.createCell(c++).setCellValue(safe(v.getVehicleType()));
                row.createCell(c++).setCellValue(safe(v.getPartyName()));
                row.createCell(c++).setCellValue(safe(v.getPurpose()));
                row.createCell(c++).setCellValue(number(v.getGrossWeight()));
                row.createCell(c++).setCellValue(number(v.getTareWeight()));
                row.createCell(c++).setCellValue(number(v.getNetWeight()));
                row.createCell(c++).setCellValue(safe(v.getRegisterType()));
                row.createCell(c++).setCellValue(safe(v.getCommodity()));
                row.createCell(c++).setCellValue(safe(v.getStatus()));
                row.createCell(c++).setCellValue(v.getLatitude() != null && v.getLongitude() != null ? v.getLatitude() + "," + v.getLongitude() : "");
                row.createCell(c++).setCellValue(v.getInsideGeofence() == null ? "" : (v.getInsideGeofence() ? "INSIDE" : "OUTSIDE"));
                row.createCell(c++).setCellValue(safe(v.getCreatedBy()));
                row.createCell(c++).setCellValue(safe(v.getRemarks()));
            }
            autoSizeColumns(vehicleSheet, vehicleCols.length);

            // Sales
            Sheet salesSheet = workbook.createSheet("Sales");
            String[] salesCols = {"Date","Invoice No","Vehicle No","Customer","Commodity","Net KG","Unit Price","Subtotal","Tax","Grand Total","Paid","Payment Status","Created By","Remarks"};
            createHeader(salesSheet.createRow(0), salesCols, headerStyle);
            r = 1;
            for (Sale s : sales) {
                Row row = salesSheet.createRow(r++);
                int c = 0;
                row.createCell(c++).setCellValue(safe(s.getDate()));
                row.createCell(c++).setCellValue(safe(s.getInvoiceNo()));
                row.createCell(c++).setCellValue(safe(s.getVehicleNo()));
                row.createCell(c++).setCellValue(safe(s.getCustomerName()));
                row.createCell(c++).setCellValue(safe(s.getCommodity()));
                row.createCell(c++).setCellValue(number(s.getNetWeight()));
                row.createCell(c++).setCellValue(number(s.getUnitPrice()));
                row.createCell(c++).setCellValue(number(s.getSubtotal()));
                row.createCell(c++).setCellValue(number(s.getTaxAmount()));
                row.createCell(c++).setCellValue(number(s.getGrandTotal()));
                row.createCell(c++).setCellValue(number(s.getPaidAmount()));
                row.createCell(c++).setCellValue(safe(s.getPaymentStatus()));
                row.createCell(c++).setCellValue(safe(s.getCreatedBy()));
                row.createCell(c++).setCellValue(safe(s.getRemarks()));
            }
            autoSizeColumns(salesSheet, salesCols.length);

            // Purchases
            Sheet purchaseSheet = workbook.createSheet("Purchases");
            String[] purchaseCols = {"Date","PO No","Supplier Invoice","Vehicle No","Supplier","Commodity","Net KG","Unit Price","Subtotal","Tax","Grand Total","Paid","Payment Status","Created By","Remarks"};
            createHeader(purchaseSheet.createRow(0), purchaseCols, headerStyle);
            r = 1;
            for (Purchase p : purchases) {
                Row row = purchaseSheet.createRow(r++);
                int c = 0;
                row.createCell(c++).setCellValue(safe(p.getDate()));
                row.createCell(c++).setCellValue(safe(p.getPurchaseOrderNo()));
                row.createCell(c++).setCellValue(safe(p.getSupplierInvoiceNo()));
                row.createCell(c++).setCellValue(safe(p.getVehicleNo()));
                row.createCell(c++).setCellValue(safe(p.getSupplierName()));
                row.createCell(c++).setCellValue(safe(p.getCommodity()));
                row.createCell(c++).setCellValue(number(p.getNetWeight()));
                row.createCell(c++).setCellValue(number(p.getUnitPrice()));
                row.createCell(c++).setCellValue(number(p.getSubtotal()));
                row.createCell(c++).setCellValue(number(p.getTaxAmount()));
                row.createCell(c++).setCellValue(number(p.getGrandTotal()));
                row.createCell(c++).setCellValue(number(p.getPaidAmount()));
                row.createCell(c++).setCellValue(safe(p.getPaymentStatus()));
                row.createCell(c++).setCellValue(safe(p.getCreatedBy()));
                row.createCell(c++).setCellValue(safe(p.getRemarks()));
            }
            autoSizeColumns(purchaseSheet, purchaseCols.length);

            // Payments
            Sheet paymentSheet = workbook.createSheet("Payments");
            String[] paymentCols = {"Date","Type","Party","Amount","Method","Txn Ref","Reference No","Reference ID","Recorded By","Remarks"};
            createHeader(paymentSheet.createRow(0), paymentCols, headerStyle);
            r = 1;
            for (Payment p : payments) {
                Row row = paymentSheet.createRow(r++);
                int c = 0;
                row.createCell(c++).setCellValue(safe(p.getPaymentDate()));
                row.createCell(c++).setCellValue(safe(p.getPaymentType()));
                row.createCell(c++).setCellValue(safe(p.getPartyName()));
                row.createCell(c++).setCellValue(number(p.getAmount()));
                row.createCell(c++).setCellValue(safe(p.getPaymentMethod()));
                row.createCell(c++).setCellValue(safe(p.getTransactionRef()));
                row.createCell(c++).setCellValue(safe(p.getReferenceNo()));
                row.createCell(c++).setCellValue(p.getReferenceId() == null ? "" : String.valueOf(p.getReferenceId()));
                row.createCell(c++).setCellValue(safe(p.getRecordedBy()));
                row.createCell(c++).setCellValue(safe(p.getRemarks()));
            }
            autoSizeColumns(paymentSheet, paymentCols.length);

            // Inventory
            Sheet itemSheet = workbook.createSheet("Inventory");
            String[] itemCols = {"Item Code","Name","Category","Unit","Current Stock","Min Alert","Unit Price"};
            createHeader(itemSheet.createRow(0), itemCols, headerStyle);
            r = 1;
            for (Item item : items) {
                Row row = itemSheet.createRow(r++);
                int c = 0;
                row.createCell(c++).setCellValue(safe(item.getItemCode()));
                row.createCell(c++).setCellValue(safe(item.getName()));
                row.createCell(c++).setCellValue(safe(item.getCategory()));
                row.createCell(c++).setCellValue(safe(item.getUnit()));
                row.createCell(c++).setCellValue(number(item.getCurrentStock()));
                row.createCell(c++).setCellValue(number(item.getMinStockAlert()));
                row.createCell(c++).setCellValue(number(item.getUnitPrice()));
            }
            autoSizeColumns(itemSheet, itemCols.length);

            // Customers
            Sheet customerSheet = workbook.createSheet("Customers");
            String[] customerCols = {"Code","Name","Phone","Email","Address","GSTIN","Credit Limit","Status","Created At"};
            createHeader(customerSheet.createRow(0), customerCols, headerStyle);
            r = 1;
            for (Customer cst : customers) {
                Row row = customerSheet.createRow(r++);
                int c = 0;
                row.createCell(c++).setCellValue(safe(cst.getCustomerCode()));
                row.createCell(c++).setCellValue(safe(cst.getName()));
                row.createCell(c++).setCellValue(safe(cst.getPhone()));
                row.createCell(c++).setCellValue(safe(cst.getEmail()));
                row.createCell(c++).setCellValue(safe(cst.getAddress()));
                row.createCell(c++).setCellValue(safe(cst.getGstin()));
                row.createCell(c++).setCellValue(number(cst.getCreditLimit()));
                row.createCell(c++).setCellValue(safe(cst.getStatus()));
                row.createCell(c++).setCellValue(safe(cst.getCreatedAt()));
            }
            autoSizeColumns(customerSheet, customerCols.length);

            // Suppliers
            Sheet supplierSheet = workbook.createSheet("Suppliers");
            String[] supplierCols = {"Code","Name","Phone","Email","Address","GSTIN","Status","Created At"};
            createHeader(supplierSheet.createRow(0), supplierCols, headerStyle);
            r = 1;
            for (Supplier sup : suppliers) {
                Row row = supplierSheet.createRow(r++);
                int c = 0;
                row.createCell(c++).setCellValue(safe(sup.getSupplierCode()));
                row.createCell(c++).setCellValue(safe(sup.getName()));
                row.createCell(c++).setCellValue(safe(sup.getPhone()));
                row.createCell(c++).setCellValue(safe(sup.getEmail()));
                row.createCell(c++).setCellValue(safe(sup.getAddress()));
                row.createCell(c++).setCellValue(safe(sup.getGstin()));
                row.createCell(c++).setCellValue(safe(sup.getStatus()));
                row.createCell(c++).setCellValue(safe(sup.getCreatedAt()));
            }
            autoSizeColumns(supplierSheet, supplierCols.length);

            // Employees
            Sheet employeeSheet = workbook.createSheet("Employees");
            String[] employeeCols = {"Code","Name","Phone","Email","Department","Designation","Joining Date","Status","Basic Salary"};
            createHeader(employeeSheet.createRow(0), employeeCols, headerStyle);
            r = 1;
            for (Employee e : employees) {
                Row row = employeeSheet.createRow(r++);
                int c = 0;
                row.createCell(c++).setCellValue(safe(e.getEmployeeCode()));
                row.createCell(c++).setCellValue(safe(e.getName()));
                row.createCell(c++).setCellValue(safe(e.getPhone()));
                row.createCell(c++).setCellValue(safe(e.getEmail()));
                row.createCell(c++).setCellValue(safe(e.getDepartment()));
                row.createCell(c++).setCellValue(safe(e.getDesignation()));
                row.createCell(c++).setCellValue(safe(e.getJoiningDate()));
                row.createCell(c++).setCellValue(safe(e.getStatus()));
                row.createCell(c++).setCellValue(number(e.getBasicSalary()));
            }
            autoSizeColumns(employeeSheet, employeeCols.length);

            // Attendance
            Sheet attendanceSheet = workbook.createSheet("Attendance");
            String[] attendanceCols = {"Date","Employee ID","Employee Name","Department","Shift","Status","Remarks"};
            createHeader(attendanceSheet.createRow(0), attendanceCols, headerStyle);
            r = 1;
            for (Attendance a : attendance) {
                Row row = attendanceSheet.createRow(r++);
                int c = 0;
                row.createCell(c++).setCellValue(safe(a.getDate()));
                row.createCell(c++).setCellValue(a.getEmployeeId() == null ? "" : String.valueOf(a.getEmployeeId()));
                row.createCell(c++).setCellValue(safe(a.getEmployeeName()));
                row.createCell(c++).setCellValue(safe(a.getDepartment()));
                row.createCell(c++).setCellValue(safe(a.getShift()));
                row.createCell(c++).setCellValue(safe(a.getStatus()));
                row.createCell(c++).setCellValue(safe(a.getRemarks()));
            }
            autoSizeColumns(attendanceSheet, attendanceCols.length);

            // Reactor Timing
            Sheet reactorSheet = workbook.createSheet("Reactor Timing");
            String[] reactorCols = {"Record ID","Date","Start","End","Duration","Responsible","Shift","Batch","Related Type","Related ID","Created By","Notes"};
            createHeader(reactorSheet.createRow(0), reactorCols, headerStyle);
            r = 1;
            for (ReactorTiming rt : reactorTimings) {
                Row row = reactorSheet.createRow(r++);
                int c = 0;
                row.createCell(c++).setCellValue(rt.getId() == null ? "" : String.valueOf(rt.getId()));
                row.createCell(c++).setCellValue(safe(rt.getDate()));
                row.createCell(c++).setCellValue(safe(rt.getStartTime() != null ? rt.getStartTime() : rt.getReactor1Time()));
                row.createCell(c++).setCellValue(safe(rt.getEndTime() != null ? rt.getEndTime() : rt.getReactor2Time()));
                row.createCell(c++).setCellValue(safe(rt.getDurationText()));
                row.createCell(c++).setCellValue(safe(rt.getResponsibleUser()));
                row.createCell(c++).setCellValue(safe(rt.getShift()));
                row.createCell(c++).setCellValue(safe(rt.getBatchNo()));
                row.createCell(c++).setCellValue(safe(rt.getRelatedTransactionType()));
                row.createCell(c++).setCellValue(rt.getRelatedTransactionId() == null ? "" : String.valueOf(rt.getRelatedTransactionId()));
                row.createCell(c++).setCellValue(safe(rt.getCreatedBy()));
                row.createCell(c++).setCellValue(safe(rt.getRemarks()));
            }
            autoSizeColumns(reactorSheet, reactorCols.length);

            // Audit Logs
            Sheet auditSheet = workbook.createSheet("Audit Logs");
            String[] auditCols = {"Timestamp","User","Action","Module","Record ID","Details","Previous Value","Updated Value"};
            createHeader(auditSheet.createRow(0), auditCols, headerStyle);
            r = 1;
            for (AuditLog log : auditLogs) {
                Row row = auditSheet.createRow(r++);
                int c = 0;
                row.createCell(c++).setCellValue(safe(log.getTimestamp()));
                row.createCell(c++).setCellValue(safe(log.getUsername()));
                row.createCell(c++).setCellValue(safe(log.getAction()));
                row.createCell(c++).setCellValue(safe(log.getModule()));
                row.createCell(c++).setCellValue(log.getRecordId() == null ? "" : String.valueOf(log.getRecordId()));
                row.createCell(c++).setCellValue(safe(log.getDetails()));
                row.createCell(c++).setCellValue(safe(log.getOldValue()));
                row.createCell(c++).setCellValue(safe(log.getNewValue()));
            }
            autoSizeColumns(auditSheet, Math.min(auditCols.length, 8));

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    private <T> List<T> filterByDate(List<T> list, java.util.function.Function<T, LocalDate> getter, LocalDate from, LocalDate to) {
        return list.stream().filter(item -> {
            LocalDate d = getter.apply(item);
            if (d == null) return from == null && to == null; // keep undated items only in full export
            if (from != null && d.isBefore(from)) return false;
            if (to != null && d.isAfter(to)) return false;
            return true;
        }).collect(Collectors.toList());
    }

    private <T> List<T> filterByDateTime(List<T> list, java.util.function.Function<T, LocalDateTime> getter, LocalDate from, LocalDate to) {
        return list.stream().filter(item -> {
            LocalDateTime dt = getter.apply(item);
            if (dt == null) return from == null && to == null;
            LocalDate d = dt.toLocalDate();
            if (from != null && d.isBefore(from)) return false;
            if (to != null && d.isAfter(to)) return false;
            return true;
        }).collect(Collectors.toList());
    }

    private void addSummaryRow(Sheet sheet, int rowNum, String label, int value) {
        Row row = sheet.createRow(rowNum);
        row.createCell(0).setCellValue(label);
        row.createCell(1).setCellValue(value);
    }

    private String rangeText(LocalDate from, LocalDate to) {
        return (from == null && to == null) ? "Complete History" : ((from != null ? from : "Earliest") + " to " + (to != null ? to : "Latest"));
    }

    private void createHeader(Row row, String[] columns, CellStyle style) {
        for (int i = 0; i < columns.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(columns[i]);
            cell.setCellStyle(style);
        }
    }

    private void autoSizeColumns(Sheet sheet, int columnCount) {
        for (int i = 0; i < columnCount; i++) {
            try { sheet.autoSizeColumn(i); } catch (Exception ignored) {}
        }
    }

    private String safe(Object value) {
        return value == null ? "" : value.toString();
    }

    private double number(Number value) {
        return value == null ? 0 : value.doubleValue();
    }
}