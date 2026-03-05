import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Payslip } from "@/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const formatCurrency = (amount: number) =>
  Number(amount).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function generatePayslipPdf(payslip: Payslip, runMonth?: number, runYear?: number) {
  const doc = new jsPDF();
  
  // Use provided month/year or fallback to payslip.payrollRun
  const month = runMonth || payslip.payrollRun?.month;
  const year = runYear || payslip.payrollRun?.year;
  
  const monthName = month ? MONTH_NAMES[month - 1] : "";
  const title = `${monthName} ${year}`;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("THELIX HOLDINGS", 105, 20, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Payslip", 105, 30, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 105, 40, { align: "center" });

  // Horizontal Line
  doc.setLineWidth(0.5);
  doc.line(14, 45, 196, 45);

  // Employee Details
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Employee Details", 14, 55);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const emp = payslip.employee;
  let y = 65;
  if (emp) {
    doc.text(`Name: ${emp.fullName}`, 14, y);
    y += 7;
    doc.text(`Employee ID: ${emp.employeeId}`, 14, y);
    y += 7;
    doc.text(`Job Title: ${emp.jobTitle}`, 14, y);
    y += 7;
    doc.text(`Email: ${emp.workEmail}`, 14, y);
    y += 10;
  }

  // Horizontal Line
  doc.line(14, y, 196, y);
  y += 10;

  // Earnings & Deductions Table
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Earnings & Deductions", 14, y);
  y += 5;

  const tableData = [
    ["Basic Salary", formatCurrency(payslip.basicSalary)],
    ["Allowances", formatCurrency(payslip.allowances)],
    ["Deductions", `(${formatCurrency(payslip.deductions)})`],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Description", "Amount"]],
    body: tableData,
    theme: "plain",
    headStyles: { fontStyle: "bold", fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: { bottom: 0.5 }, lineColor: [0, 0, 0] },
    bodyStyles: { textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: "auto", halign: "right" },
    },
    styles: { fontSize: 10, cellPadding: 3 },
  });

  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 10;

  // Horizontal Line before Net Pay
  doc.line(14, finalY, 196, finalY);
  finalY += 10;

  // Net Pay
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Net Pay", 14, finalY);
  doc.text(formatCurrency(payslip.netPay), 196 - 14, finalY, { align: "right" });
  finalY += 15;

  // Footer Line
  doc.line(14, finalY, 196, finalY);
  finalY += 10;

  // Footer Text
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(
    "This is a computer-generated document and does not require a signature.",
    105,
    finalY,
    { align: "center" }
  );

  // Save the PDF
  const fileName = `payslip-${emp?.employeeId}-${monthName}-${year}.pdf`;
  doc.save(fileName);
}
