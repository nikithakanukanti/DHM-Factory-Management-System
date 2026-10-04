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

    public byte[] generateReport() throws Exception {

        List<Vehicle> vehicles = vehicleRepository.findAll();
        List<Sale> sales = saleRepository.findAll();
        List<Purchase> purchases = purchaseRepository.findAll();
        List<ReactorTiming> reactorTimings = reactorTimingRepository.findAll();

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        Document document = new Document(PageSize.A4.rotate());

        PdfWriter.getInstance(document, outputStream);

        document.open();

        Font titleFont = FontFactory.getFont(
                FontFactory.HELVETICA_BOLD,
                18
        );

        Font sectionFont = FontFactory.getFont(
                FontFactory.HELVETICA_BOLD,
                13
        );

        // -------------------------
        // TITLE
        // -------------------------

        Paragraph title = new Paragraph(
                "DHM FACTORY DIGITAL ENTRY",
                titleFont
        );

        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);

        Paragraph subtitle = new Paragraph(
                "DHM VEHICLE DETAILS REGISTER"
        );

        subtitle.setAlignment(Element.ALIGN_CENTER);
        document.add(subtitle);

        document.add(Chunk.NEWLINE);

        // -------------------------
        // SUMMARY
        // -------------------------

        document.add(new Paragraph("Summary", sectionFont));
        document.add(Chunk.NEWLINE);

        PdfPTable summaryTable = new PdfPTable(2);
        summaryTable.setWidthPercentage(60);

        addCell(summaryTable, "Record Type");
        addCell(summaryTable, "Total Records");

        addCell(summaryTable, "Vehicles");
        addCell(summaryTable, String.valueOf(vehicles.size()));

        addCell(summaryTable, "Sales");
        addCell(summaryTable, String.valueOf(sales.size()));

        addCell(summaryTable, "Purchases");
        addCell(summaryTable, String.valueOf(purchases.size()));

        addCell(summaryTable, "Reactor Timings");
        addCell(summaryTable, String.valueOf(reactorTimings.size()));

        document.add(summaryTable);

        document.add(Chunk.NEWLINE);

        // -------------------------
        // VEHICLE REGISTER
        // -------------------------

        document.add(new Paragraph(
                "Vehicle Register",
                sectionFont
        ));

        document.add(Chunk.NEWLINE);

        PdfPTable vehicleTable = new PdfPTable(8);
        vehicleTable.setWidthPercentage(100);

        String[] vehicleHeaders = {
                "Date",
                "Vehicle No",
                "Gross Weight",
                "Tare Weight",
                "Net Weight",
                "Local",
                "Imported",
                "Remarks"
        };

        addHeaders(vehicleTable, vehicleHeaders);

        for (Vehicle vehicle : vehicles) {

            addCell(vehicleTable, vehicle.getDate());
            addCell(vehicleTable, vehicle.getVehicleNo());
            addCell(vehicleTable, vehicle.getGrossWeight());
            addCell(vehicleTable, vehicle.getTareWeight());
            addCell(vehicleTable, vehicle.getNetWeight());
            addCell(vehicleTable, vehicle.isLocal());
            addCell(vehicleTable, vehicle.isImported());
            addCell(vehicleTable, vehicle.getRemarks());
        }

        document.add(vehicleTable);

        document.newPage();

        // -------------------------
        // SALES REGISTER
        // -------------------------

        document.add(new Paragraph(
                "Sales Register",
                sectionFont
        ));

        document.add(Chunk.NEWLINE);

        PdfPTable salesTable = new PdfPTable(7);
        salesTable.setWidthPercentage(100);

        String[] salesHeaders = {
                "Date",
                "Vehicle No",
                "Gross Weight",
                "Tare Weight",
                "Net Weight",
                "Commodity",
                "Remarks"
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

        // -------------------------
        // PURCHASE REGISTER
        // -------------------------

        document.add(new Paragraph(
                "Purchase Register",
                sectionFont
        ));

        document.add(Chunk.NEWLINE);

        PdfPTable purchaseTable = new PdfPTable(4);
        purchaseTable.setWidthPercentage(100);

        String[] purchaseHeaders = {
                "Date",
                "Net Weight",
                "Commodity",
                "Remarks"
        };

        addHeaders(purchaseTable, purchaseHeaders);

        for (Purchase purchase : purchases) {

            addCell(purchaseTable, purchase.getDate());
            addCell(purchaseTable, purchase.getNetWeight());
            addCell(purchaseTable, purchase.getCommodity());
            addCell(purchaseTable, purchase.getRemarks());
        }

        document.add(purchaseTable);

        document.newPage();

        // -------------------------
        // REACTOR TIMING
        // -------------------------

        document.add(new Paragraph(
                "Reactor Timing",
                sectionFont
        ));

        document.add(Chunk.NEWLINE);

        PdfPTable reactorTable = new PdfPTable(3);
        reactorTable.setWidthPercentage(70);

        String[] reactorHeaders = {
                "Date",
                "Reactor 1 Time",
                "Reactor 2 Time"
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

    private void addHeaders(
            PdfPTable table,
            String[] headers) {

        for (String header : headers) {
            addCell(table, header);
        }
    }

    private void addCell(
            PdfPTable table,
            Object value) {

        PdfPCell cell = new PdfPCell(
                new Phrase(
                        value == null ? "" : value.toString()
                )
        );

        table.addCell(cell);
    }
}
