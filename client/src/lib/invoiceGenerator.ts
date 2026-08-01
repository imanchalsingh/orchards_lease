import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Booking, Orchard, User } from '@/types';
import { formatDate, formatCurrency } from '@/lib/format';

/* ─── Colour Palette ─── */
const FOREST    = [42, 78, 32]    as [number, number, number]; // #2a4e20
const CREAM_BG  = [252, 249, 242] as [number, number, number]; // #fcf9f2
const SAND      = [214, 204, 186] as [number, number, number]; // #d6ccba
const INK       = [28, 30, 27]    as [number, number, number]; // #1c1e1b
const SUB_TEXT  = [100, 108, 95]  as [number, number, number]; // #646c5f
const WHITE     = [255, 255, 255] as [number, number, number];
const LIGHT_GRN = [230, 240, 225] as [number, number, number];

const pageW = 210; // A4 mm
const pageH = 297;
const margin = 18;

function hRule(doc: jsPDF, y: number): void {
  doc.setDrawColor(...SAND);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
}

export interface PaymentInvoiceData {
  paymentId: string;
  transactionId: string;
  receiptNumber: string;
  paymentMethod: string;
  paidAt?: string;
  amount: number;
}

export function generatePaymentInvoicePDF(booking: Booking, payment?: PaymentInvoiceData): void {
  const orchard = booking.orchardId as Orchard;
  const renter  = booking.renterId  as User;
  const seller  = booking.sellerId  as User;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  /* ── Header Banner ── */
  doc.setFillColor(...FOREST);
  doc.rect(0, 0, pageW, 38, 'F');

  doc.setFontSize(20).setFont('helvetica', 'bold').setTextColor(...WHITE);
  doc.text('OrchardLease', margin, 16);

  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(200, 220, 190);
  doc.text('Official Payment Invoice & Receipt', margin, 22);

  doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(...WHITE);
  doc.text('INVOICE / RECEIPT', pageW - margin, 14, { align: 'right' });

  doc.setFontSize(7.5).setFont('helvetica', 'normal').setTextColor(200, 220, 190);
  doc.text(`Receipt #: ${payment?.receiptNumber || `RCP-${booking._id.slice(-6).toUpperCase()}`}`, pageW - margin, 20, { align: 'right' });
  doc.text(`Date: ${formatDate(payment?.paidAt || booking.createdAt)}`, pageW - margin, 25.5, { align: 'right' });

  /* ── Status Badge ── */
  doc.setFillColor(42, 120, 50); // Green for Paid
  doc.roundedRect(pageW - margin - 24, 27.5, 24, 6.5, 2, 2, 'F');
  doc.setFontSize(7.5).setFont('helvetica', 'bold').setTextColor(...WHITE);
  doc.text('PAID', pageW - margin - 12, 32, { align: 'center' });

  /* ── Body Background ── */
  doc.setFillColor(...CREAM_BG);
  doc.rect(0, 38, pageW, pageH - 38, 'F');

  let y = 48;

  /* ── Billed To / Billed From Section ── */
  const col1 = margin + 2;
  const col2 = margin + ((pageW - margin * 2) / 2) + 6;

  doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(...FOREST);
  doc.text('BILLED FROM (LESSOR)', col1, y);
  doc.text('BILLED TO (LESSEE)', col2, y);
  y += 3;
  hRule(doc, y);
  y += 5;

  doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(...INK);
  doc.text(seller?.name || 'Orchard Owner', col1, y);
  doc.text(renter?.name || 'Valued Renter', col2, y);

  y += 4.5;
  doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(...SUB_TEXT);
  doc.text(seller?.email || '—', col1, y);
  doc.text(renter?.email || '—', col2, y);

  if (seller?.phone) {
    y += 4;
    doc.text(`Phone: ${seller.phone}`, col1, y);
  }
  if (renter?.phone) {
    doc.text(`Phone: ${renter.phone}`, col2, y);
  }

  y += 10;
  hRule(doc, y);
  y += 6;

  /* ── Payment & Lease Summary Table ── */
  doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(...FOREST);
  doc.text('LEASE & PAYMENT BREAKDOWN', margin, y);
  y += 4;

  const basePrice = orchard?.price || Math.round(booking.totalAmount * 0.77);
  const platformFee = Math.round(basePrice * 0.08);
  const deposit = Math.round(basePrice * 0.15);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    headStyles: {
      fillColor: LIGHT_GRN,
      textColor: FOREST,
      fontSize: 8.5,
      fontStyle: 'bold',
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: INK,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 40 },
      2: { halign: 'right' },
    },
    head: [['Item Description', 'Lease Period', 'Amount']],
    body: [
      [
        `Orchard Lease Fee — ${orchard?.gardenName || 'Orchard Plot'}`,
        `${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}`,
        formatCurrency(basePrice),
      ],
      ['Platform Processing Fee (8%)', 'Standard', formatCurrency(platformFee)],
      ['Refundable Security Deposit', 'Refundable', formatCurrency(deposit)],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  /* ── Total Block ── */
  doc.setFillColor(245, 243, 237);
  doc.roundedRect(pageW - margin - 70, y, 70, 18, 2, 2, 'F');

  doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(...SUB_TEXT);
  doc.text('TOTAL AMOUNT PAID', pageW - margin - 65, y + 6);

  doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(...FOREST);
  doc.text(formatCurrency(booking.totalAmount), pageW - margin - 5, y + 13, { align: 'right' });

  y += 26;
  hRule(doc, y);
  y += 6;

  /* ── Transaction Metadata ── */
  doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(...FOREST);
  doc.text('TRANSACTION DETAILS', margin, y);
  y += 5;

  doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(...SUB_TEXT);
  doc.text(`Transaction ID: ${payment?.transactionId || `TXN-${booking._id}`}`, margin, y);
  y += 4.5;
  doc.text(`Payment Method: ${payment?.paymentMethod || 'Online Transfer / UPI'}`, margin, y);
  y += 4.5;
  doc.text(`Booking Reference ID: ${booking._id}`, margin, y);

  /* ── Footer ── */
  const footerY = pageH - 12;
  hRule(doc, footerY - 2);
  doc.setFontSize(7.5).setFont('helvetica', 'italic').setTextColor(...SUB_TEXT);
  doc.text('Thank you for leasing through OrchardLease. This is an official electronic payment receipt.', margin, footerY);

  /* ── Download PDF ── */
  doc.save(`invoice-${booking._id}.pdf`);
}
