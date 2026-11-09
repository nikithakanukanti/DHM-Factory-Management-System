package com.dhm.backend.service;

import com.dhm.backend.entity.Purchase;
import com.dhm.backend.entity.ReactorTiming;
import com.dhm.backend.entity.Sale;
import com.dhm.backend.entity.Vehicle;
import com.dhm.backend.repository.PurchaseRepository;
import com.dhm.backend.repository.ReactorTimingRepository;
import com.dhm.backend.repository.SaleRepository;
import com.dhm.backend.repository.VehicleRepository;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfWriter;

import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;

@Service
public class PdfReportService {

    private final VehicleRepository vehicleRepository;
    private final SaleRepository saleRepository;
    private final PurchaseRepository purchaseRepository;
    private final ReactorTimingRepository reactorTimingRepository;

    public PdfReportService(
            VehicleRepository vehicleRepository,
            SaleRepository saleRepository,
            PurchaseRepository purchaseRepository,
            ReactorTimingRepository reactorTimingRepository) {

        this.vehicleRepository = vehicleRepository;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.reactorTimingRepository = reactorTimingRepository;
    }

    public byte[] generateReport(LocalDate from, LocalDate to) throws Exception {

        List<Vehicle> vehicles;
        List<Sale> sales;
        List<Purchase> purchases;
        List<ReactorTiming> reactorTimings;

        if (from != null && to != null) {
            vehicles = vehicleRepository.findByDateBetween(from, to);
            sales = saleRepository.findByDateBetween(from, to);
            purchases = purchaseRepository.findByDateBetween(from, to);
            reactorTimings = reactorTimingRepository.findByDateBetween(from, to);
        } else if (from != null) {
            vehicles = vehicleRepository.findByDateGreaterThanEqual(from);
            sales = saleRepository.findByDateGreaterThanEqual(from);
            purchases = purchaseRepository.findByDateGreaterThanEqual(from);
            reactorTimings = reactorTimingRepository.findByDateGreaterThanEqual(from);
        } else if (to != null) {
            vehicles = vehicleRepository.findByDateLessThanEqual(to);
            sales = saleRepository.findByDateLessThanEqual(to);
            purchases = purchaseRepository.findByDateLessThanEqual(to);
            reactorTimings = reactorTimingRepository.findByDateLessThanEqual(to);
        } else {
            vehicles = vehicleRepository.findAll();
            sales = saleRepository.findAll();
            purchases = purchaseRepository.findAll();
            reactorTimings = reactorTimingRepository.findAll();
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate());
        PdfWriter.getInstance(document, outputStream);
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
        Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 10, BaseColor.DARK_GRAY);
        Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13);

        // TITLE
        Paragraph title = new Paragraph("DHM PYROTECH ENTERPRISES", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);

        String rangeSubtitle = (from != null || to != null)
                ? "Factory Operations Report: " + (from != null ? from.toString() : "Earliest") + " to " + (to != null ? to.toString() : "Latest")
                : "Factory Operations Report: Complete History";
        Paragraph subtitle = new Paragraph(rangeSubtitle, subFont);
        subtitle.setAlignment(Element.ALIGN_CENTER);
        document.add(subtitle);
        document.add(Chunk.NEWLINE);

        // SUMMARY TABLE
        document.add(new Paragraph("Summary", sectionFont));
        document.add(Chunk.NEWLINE);

        PdfPTable summaryTable = new PdfPTable(2);
        summaryTable.setWidthPercentage(60);
        addCell(summaryTable, "Record Type");
        addCell(summaryTable, "Total Records");

        addCell(summaryTable, "Vehicles Registered");
        addCell(summaryTable, String.valueOf(vehicles.size()));

        addCell(summaryTable, "Sales Entries");
        addCell(summaryTable, String.valueOf(sales.size()));

        addCell(summaryTable, "Purchase Entries");
        addCell(summaryTable, String.valueOf(purchases.size()));

        addCell(summaryTable, "Reactor Records");
        addCell(summaryTable, String.valueOf(reactorTimings.size()));

        document.add(summaryTable);
        document.newPage();

        // VEHICLE REGISTER
        document.add(new Paragraph("Vehicle Register (Gate Entries)", sectionFont));
        document.add(Chunk.NEWLINE);

        PdfPTable vehicleTable = new PdfPTable(8);
        vehicleTable.setWidthPercentage(100);
        String[] vehicleHeaders = {
                "Date", "Vehicle No", "Gross (KG)", "Tare (KG)", "Net (KG)", "Commodity", "Type", "Remarks"
        };
        addHeaders(vehicleTable, vehicleHeaders);

        for (Vehicle vehicle : vehicles) {
            addCell(vehicleTable, vehicle.getDate());
            addCell(vehicleTable, vehicle.getVehicleNo());
            addCell(vehicleTable, vehicle.getGrossWeight());
            addCell(vehicleTable, vehicle.getTareWeight());
            addCell(vehicleTable, vehicle.getNetWeight());
            addCell(vehicleTable, vehicle.getCommodity());
            addCell(vehicleTable, vehicle.getRegisterType() != null ? vehicle.getRegisterType() : "-");
            addCell(vehicleTable, vehicle.getRemarks());
        }
        document.add(vehicleTable);
        document.newPage();

        // SALES REGISTER
        document.add(new Paragraph("Sales Register (Dispatches)", sectionFont));
        document.add(Chunk.NEWLINE);

        PdfPTable salesTable = new PdfPTable(7);
        salesTable.setWidthPercentage(100);
        String[] salesHeaders = {
                "Date", "Vehicle No", "Gross (KG)", "Tare (KG)", "Net (KG)", "Commodity", "Remarks"
        };
        addHeaders(salesTable, salesHeaders);

        for (Sale sale : sales) {
            addCell(salesTable, sale.getDate());
            addCell(salesTable, sale.getVehicleNo());
            addCell(salesTable, sale.getGrossWeight());
            addCell(salesTable, sale.getTareWeight());
            addCell(salesTable, sale.getNetWeight());
            addCell(salesTable, sale.getCommodity());
            addCell(salesTable, sale.getRemarks());
        }
        document.add(salesTable);
        document.newPage();

        // PURCHASE REGISTER
        document.add(new Paragraph("Purchase Register (Raw Material Inward)", sectionFont));
        document.add(Chunk.NEWLINE);

        PdfPTable purchaseTable = new PdfPTable(7);
        purchaseTable.setWidthPercentage(100);
        String[] purchaseHeaders = {
                "Date", "Vehicle No", "Gross (KG)", "Tare (KG)", "Net (KG)", "Commodity", "Remarks"
        };
        addHeaders(purchaseTable, purchaseHeaders);

        for (Purchase purchase : purchases) {
            addCell(purchaseTable, purchase.getDate());
            addCell(purchaseTable, purchase.getVehicleNo());
            addCell(purchaseTable, purchase.getGrossWeight());
            addCell(purchaseTable, purchase.getTareWeight());
            addCell(purchaseTable, purchase.getNetWeight());
            addCell(purchaseTable, purchase.getCommodity());
            addCell(purchaseTable, purchase.getRemarks());
        }
        document.add(purchaseTable);
        document.newPage();

        // REACTOR TIMING
        document.add(new Paragraph("Reactor Timing", sectionFont));
        document.add(Chunk.NEWLINE);

        PdfPTable reactorTable = new PdfPTable(3);
        reactorTable.setWidthPercentage(80);
        String[] reactorHeaders = {
                "Date", "Reactor 1 Time", "Reactor 2 Time"
        };
        addHeaders(reactorTable, reactorHeaders);

        for (ReactorTiming timing : reactorTimings) {
            addCell(reactorTable, timing.getDate());
            addCell(reactorTable, timing.getReactor1Time());
            addCell(reactorTable, timing.getReactor2Time());
        }
        document.add(reactorTable);

        document.close();
        return outputStream.toByteArray();
    }

    private void addHeaders(PdfPTable table, String[] headers) {
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, BaseColor.WHITE);
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
            cell.setBackgroundColor(new BaseColor(23, 63, 103)); // DHM Brand Navy
            cell.setPadding(6);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);
        }
    }

    private void addCell(PdfPTable table, Object value) {
        Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
        String text = value == null ? "" : value.toString();
        PdfPCell cell = new PdfPCell(new Phrase(text, cellFont));
        cell.setPadding(5);
        table.addCell(cell);
    }
}
