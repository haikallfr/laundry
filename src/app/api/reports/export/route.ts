import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { readStore } from "@/lib/store";
import {
  formatDate,
  formatRupiah,
  laundryStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel
} from "@/lib/utils";
import { requireOwner } from "@/lib/api-guard";
import { calculateFinanceSummary, filterExpensesByPeriod, filterTransactionsByPeriod, resolvePeriod, servicePopularity } from "@/lib/finance";
import type { Expense, PaymentMethod, Transaction } from "@/types";

const rupiahNumberFormat = '"Rp" #,##0;-"Rp" #,##0;"Rp" 0';
const brandBlue = "0F4CDB";
const softBlue = "EAF1FF";
const softGray = "F5F7FB";
const borderColor = "D9E1F2";
const transactionHeaders = [
  "No",
  "No Nota",
  "Tanggal",
  "Pelanggan",
  "No HP",
  "Kasir",
  "Subtotal",
  "Diskon",
  "Biaya Tambahan",
  "Pajak",
  "Total",
  "Dibayar",
  "Piutang",
  "Metode",
  "Status Bayar",
  "Status Laundry"
];
const expenseHeaders = ["No", "Tanggal", "Kategori", "Deskripsi", "Metode", "Nominal", "Dibuat Oleh"];

function outstandingAmount(transaction: Transaction) {
  return Math.max(0, transaction.grandTotal - transaction.paidAmount);
}

function periodText(start?: Date, end?: Date) {
  if (!start && !end) return "Semua tanggal";
  if (start && end) return `${formatDate(start, "dd MMM yyyy")} - ${formatDate(end, "dd MMM yyyy")}`;
  if (start) return `Mulai ${formatDate(start, "dd MMM yyyy")}`;
  return `Sampai ${formatDate(end as Date, "dd MMM yyyy")}`;
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function paymentBreakdown(transactions: Transaction[]) {
  return transactions
    .flatMap((transaction) => transaction.payments)
    .reduce<Record<PaymentMethod, number>>(
      (map, payment) => {
        map[payment.paymentMethod] += payment.amount;
        return map;
      },
      { CASH: 0, QRIS: 0, BANK_TRANSFER: 0, EWALLET: 0, SPLIT: 0 }
    );
}

function expenseRows(expenses: Expense[], users: { id: string; name: string }[]) {
  return expenses.map((expense, index) => {
    const creator = users.find((user) => user.id === expense.createdBy)?.name ?? "-";
    return {
      no: index + 1,
      tanggal: formatDate(expense.date, "dd MMM yyyy"),
      kategori: expense.category,
      deskripsi: expense.description,
      metode: paymentMethodLabel[expense.paymentMethod],
      nominal: expense.amount,
      dibuatOleh: creator
    };
  });
}

function transactionRows(transactions: Transaction[]) {
  return transactions.map((transaction, index) => {
    const mainPayment = transaction.payments[0]?.paymentMethod;
    return {
      no: index + 1,
      nomor: transaction.transactionNumber,
      tanggal: formatDate(transaction.createdAt),
      pelanggan: transaction.customer.name,
      hp: transaction.customer.phone || "-",
      kasir: transaction.cashier.name,
      subtotal: transaction.subtotal,
      diskon: transaction.discount,
      biayaTambahan: transaction.additionalFee,
      pajak: transaction.tax,
      total: transaction.grandTotal,
      dibayar: transaction.paidAmount,
      piutang: outstandingAmount(transaction),
      metode: mainPayment ? paymentMethodLabel[mainPayment] : "-",
      statusBayar: paymentStatusLabel[transaction.paymentStatus],
      statusLaundry: laundryStatusLabel[transaction.laundryStatus]
    };
  });
}

function setTitleRow(sheet: ExcelJS.Worksheet, rowNumber: number, value: string, mergeTo: string) {
  sheet.mergeCells(`A${rowNumber}:${mergeTo}${rowNumber}`);
  const cell = sheet.getCell(`A${rowNumber}`);
  cell.value = value;
  cell.font = { bold: true, size: rowNumber === 1 ? 18 : 11, color: { argb: rowNumber === 1 ? brandBlue : "475569" } };
  cell.alignment = { vertical: "middle", horizontal: "center" };
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: brandBlue } };
    cell.font = { bold: true, color: { argb: "FFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: borderColor } },
      left: { style: "thin", color: { argb: borderColor } },
      bottom: { style: "thin", color: { argb: borderColor } },
      right: { style: "thin", color: { argb: borderColor } }
    };
  });
}

