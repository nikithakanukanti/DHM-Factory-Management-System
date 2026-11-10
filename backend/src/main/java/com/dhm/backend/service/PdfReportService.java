package com.dhm.backend.service;

import com.dhm.backend.entity.*;
import com.dhm.backend.repository.*;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PdfReportService {

    private final VehicleRepository vehicleRepository;
    private final SaleRepository saleRepository;
    private final PurchaseRepository purchaseRepository;
    private final ReactorTimingRepository reactorTimingRepository;
    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final ItemRepository itemRepository;
    private final AuditLogRepository auditLogRepository;
    private final AppSettingRepository appSettingRepository;

    public PdfReportService(
            VehicleRepository vehicleRepository,
            SaleRepository saleRepository,
            PurchaseRepository purchaseRepository,
            ReactorTimingRepository reactorTimingRepository,
            PaymentRepository paymentRepository,
            CustomerRepository customerRepository,
            SupplierRepository supplierRepository,
            EmployeeRepository employeeRepository,
            AttendanceRepository attendanceRepository,
            ItemRepository itemRepository,
            AuditLogRepository auditLogRepository,
            AppSettingRepository appSettingRepository) {

        this.vehicleRepository = vehicleRepository;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.reactorTimingRepository = reactorTimingRepository;
        this.paymentRepository = paymentRepository;
        this.customerRepository = customerRepository;
        this.supplierRepository = supplierRepository;
        this.employeeRepository = employeeRepository;
        this.attendanceRepository = attendanceRepository;
        this.itemRepository = itemRepository;
        this.auditLogRepository = auditLogRepository;
        this.appSettingRepository = appSettingRepository;
    }

    public byte[] generateReport(LocalDate from, LocalDate to) throws Exception {
        List<Vehicle> vehicles = filterByDate(vehicleRepository.findAll(), Vehicle::getDate, from, to);
        List<Sale> sales = filterByDate(saleRepository.findAll(), Sale::getDate, from, to);
        List<Purchase> purchases = filterByDate(purchaseRepository.findAll(), Purchase::getDate, from, to);
        List<ReactorTiming> reactorTimings = filterByDate(reactorTimingRepository.findAll(), ReactorTiming::getDate, from, to);
        List<Payment> payments = filterByDate(paymentRepository.findAll(), Payment::getPaymentDate, from, to);
        List<Attendance> attendance = filterByDate(attendanceRepository.findAll(), Attendance::getDate, from, to);
        List<AuditLog> auditLogs = filterByDateTime(auditLogRepository.findAll(), AuditLog::getTimestamp, from, to);
        List<Item> items = itemRepository.findAll();
        List<Customer> customers = customerRepository.findAll();
        List<Supplier> suppliers = supplierRepository.findAll();
        List<Employee> employees = employeeRepository.findAll();

        String companyName = appSettingRepository.findBySettingKey("factory_name")
                .map(AppSetting::getSettingValue).orElse("DHM Pyrotech Enterprises");
        String companyAddress = appSettingRepository.findBySettingKey("factory_address")
                .map(AppSetting::getSettingValue).orElse("");

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate(), 24, 24, 24, 24);
        PdfWriter.getInstance(document, outputStream);
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new BaseColor(23, 63, 103));
        Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 10, BaseColor.DARK_GRAY);
        Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, new BaseColor(23, 63, 103));

        addBrandHeader(document, companyName, companyAddress, from, to, titleFont, subFont);

        document.add(new Paragraph("Executive Summary", sectionFont));
        document.add(Chunk.NEWLINE);
        PdfPTable summary = new PdfPTable(2);
        summary.setWidthPercentage(65);
        addHeaderRow(summary, new String[]{"Module", "Records"});
        addRow(summary, "Vehicles", String.valueOf(vehicles.size()));
        addRow(summary, "Sales", String.valueOf(sales.size()));
        addRow(summary, "Purchases", String.valueOf(purchases.size()));
        addRow(summary, "Payments", String.valueOf(payments.size()));
        addRow(summary, "Reactor Timings", String.valueOf(reactorTimings.size()));
        addRow(summary, "Inventory Items", String.valueOf(items.size()));
        addRow(summary, "Customers", String.valueOf(customers.size()));
        addRow(summary, "Suppliers", String.valueOf(suppliers.size()));
        addRow(summary, "Employees", String.valueOf(employees.size()));
        addRow(summary, "Attendance Records", String.valueOf(attendance.size()));
        addRow(summary, "Audit Logs", String.valueOf(auditLogs.size()));
        document.add(summary);

        addSection(document, sectionFont, "Vehicle Register", vehicles, new String[]{"Date","Vehicle No","Driver","Party","Gross","Tare","Net","Status","Geofence"}, v -> new String[]{
                safe(v.getDate()), safe(v.getVehicleNo()), safe(v.getDriverName()), safe(v.getPartyName()), safe(v.getGrossWeight()), safe(v.getTareWeight()), safe(v.getNetWeight()), safe(v.getStatus()), v.getInsideGeofence()==null?"":(v.getInsideGeofence()?"INSIDE":"OUTSIDE")
        });
        addSection(document, sectionFont, "Sales Register", sales, new String[]{"Date","Invoice","Customer","Vehicle","Net KG","Grand Total","Paid","Status"}, s -> new String[]{
                safe(s.getDate()), safe(s.getInvoiceNo()), safe(s.getCustomerName()), safe(s.getVehicleNo()), safe(s.getNetWeight()), safe(s.getGrandTotal()), safe(s.getPaidAmount()), safe(s.getPaymentStatus())
        });
        addSection(document, sectionFont, "Purchase Register", purchases, new String[]{"Date","PO No","Supplier","Vehicle","Net KG","Grand Total","Paid","Status"}, p -> new String[]{
                safe(p.getDate()), safe(p.getPurchaseOrderNo()), safe(p.getSupplierName()), safe(p.getVehicleNo()), safe(p.getNetWeight()), safe(p.getGrandTotal()), safe(p.getPaidAmount()), safe(p.getPaymentStatus())
        });
        addSection(document, sectionFont, "Payments", payments, new String[]{"Date","Type","Party","Amount","Method","Txn Ref","Recorded By"}, p -> new String[]{
                safe(p.getPaymentDate()), safe(p.getPaymentType()), safe(p.getPartyName()), safe(p.getAmount()), safe(p.getPaymentMethod()), safe(p.getTransactionRef()), safe(p.getRecordedBy())
        });
        addSection(document, sectionFont, "Inventory", items, new String[]{"Code","Name","Category","Unit","Current Stock","Min Alert"}, i -> new String[]{
                safe(i.getItemCode()), safe(i.getName()), safe(i.getCategory()), safe(i.getUnit()), safe(i.getCurrentStock()), safe(i.getMinStockAlert())
        });
        addSection(document, sectionFont, "Customers", customers, new String[]{"Code","Name","Phone","GSTIN","Credit Limit","Status"}, c -> new String[]{
                safe(c.getCustomerCode()), safe(c.getName()), safe(c.getPhone()), safe(c.getGstin()), safe(c.getCreditLimit()), safe(c.getStatus())
        });
        addSection(document, sectionFont, "Suppliers", suppliers, new String[]{"Code","Name","Phone","GSTIN","Status"}, s -> new String[]{
                safe(s.getSupplierCode()), safe(s.getName()), safe(s.getPhone()), safe(s.getGstin()), safe(s.getStatus())
        });
        addSection(document, sectionFont, "Employees", employees, new String[]{"Code","Name","Department","Designation","Joining","Status"}, e -> new String[]{
                safe(e.getEmployeeCode()), safe(e.getName()), safe(e.getDepartment()), safe(e.getDesignation()), safe(e.getJoiningDate()), safe(e.getStatus())
        });
        addSection(document, sectionFont, "Attendance", attendance, new String[]{"Date","Employee","Department","Shift","Status"}, a -> new String[]{
                safe(a.getDate()), safe(a.getEmployeeName()), safe(a.getDepartment()), safe(a.getShift()), safe(a.getStatus())
        });
        addSection(document, sectionFont, "Reactor Timing", reactorTimings, new String[]{"ID","Date","Start","End","Duration","Responsible","Related","Notes"}, t -> new String[]{
                safe(t.getId()), safe(t.getDate()), safe(t.getStartTime()!=null?t.getStartTime():t.getReactor1Time()), safe(t.getEndTime()!=null?t.getEndTime():t.getReactor2Time()), safe(t.getDurationText()), safe(t.getResponsibleUser()), safe((t.getRelatedTransactionType()==null?"":t.getRelatedTransactionType()) + (t.getRelatedTransactionId()==null?"":" #"+t.getRelatedTransactionId())), safe(t.getRemarks())
        });
        addSection(document, sectionFont, "Audit Logs", auditLogs, new String[]{"Timestamp","User","Action","Module","Record","Details"}, l -> new String[]{
                safe(l.getTimestamp()), safe(l.getUsername()), safe(l.getAction()), safe(l.getModule()), safe(l.getRecordId()), safe(l.getDetails())
        });

        document.close();
        return outputStream.toByteArray();
    }

    private <T> void addSection(Document document, Font sectionFont, String title, List<T> items, String[] headers, java.util.function.Function<T, String[]> rowMapper) throws DocumentException {
        document.newPage();
        document.add(new Paragraph(title, sectionFont));
        document.add(Chunk.NEWLINE);
        PdfPTable table = new PdfPTable(headers.length);
        table.setWidthPercentage(100);
        addHeaderRow(table, headers);
        if (items.isEmpty()) {
            PdfPCell cell = new PdfPCell(new Phrase("No records found for selected range.", FontFactory.getFont(FontFactory.HELVETICA, 9, BaseColor.GRAY)));
            cell.setColspan(headers.length);
            cell.setPadding(8);
            table.addCell(cell);
        } else {
            for (T item : items) {
                String[] values = rowMapper.apply(item);
                for (String v : values) addRowCell(table, v);
            }
        }
        document.add(table);
    }

    private void addBrandHeader(Document document, String companyName, String address, LocalDate from, LocalDate to, Font titleFont, Font subFont) throws Exception {
        PdfPTable header = new PdfPTable(2);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{1.2f, 6f});

        PdfPCell logoCell = new PdfPCell();
        logoCell.setBorder(Rectangle.NO_BORDER);
        logoCell.setPadding(4);
        Image logo = tryLoadLogo();
        if (logo != null) {
            logo.scaleToFit(60, 60);
            logoCell.addElement(logo);
        } else {
            logoCell.addElement(new Phrase("DHM", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new BaseColor(23,63,103))));
        }
        header.addCell(logoCell);

        PdfPCell textCell = new PdfPCell();
        textCell.setBorder(Rectangle.NO_BORDER);
        textCell.addElement(new Paragraph(companyName, titleFont));
        if (address != null && !address.trim().isEmpty()) textCell.addElement(new Paragraph(address, subFont));
        textCell.addElement(new Paragraph("Factory Management System Report | Date Range: " + ((from==null&&to==null)?"Complete History":((from!=null?from:"Earliest")+" to "+(to!=null?to:"Latest"))), subFont));
        header.addCell(textCell);

        document.add(header);
        document.add(Chunk.NEWLINE);
    }

    private Image tryLoadLogo() {
        try {
            // Common runtime locations
            String[] paths = new String[]{
                    "frontend/public/dhm-logo.jpg",
                    "public/dhm-logo.jpg",
                    "dhm-logo.jpg"
            };
            for (String p : paths) {
                File f = new File(p);
                if (f.exists()) return Image.getInstance(f.getAbsolutePath());
            }
            try {
                ClassPathResource res = new ClassPathResource("static/dhm-logo.jpg");
                if (res.exists()) return Image.getInstance(res.getInputStream().readAllBytes());
            } catch (Exception ignored) {}
        } catch (Exception ignored) {}
        return null;
    }

    private <T> List<T> filterByDate(List<T> list, java.util.function.Function<T, LocalDate> getter, LocalDate from, LocalDate to) {
        return list.stream().filter(item -> {
            LocalDate d = getter.apply(item);
            if (d == null) return from == null && to == null;
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

    private void addHeaderRow(PdfPTable table, String[] headers) {
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, BaseColor.WHITE);
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
            cell.setBackgroundColor(new BaseColor(23, 63, 103));
            cell.setPadding(5);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);
        }
    }

    private void addRow(PdfPTable table, String a, String b) {
        addRowCell(table, a);
        addRowCell(table, b);
    }

    private void addRowCell(PdfPTable table, String value) {
        PdfPCell cell = new PdfPCell(new Phrase(value == null ? "" : value, FontFactory.getFont(FontFactory.HELVETICA, 8)));
        cell.setPadding(4);
        table.addCell(cell);
    }

    private String safe(Object value) { return value == null ? "" : value.toString(); }
}