function styleBodyRows(sheet: ExcelJS.Worksheet, startRow: number, endRow: number, moneyColumns: string[]) {
  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: borderColor } },
        left: { style: "thin", color: { argb: borderColor } },
        bottom: { style: "thin", color: { argb: borderColor } },
        right: { style: "thin", color: { argb: borderColor } }
      };
      cell.alignment = { vertical: "middle", wrapText: true };
      if (rowIndex % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FBFCFF" } };
      }
    });
  }
  moneyColumns.forEach((column) => {
    sheet.getColumn(column).numFmt = rupiahNumberFormat;
  });
}

function styleReportBanner(sheet: ExcelJS.Worksheet, mergeTo: string) {
  sheet.mergeCells(`A1:${mergeTo}1`);
  sheet.mergeCells(`A2:${mergeTo}2`);
  sheet.mergeCells(`A3:${mergeTo}3`);
  [1, 2, 3].forEach((rowNumber) => {
    const row = sheet.getRow(rowNumber);
    row.height = rowNumber === 1 ? 28 : 20;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber === 1 ? "0B2F6F" : "123C86" } };
      cell.font = { bold: rowNumber !== 3, color: { argb: "FFFFFF" }, size: rowNumber === 1 ? 18 : 10 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
  });
  sheet.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFFFFF" } };
  sheet.getCell("A2").font = { bold: true, size: 11, color: { argb: "FFFFFF" } };
  sheet.getCell("A3").font = { size: 10, color: { argb: "E2E8F0" } };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getCell("A3").alignment = { vertical: "middle", horizontal: "center" };
}

function styleTotalRow(row: ExcelJS.Row, moneyColumns: number[] = []) {
  row.height = 24;
  row.eachCell((cell, colNumber) => {
    cell.font = { bold: true, color: { argb: "0F172A" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: softBlue } };
    cell.border = {
      top: { style: "medium", color: { argb: brandBlue } },
      left: { style: "thin", color: { argb: borderColor } },
      bottom: { style: "medium", color: { argb: brandBlue } },
      right: { style: "thin", color: { argb: borderColor } }
    };
    cell.alignment = { vertical: "middle" };
    if (moneyColumns.includes(colNumber)) cell.numFmt = rupiahNumberFormat;
  });
}

export async function GET(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const data = await readStore();
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "csv";
  const resolved = resolvePeriod(Object.fromEntries(url.searchParams.entries()));
  const transactions = filterTransactionsByPeriod(data.transactions, resolved.period);
  const expenses = filterExpensesByPeriod(data.expenses, resolved.period);
  const summary = calculateFinanceSummary(data.transactions, data.expenses, resolved.period);
  const rows = transactionRows(transactions);
  const expenseTableRows = expenseRows(expenses, data.users);
  const payments = paymentBreakdown(transactions);
  const selectedPeriod = periodText(resolved.period.start, resolved.period.end);
  const generatedAt = formatDate(new Date());
  const fileSuffix = safeFilename(`${resolved.label}-${formatDate(new Date(), "yyyyMMdd-HHmm")}`);
  const storeName = data.settings.storeName || "Laundry POS";
  const storeAddress = data.settings.address || "-";
  const storeWhatsapp = data.settings.whatsapp || "-";

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = storeName;
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.calcProperties.fullCalcOnLoad = true;

    const summarySheet = workbook.addWorksheet("Ringkasan", { views: [{ showGridLines: false, state: "frozen", ySplit: 4 }] });
    summarySheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    summarySheet.properties.defaultRowHeight = 22;
    summarySheet.columns = [
      { key: "label", width: 34 },
      { key: "value", width: 22 },
      { key: "label2", width: 34 },
      { key: "value2", width: 22 }
    ];
    summarySheet.getCell("A1").value = `LAPORAN KEUANGAN ${storeName.toUpperCase()}`;
    summarySheet.getCell("A2").value = `${storeAddress} | WhatsApp: ${storeWhatsapp}`;
    summarySheet.getCell("A3").value = `Periode: ${selectedPeriod} | Dibuat: ${generatedAt}`;
    styleReportBanner(summarySheet, "D");
    summarySheet.addRow([]);

    const summaryStart = 5;
    const summaryRows: [string, number | string, string, number | string][] = [
      ["Pendapatan kotor", summary.grossRevenue, "Pendapatan bersih", summary.netRevenue],
      ["Total diskon", summary.discounts, "Total pengeluaran", summary.expenses],
      ["Laba bersih", summary.netProfit, "Total piutang", summary.receivables],
      ["Transaksi lunas", summary.totalPaidTransactions, "Transaksi belum lunas", summary.totalUnpaidTransactions],
      ["Pelanggan baru", summary.newCustomers, "Repeat customer", summary.repeatCustomers],
      ["Rata-rata transaksi", summary.averageTransactionValue, "Rata-rata per pelanggan", summary.averageRevenuePerCustomer]
    ];
    const summaryMoneyLabels = new Set([
      "Pendapatan kotor",
      "Pendapatan bersih",
      "Total diskon",
      "Total pengeluaran",
      "Laba bersih",
      "Total piutang",
      "Rata-rata transaksi",
      "Rata-rata per pelanggan"
    ]);
    summaryRows.forEach((item) => summarySheet.addRow(item));
    for (let index = summaryStart; index < summaryStart + summaryRows.length; index += 1) {
      const row = summarySheet.getRow(index);
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin", color: { argb: borderColor } },
          left: { style: "thin", color: { argb: borderColor } },
          bottom: { style: "thin", color: { argb: borderColor } },
          right: { style: "thin", color: { argb: borderColor } }
        };
        cell.alignment = { vertical: "middle" };
        if (colNumber === 1 || colNumber === 3) {
          cell.font = { bold: true, color: { argb: "475569" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: softGray } };
        } else {
          const labelCell = row.getCell(colNumber === 2 ? 1 : 3);
          const isMoney = summaryMoneyLabels.has(String(labelCell.value ?? ""));
          cell.font = { bold: true, color: { argb: Number(cell.value ?? 0) < 0 ? "DC2626" : "0F172A" } };
          cell.numFmt = isMoney ? rupiahNumberFormat : "#,##0";
          cell.alignment = { horizontal: "right" };
        }
      });
    }

    const paymentStart = summaryStart + summaryRows.length + 3;
    summarySheet.getCell(`A${paymentStart}`).value = "Kas Masuk per Metode Pembayaran";
    summarySheet.getCell(`A${paymentStart}`).font = { bold: true, size: 13, color: { argb: "0F172A" } };
    const paymentHeader = summarySheet.getRow(paymentStart + 1);
    paymentHeader.values = ["Metode", "Nominal", "Persentase"];
    styleHeader(paymentHeader);
    const totalCashIn = Object.values(payments).reduce((sum, value) => sum + value, 0);
    Object.entries(payments).forEach(([method, amount]) => {
      summarySheet.addRow([paymentMethodLabel[method as PaymentMethod], amount, totalCashIn ? amount / totalCashIn : 0]);
    });
    styleBodyRows(summarySheet, paymentStart + 2, paymentStart + 1 + Object.keys(payments).length, ["B"]);
    summarySheet.getColumn("C").numFmt = "0.00%";
    for (let rowIndex = paymentStart + 2; rowIndex <= paymentStart + 1 + Object.keys(payments).length; rowIndex += 1) {
      summarySheet.getCell(`B${rowIndex}`).alignment = { horizontal: "right", vertical: "middle" };
      summarySheet.getCell(`C${rowIndex}`).alignment = { horizontal: "right", vertical: "middle" };
    }
    summarySheet.getCell("B8").numFmt = "#,##0";
    summarySheet.getCell("D8").numFmt = "#,##0";
    summarySheet.getCell("B9").numFmt = "#,##0";
    summarySheet.getCell("D9").numFmt = "#,##0";
    summarySheet.getCell("B10").numFmt = rupiahNumberFormat;
    summarySheet.getCell("D10").numFmt = rupiahNumberFormat;

    const profitSheet = workbook.addWorksheet("Laba Rugi", { views: [{ showGridLines: false, state: "frozen", ySplit: 5 }] });
    profitSheet.pageSetup = { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    profitSheet.columns = [
      { key: "komponen", width: 34 },
      { key: "nominal", width: 20 },
      { key: "catatan", width: 48 }
    ];
    profitSheet.getCell("A1").value = `LAPORAN LABA RUGI ${storeName.toUpperCase()}`;
    profitSheet.getCell("A2").value = `${storeAddress} | WhatsApp: ${storeWhatsapp}`;
    profitSheet.getCell("A3").value = `Periode: ${selectedPeriod} | Dibuat: ${generatedAt}`;
    styleReportBanner(profitSheet, "C");
    profitSheet.addRow([]);
    const profitHeader = profitSheet.getRow(5);
    profitHeader.values = ["Komponen", "Nominal", "Catatan"];
    styleHeader(profitHeader);
    const profitRows: [string, number, string][] = [
      ["Pendapatan kotor", summary.grossRevenue, "Total tagihan semua transaksi pada periode laporan"],
      ["Diskon", -summary.discounts, "Potongan yang mengurangi pendapatan"],
      ["Pendapatan bersih", summary.netRevenue, "Transaksi dengan status lunas"],
      ["Pengeluaran operasional", -summary.expenses, "Biaya operasional dari halaman pengeluaran"],
      ["Laba/Rugi bersih", summary.netProfit, "Pendapatan bersih dikurangi pengeluaran operasional"],
      ["Piutang akhir periode", summary.receivables, "Tagihan yang belum dilunasi pelanggan"]
    ];
    profitRows.forEach((row) => profitSheet.addRow(row));
    styleBodyRows(profitSheet, 6, 5 + profitRows.length, ["B"]);
    for (let rowIndex = 6; rowIndex <= 5 + profitRows.length; rowIndex += 1) {
      const valueCell = profitSheet.getCell(`B${rowIndex}`);
      valueCell.alignment = { horizontal: "right", vertical: "middle" };
      if (Number(valueCell.value ?? 0) < 0) valueCell.font = { bold: rowIndex === 10, color: { argb: "DC2626" } };
      if (rowIndex === 10) {
        profitSheet.getRow(rowIndex).height = 26;
        profitSheet.getRow(rowIndex).eachCell((cell) => {
          cell.font = { bold: true, color: { argb: Number(valueCell.value ?? 0) < 0 ? "DC2626" : "047857" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: Number(valueCell.value ?? 0) < 0 ? "FEE2E2" : "DCFCE7" } };
        });
      }
    }

    const trxSheet = workbook.addWorksheet("Transaksi", { views: [{ state: "frozen", ySplit: 4, activeCell: "A5" }] });
    trxSheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    trxSheet.columns = [
      { key: "no", width: 6 },
      { key: "nomor", width: 22 },
      { key: "tanggal", width: 20 },
      { key: "pelanggan", width: 24 },
      { key: "hp", width: 16 },
      { key: "kasir", width: 18 },
      { key: "subtotal", width: 15 },
      { key: "diskon", width: 14 },
      { key: "biayaTambahan", width: 16 },
      { key: "pajak", width: 14 },
      { key: "total", width: 16 },
      { key: "dibayar", width: 16 },
      { key: "piutang", width: 16 },
      { key: "metode", width: 16 },
      { key: "statusBayar", width: 18 },
      { key: "statusLaundry", width: 18 }
    ];
    trxSheet.getCell("A1").value = `LAPORAN TRANSAKSI ${storeName.toUpperCase()}`;
    trxSheet.getCell("A2").value = `${storeAddress} | WhatsApp: ${storeWhatsapp}`;
    trxSheet.getCell("A3").value = `Periode: ${selectedPeriod} | Dibuat: ${generatedAt}`;
    styleReportBanner(trxSheet, "P");
    const trxHeaderRow = trxSheet.getRow(4);
    trxHeaderRow.values = transactionHeaders;
    styleHeader(trxHeaderRow);
    trxSheet.addRows(rows);
    const trxEndRow = Math.max(5, rows.length + 4);
    if (rows.length) {
      styleBodyRows(trxSheet, 5, trxEndRow, ["G", "H", "I", "J", "K", "L", "M"]);
    }
    trxSheet.autoFilter = { from: "A4", to: "P4" };
    const totalRow = trxSheet.getRow(trxEndRow + 1);
    totalRow.values = ["", "", "", "", "", "TOTAL", summary.grossRevenue + summary.discounts - rows.reduce((sum, row) => sum + row.biayaTambahan + row.pajak, 0), summary.discounts, rows.reduce((sum, row) => sum + row.biayaTambahan, 0), rows.reduce((sum, row) => sum + row.pajak, 0), summary.grossRevenue, rows.reduce((sum, row) => sum + row.dibayar, 0), summary.receivables];
    styleTotalRow(totalRow, [7, 8, 9, 10, 11, 12, 13]);

    const expenseSheet = workbook.addWorksheet("Pengeluaran", { views: [{ state: "frozen", ySplit: 4, activeCell: "A5" }] });
    expenseSheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    expenseSheet.columns = [
      { key: "no", width: 6 },
      { key: "tanggal", width: 18 },
      { key: "kategori", width: 24 },
      { key: "deskripsi", width: 34 },
      { key: "metode", width: 16 },
      { key: "nominal", width: 16 },
      { key: "dibuatOleh", width: 18 }
    ];
    expenseSheet.getCell("A1").value = `LAPORAN PENGELUARAN ${storeName.toUpperCase()}`;
    expenseSheet.getCell("A2").value = `${storeAddress} | WhatsApp: ${storeWhatsapp}`;
    expenseSheet.getCell("A3").value = `Periode: ${selectedPeriod} | Dibuat: ${generatedAt}`;
    styleReportBanner(expenseSheet, "G");
    const expenseHeaderRow = expenseSheet.getRow(4);
    expenseHeaderRow.values = expenseHeaders;
    styleHeader(expenseHeaderRow);
    expenseSheet.addRows(expenseTableRows);
    const expenseEndRow = Math.max(5, expenseTableRows.length + 4);
    if (expenseTableRows.length) {
      styleBodyRows(expenseSheet, 5, expenseEndRow, ["F"]);
    }
    expenseSheet.autoFilter = { from: "A4", to: "G4" };
    const expenseTotalRow = expenseSheet.getRow(expenseEndRow + 1);
    expenseTotalRow.values = ["", "", "", "", "TOTAL", summary.expenses];
    expenseTotalRow.getCell(6).numFmt = rupiahNumberFormat;
    styleTotalRow(expenseTotalRow, [6]);

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename=laporan-laundry-${fileSuffix}.xlsx`
      }
    });
  }

  if (format === "pdf") {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 12;
    const contentWidth = pageWidth - marginX * 2;
    const totalCashIn = Object.values(payments).reduce((sum, value) => sum + value, 0);
    const paidRatio = rows.length ? Math.round((summary.totalPaidTransactions / rows.length) * 100) : 0;
    const serviceRows = servicePopularity(transactions).slice(0, 6);
    const expensesByCategory = expenses.reduce<Record<string, number>>((map, expense) => {
      map[expense.category] = (map[expense.category] ?? 0) + expense.amount;
      return map;
    }, {});
    const formatPercent = (value: number) => `${value.toFixed(1).replace(".0", "")}%`;

    function drawReportHeader() {
      doc.setFillColor(11, 47, 111);
      doc.rect(0, 0, pageWidth, 34, "F");
      doc.setFillColor(15, 76, 219);
      doc.rect(0, 0, 7, 34, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.text("LAPORAN KEUANGAN", marginX, 13);
      doc.setFontSize(11);
      doc.text(storeName.toUpperCase(), marginX, 21);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(doc.splitTextToSize(`${storeAddress} | WhatsApp: ${storeWhatsapp}`, 145), marginX, 27);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("PERIODE LAPORAN", pageWidth - 82, 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(selectedPeriod, pageWidth - 82, 19);
      doc.text(`Dibuat: ${generatedAt}`, pageWidth - 82, 25);
    }

    function sectionTitle(title: string, y: number, subtitle?: string, x = marginX, maxWidth = 120) {
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(title, x, y);
      if (subtitle) {
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(doc.splitTextToSize(subtitle, maxWidth), x, y + 5);
      }
    }

    function metricCard(label: string, value: string, x: number, y: number, width: number, accent: [number, number, number] = [15, 76, 219]) {
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, width, 21, 2, 2, "FD");
      doc.setFillColor(...accent);
      doc.roundedRect(x, y, 2.8, 21, 1, 1, "F");
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(label.toUpperCase(), x + 6, y + 7);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.text(value, x + 6, y + 15);
    }

    function table(head: string[][], body: (string | number)[][], startY: number, options?: Parameters<typeof autoTable>[1]) {
      autoTable(doc, {
        head,
        body,
        startY,
        theme: "grid",
        margin: { left: marginX, right: marginX, top: 42, bottom: 14 },
        styles: {
          fontSize: 7.2,
          cellPadding: 2,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          textColor: [30, 41, 59],
          overflow: "linebreak"
        },
        headStyles: {
          fillColor: [11, 47, 111],
          textColor: 255,
          fontStyle: "bold",
          halign: "center"
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        ...options
      });
    }

    drawReportHeader();
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.3);
    doc.text(
      "Ringkasan ini disusun dari transaksi, pembayaran, dan pengeluaran pada periode terpilih. Biaya operasional dicatat melalui pengeluaran agar laba rugi tidak terhitung ganda.",
      marginX,
      43,
      { maxWidth: contentWidth }
    );

    const cardY = 52;
    const cardGap = 3;
    const cardWidth = (contentWidth - cardGap * 5) / 6;
    metricCard("Pendapatan bersih", formatRupiah(summary.netRevenue), marginX, cardY, cardWidth, [16, 185, 129]);
    metricCard("Laba bersih", formatRupiah(summary.netProfit), marginX + (cardWidth + cardGap), cardY, cardWidth, [15, 76, 219]);
    metricCard("Piutang", formatRupiah(summary.receivables), marginX + (cardWidth + cardGap) * 2, cardY, cardWidth, [245, 158, 11]);
    metricCard("Pengeluaran", formatRupiah(summary.expenses), marginX + (cardWidth + cardGap) * 3, cardY, cardWidth, [239, 68, 68]);
    metricCard("Transaksi", `${rows.length} nota`, marginX + (cardWidth + cardGap) * 4, cardY, cardWidth, [71, 85, 105]);
    metricCard("Rasio lunas", `${paidRatio}%`, marginX + (cardWidth + cardGap) * 5, cardY, cardWidth, [20, 184, 166]);

    sectionTitle("Ikhtisar Laba Rugi", 84, "Format ringkas untuk melihat performa bisnis pada periode laporan.", marginX, 128);
    table(
      [["Komponen", "Nominal", "Catatan"]],
      [
        ["Pendapatan kotor", formatRupiah(summary.grossRevenue), "Total tagihan semua transaksi"],
        ["Diskon", formatRupiah(summary.discounts), "Potongan yang diberikan"],
        ["Pendapatan bersih", formatRupiah(summary.netRevenue), "Transaksi dengan status lunas"],
        ["Pengeluaran operasional", formatRupiah(summary.expenses), "Biaya operasional yang dicatat"],
        ["Laba bersih", formatRupiah(summary.netProfit), "Pendapatan bersih - pengeluaran"],
        ["Outstanding payment", formatRupiah(summary.outstandingPayment), "Tagihan belum dibayar"]
      ],
      90,
      {
        tableWidth: 128,
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 33, halign: "right", fontStyle: "bold" },
          2: { cellWidth: 50 }
        },
        didParseCell: (hook) => {
          if (hook.section === "body" && hook.row.index === 4) {
            hook.cell.styles.fillColor = [234, 241, 255];
            hook.cell.styles.fontStyle = "bold";
          }
        }
      }
    );

    sectionTitle("Kas Masuk per Metode", 84, "Komposisi penerimaan pembayaran.", 152, 62);
    table(
      [["Metode", "Nominal", "Porsi"]],
      Object.entries(payments).map(([method, amount]) => [
        paymentMethodLabel[method as PaymentMethod],
        formatRupiah(amount),
        totalCashIn ? formatPercent((amount / totalCashIn) * 100) : "0%"
      ]),
      90,
      {
        margin: { left: 152, right: marginX, top: 42, bottom: 14 },
        tableWidth: 62,
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 25, halign: "right", fontStyle: "bold" },
          2: { cellWidth: 13, halign: "right" }
        }
      }
    );

    sectionTitle("Produktivitas Pelanggan", 84, undefined, 222, 63);
    table(
      [["Metrik", "Nilai"]],
      [
        ["Pelanggan baru", summary.newCustomers],
        ["Repeat customer", summary.repeatCustomers],
        ["Rata-rata transaksi", formatRupiah(summary.averageTransactionValue)],
        ["Rata-rata per pelanggan", formatRupiah(summary.averageRevenuePerCustomer)]
      ],
      90,
      {
        margin: { left: 222, right: marginX, top: 42, bottom: 14 },
        tableWidth: 63,
        columnStyles: {
          0: { cellWidth: 36 },
          1: { cellWidth: 27, halign: "right", fontStyle: "bold" }
        }
      }
    );

    doc.addPage();
    drawReportHeader();
    sectionTitle("Layanan Paling Menghasilkan", 44, "Urutan berdasarkan omzet layanan pada periode aktif.", marginX, 128);
    table(
      [["Layanan", "Qty", "Omzet"]],
      serviceRows.map((item) => [
        item.layanan,
        item.jumlah,
        formatRupiah(item.omzet)
      ]),
      50,
      {
        tableWidth: 128,
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 15, halign: "right" },
          2: { cellWidth: 68, halign: "right", fontStyle: "bold" }
        }
      }
    );

    sectionTitle("Pengeluaran per Kategori", 44, "Ringkasan biaya operasional.", 152, 133);
    table(
      [["Kategori", "Nominal"]],
      Object.entries(expensesByCategory).length
        ? Object.entries(expensesByCategory).map(([category, amount]) => [category, formatRupiah(amount)])
        : [["Belum ada pengeluaran", formatRupiah(0)]],
      50,
      {
        margin: { left: 152, right: marginX, top: 42, bottom: 14 },
        tableWidth: 133,
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 53, halign: "right", fontStyle: "bold" }
        }
      }
    );

    doc.addPage();
    drawReportHeader();
    sectionTitle("Detail Transaksi", 44, "Daftar nota yang masuk dalam periode laporan.");
    autoTable(doc, {
      head: [["No", "No Nota", "Tanggal", "Pelanggan", "Kasir", "Total", "Dibayar", "Piutang", "Metode", "Bayar", "Laundry"]],
      body: rows.map((row) => [
        row.no,
        row.nomor,
        row.tanggal,
        row.pelanggan,
        row.kasir,
        formatRupiah(row.total),
        formatRupiah(row.dibayar),
        formatRupiah(row.piutang),
        row.metode,
        row.statusBayar,
        row.statusLaundry
      ]),
      startY: 50,
      theme: "grid",
      margin: { left: marginX, right: marginX, top: 42, bottom: 14 },
      styles: { fontSize: 7, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.1, textColor: [30, 41, 59] },
      headStyles: { fillColor: [11, 47, 111], textColor: 255, fontStyle: "bold", halign: "center" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: "center", cellWidth: 9 },
        1: { cellWidth: 29 },
        2: { cellWidth: 24 },
        5: { halign: "right", cellWidth: 23 },
        6: { halign: "right", cellWidth: 23 },
        7: { halign: "right", cellWidth: 23 }
      }
    });

    if (expenseTableRows.length) {
      doc.addPage();
      drawReportHeader();
      sectionTitle("Detail Pengeluaran", 44, "Daftar pengeluaran operasional pada periode laporan.");
      table(
        [["No", "Tanggal", "Kategori", "Deskripsi", "Metode", "Nominal", "Dibuat Oleh"]],
        expenseTableRows.map((row) => [row.no, row.tanggal, row.kategori, row.deskripsi, row.metode, formatRupiah(row.nominal), row.dibuatOleh]),
        50,
        {
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 25 },
            2: { cellWidth: 34 },
            3: { cellWidth: 78 },
            4: { cellWidth: 28 },
            5: { cellWidth: 35, halign: "right", fontStyle: "bold" },
            6: { cellWidth: 32 }
          }
        }
      );
    }

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${storeName} - Laporan Keuangan`, marginX, pageHeight - 7);
      doc.text(`Halaman ${page} dari ${totalPages}`, pageWidth - 38, pageHeight - 7);
    }

    return new NextResponse(Buffer.from(doc.output("arraybuffer")), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename=laporan-laundry-${fileSuffix}.pdf`
      }
    });
  }

  const csv = [
    "transaction_number,date,customer,cashier,grand_total,paid_amount,outstanding,payment_method,payment_status,laundry_status",
    ...rows.map((row) =>
      [row.nomor, row.tanggal, row.pelanggan, row.kasir, row.total, row.dibayar, row.piutang, row.metode, row.statusBayar, row.statusLaundry].map(csvCell).join(",")
    )
  ].join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv",
      "content-disposition": `attachment; filename=laporan-laundry-${fileSuffix}.csv`
    }
  });
}
