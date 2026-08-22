import jsPDF from 'jspdf';
import type { GstInvoiceRecord } from '../types/gst';
import { formatIndianCurrency } from './gstCalculations';
import { formatStateWithCode } from './indianStates';

/**
 * Pre-scales and loads an image into a clean white canvas Base64 Data URL.
 */
async function getScaledImageDataUrl(
  src: string,
  maxWidth = 300,
  maxHeight = 300
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let w = img.width;
      let h = img.height;

      if (w > maxWidth || h > maxHeight) {
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } else {
        resolve(src);
      }
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
}

/**
 * Clean currency string for jsPDF standard fonts (avoids unicode symbol replacement issues).
 */
function pdfCurrency(amount: number, prefix = ''): string {
  const formatted = formatIndianCurrency(amount, false);
  return prefix ? `${prefix}${formatted}` : formatted;
}

/**
 * Generates and downloads a compact, perfectly aligned A4 GST Tax Invoice / Draft Invoice PDF.
 */
export async function generateInvoicePDF(
  invoice: GstInvoiceRecord,
  action: 'download' | 'blob' = 'download'
): Promise<Blob | void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm

  const seller = invoice.seller_snapshot || {};
  const customer = invoice.customer_snapshot || {};
  const items = invoice.items || [];
  const isDraft = Boolean(invoice.is_draft);

  // 1. Preload Logo and UPI QR Code
  let logoBase64 = '';
  if (seller.logo_url) {
    logoBase64 = await getScaledImageDataUrl(seller.logo_url, 300, 150);
  }

  let upiQrBase64 = '';
  if (seller.upi_qr_url) {
    upiQrBase64 = await getScaledImageDataUrl(seller.upi_qr_url, 200, 200);
  }

  // 2. Draft Watermark if in Draft Mode
  if (isDraft) {
    doc.saveGraphicsState();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(54);
    doc.setTextColor(235, 238, 243); // very faint slate watermark
    doc.text('DRAFT', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45,
    });
    doc.restoreGraphicsState();
  }

  let cursorY = margin;

  // 3. Top Header Banner / Title Bar
  if (isDraft) {
    doc.setFillColor(51, 65, 85); // Slate-700
  } else {
    doc.setFillColor(15, 23, 42); // Slate-900
  }
  doc.rect(margin, cursorY, contentWidth, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(isDraft ? 'INVOICE' : 'TAX INVOICE', margin + 5, cursorY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // Slate-300
  const supplyType = invoice.is_inter_state ? 'INTER-STATE SUPPLY (IGST)' : 'INTRA-STATE SUPPLY (CGST + SGST)';
  doc.text(supplyType, pageWidth - margin - 5, cursorY + 10.5, { align: 'right' });

  cursorY += 20;

  // 4. Seller Details (Left) & Invoice Metadata Box (Right)
  const metaBoxY = cursorY;
  const metaBoxWidth = 70;
  const metaBoxX = pageWidth - margin - metaBoxWidth; // 128mm
  const sellerMaxWidth = metaBoxX - margin - 6; // ~110mm

  // Logo + Seller
  let textLeftX = margin;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', margin, cursorY, 22, 22);
      textLeftX = margin + 26;
    } catch {
      // ignore image errors
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(seller.name || 'Business Name', textLeftX, cursorY + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  let sellerLineY = cursorY + 8;
  if (seller.address) {
    const splitAddr = doc.splitTextToSize(
      `${seller.address}${seller.city ? ', ' + seller.city : ''}${seller.pincode ? ' - ' + seller.pincode : ''}`,
      sellerMaxWidth - (textLeftX - margin)
    );
    doc.text(splitAddr, textLeftX, sellerLineY);
    sellerLineY += splitAddr.length * 3.6;
  }

  if (seller.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${seller.gstin}`, textLeftX, sellerLineY);
    doc.setFont('helvetica', 'normal');
    sellerLineY += 3.8;
  }

  doc.text(`State: ${formatStateWithCode(seller.state, seller.state_code) || 'Uttar Pradesh (09)'}`, textLeftX, sellerLineY);
  sellerLineY += 3.8;

  if (seller.phone || seller.email) {
    const contactText = [seller.phone ? `Phone: ${seller.phone}` : '', seller.email ? `Email: ${seller.email}` : '']
      .filter(Boolean)
      .join('  |  ');
    const splitContact = doc.splitTextToSize(contactText, sellerMaxWidth - (textLeftX - margin));
    doc.text(splitContact, textLeftX, sellerLineY);
    sellerLineY += splitContact.length * 3.6;
  }

  // Invoice Metadata Box (Right)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(metaBoxX, metaBoxY, metaBoxWidth, 34, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Invoice #:', metaBoxX + 4, metaBoxY + 6);
  doc.text(invoice.invoice_number || 'INV-0001', metaBoxX + metaBoxWidth - 4, metaBoxY + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Invoice Date:', metaBoxX + 4, metaBoxY + 11.5);
  doc.text(invoice.invoice_date || '-', metaBoxX + metaBoxWidth - 4, metaBoxY + 11.5, { align: 'right' });

  doc.text('Place of Supply:', metaBoxX + 4, metaBoxY + 17);
  doc.text(
    formatStateWithCode(invoice.place_of_supply, invoice.place_of_supply_state_code) || 'Uttar Pradesh (09)',
    metaBoxX + metaBoxWidth - 4,
    metaBoxY + 17,
    { align: 'right' }
  );

  doc.text('Reverse Charge:', metaBoxX + 4, metaBoxY + 22.5);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.reverse_charge ? 'YES' : 'NO', metaBoxX + metaBoxWidth - 4, metaBoxY + 22.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  doc.text('Status:', metaBoxX + 4, metaBoxY + 28);
  doc.setFont('helvetica', 'bold');
  if (isDraft) {
    doc.setTextColor(147, 51, 234); // Purple
    doc.text('DRAFT (REVIEW)', metaBoxX + metaBoxWidth - 4, metaBoxY + 28, { align: 'right' });
  } else if (invoice.payment_status === 'paid') {
    doc.setTextColor(22, 163, 74); // Green
    doc.text('PAID', metaBoxX + metaBoxWidth - 4, metaBoxY + 28, { align: 'right' });
  } else if (invoice.payment_status === 'partial') {
    doc.setTextColor(217, 119, 6); // Amber
    doc.text('PARTIAL', metaBoxX + metaBoxWidth - 4, metaBoxY + 28, { align: 'right' });
  } else {
    doc.setTextColor(220, 38, 38); // Red
    doc.text('UNPAID', metaBoxX + metaBoxWidth - 4, metaBoxY + 28, { align: 'right' });
  }

  cursorY = Math.max(sellerLineY, metaBoxY + 36) + 2;

  // 5. Bill To & Ship To 2-Column Section
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 4;

  const colW = (contentWidth - 6) / 2; // 90mm

  // Bill To (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('BILL TO:', margin, cursorY + 2.5);

  let billY = cursorY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(customer.name || 'Cash Customer', margin, billY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  billY += 3.8;

  if (customer.billing_address) {
    const rawBillAddr = customer.billing_address;
    const fullBillAddr =
      customer.pincode && !rawBillAddr.includes(customer.pincode)
        ? `${rawBillAddr}${customer.city && !rawBillAddr.includes(customer.city) ? ', ' + customer.city : ''} - ${customer.pincode}`
        : rawBillAddr;
    const splitAddr = doc.splitTextToSize(fullBillAddr, colW - 4);
    doc.text(splitAddr, margin, billY);
    billY += splitAddr.length * 3.6;
  }

  if (customer.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${customer.gstin}`, margin, billY);
    doc.setFont('helvetica', 'normal');
    billY += 3.8;
  }

  const custStateStr = formatStateWithCode(
    customer.state || invoice.place_of_supply,
    customer.state_code || invoice.place_of_supply_state_code
  );
  doc.text(`State: ${custStateStr}`, margin, billY);
  billY += 3.8;

  if (customer.phone) {
    doc.text(`Phone: ${customer.phone}`, margin, billY);
    billY += 3.8;
  }

  // Ship To (Right)
  const shipX = margin + colW + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SHIP TO:', shipX, cursorY + 2.5);

  let shipY = cursorY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(customer.name || 'Same as Bill To', shipX, shipY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  shipY += 3.8;

  const rawShipAddr =
    invoice.shipping_address || customer.shipping_address || customer.billing_address || 'Same as Billing Address';
  const fullShipAddr =
    customer.pincode && rawShipAddr !== 'Same as Billing Address' && !rawShipAddr.includes(customer.pincode)
      ? `${rawShipAddr}${customer.city && !rawShipAddr.includes(customer.city) ? ', ' + customer.city : ''} - ${customer.pincode}`
      : rawShipAddr;
  const splitShip = doc.splitTextToSize(fullShipAddr, colW - 4);
  doc.text(splitShip, shipX, shipY);
  shipY += splitShip.length * 3.6;

  cursorY = Math.max(billY, shipY) + 3;

  // 6. Dynamic Table Columns & Layout (No overlap, clean line wrapping)
  const hasItemDiscounts = items.some((item) => (item.discount_amount || 0) > 0);

  type TableCol = { key: string; label: string; w: number; align: 'left' | 'center' | 'right' };

  // Total table width must strictly equal contentWidth (186mm)
  const cols: TableCol[] = hasItemDiscounts
    ? [
        { key: 'idx', label: '#', w: 7, align: 'left' },
        { key: 'desc', label: 'Item & Description', w: 52, align: 'left' },
        { key: 'hsn', label: 'HSN/SAC', w: 16, align: 'center' },
        { key: 'qty', label: 'Qty', w: 14, align: 'center' },
        { key: 'rate', label: 'Rate', w: 18, align: 'right' },
        { key: 'disc', label: 'Discount', w: 16, align: 'right' },
        { key: 'taxable', label: 'Taxable Value', w: 20, align: 'right' },
        { key: 'gst', label: 'GST %', w: 15, align: 'center' },
        { key: 'total', label: 'Amount', w: 28, align: 'right' },
      ]
    : [
        { key: 'idx', label: '#', w: 7, align: 'left' },
        { key: 'desc', label: 'Item & Description', w: 68, align: 'left' },
        { key: 'hsn', label: 'HSN/SAC', w: 18, align: 'center' },
        { key: 'qty', label: 'Qty', w: 14, align: 'center' },
        { key: 'rate', label: 'Rate', w: 20, align: 'right' },
        { key: 'taxable', label: 'Taxable Value', w: 23, align: 'right' },
        { key: 'gst', label: 'GST %', w: 16, align: 'center' },
        { key: 'total', label: 'Amount', w: 20, align: 'right' },
      ];

  // Table Header Bar
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, cursorY, contentWidth, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, cursorY + 7, margin + contentWidth, cursorY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);

  let headerX = margin;
  cols.forEach((col) => {
    if (col.align === 'right') {
      doc.text(col.label, headerX + col.w - 3, cursorY + 4.8, { align: 'right' });
    } else if (col.align === 'center') {
      doc.text(col.label, headerX + col.w / 2, cursorY + 4.8, { align: 'center' });
    } else {
      doc.text(col.label, headerX + (col.key === 'idx' ? 1.5 : 2), cursorY + 4.8);
    }
    headerX += col.w;
  });

  cursorY += 8;

  // 7. Table Rows (With Robust Multi-line Wrapping to Prevent Horizontal Overlap)
  items.forEach((item, index) => {
    if (cursorY > pageHeight - 65) {
      doc.addPage();
      cursorY = margin;
    }

    const descColWidth = cols[1].w - 3; // padding inside column

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const nameLines = doc.splitTextToSize(item.product_name_snapshot || 'Custom Item', descColWidth);

    let descLines: string[] = [];
    if (item.description_snapshot) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      descLines = doc.splitTextToSize(item.description_snapshot, descWidth(descColWidth));
    }

    function descWidth(w: number) {
      return w;
    }

    const textLinesHeight = nameLines.length * 3.6 + (descLines.length > 0 ? descLines.length * 3.0 + 1 : 0);
    const rowHeight = Math.max(7.5, textLinesHeight + 3);

    const rowBaselineY = cursorY + 4;

    // # (Index)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    let colX = margin;
    doc.text((index + 1).toString(), colX + 1.5, rowBaselineY);
    colX += cols[0].w;

    // Item Name & Description (Multi-line)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    let currentDescY = rowBaselineY;
    nameLines.forEach((line: string) => {
      doc.text(line, colX + 2, currentDescY);
      currentDescY += 3.6;
    });

    if (descLines.length > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      currentDescY += 0.5;
      descLines.forEach((line: string) => {
        doc.text(line, colX + 2, currentDescY);
        currentDescY += 3.0;
      });
    }
    colX += cols[1].w;

    // HSN/SAC
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(item.hsn_sac_snapshot || '-', colX + cols[2].w / 2, rowBaselineY, { align: 'center' });
    colX += cols[2].w;

    // Qty + Unit
    doc.text(`${item.quantity} ${item.unit || 'PCS'}`, colX + cols[3].w / 2, rowBaselineY, { align: 'center' });
    colX += cols[3].w;

    // Rate
    doc.text(pdfCurrency(item.unit_price), colX + cols[4].w - 3, rowBaselineY, { align: 'right' });
    colX += cols[4].w;

    // Discount (if column present)
    if (hasItemDiscounts) {
      doc.text(
        item.discount_amount > 0 ? pdfCurrency(item.discount_amount) : '-',
        colX + cols[5].w - 3,
        rowBaselineY,
        { align: 'right' }
      );
      colX += cols[5].w;

      // Taxable Value
      doc.text(pdfCurrency(item.taxable_amount), colX + cols[6].w - 3, rowBaselineY, { align: 'right' });
      colX += cols[6].w;

      // GST %
      doc.text(`${item.gst_rate ?? 18}%`, colX + cols[7].w / 2, rowBaselineY, { align: 'center' });
      colX += cols[7].w;

      // Amount
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(pdfCurrency(item.line_total), colX + cols[8].w - 3, rowBaselineY, { align: 'right' });
    } else {
      // Taxable Value
      doc.text(pdfCurrency(item.taxable_amount), colX + cols[5].w - 3, rowBaselineY, { align: 'right' });
      colX += cols[5].w;

      // GST %
      doc.text(`${item.gst_rate ?? 18}%`, colX + cols[6].w / 2, rowBaselineY, { align: 'center' });
      colX += cols[6].w;

      // Amount
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(pdfCurrency(item.line_total), colX + cols[7].w - 3, rowBaselineY, { align: 'right' });
    }

    cursorY += rowHeight;

    // Row separator line
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, cursorY, margin + contentWidth, cursorY);
  });

  if (cursorY > pageHeight - 75) {
    doc.addPage();
    cursorY = margin;
  }

  cursorY += 5;

  // 8. Totals Breakdown (Right) & Payment / Notes / QR (Left)
  const summaryBoxWidth = 76;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth; // 122mm
  const detailsBoxWidth = contentWidth - summaryBoxWidth - 6; // 104mm

  // Left Details Block (Payment Box with optional UPI QR Code)
  let leftDetailY = cursorY + 1;
  if (seller.bank_name || seller.upi_id || upiQrBase64) {
    const boxHeight = upiQrBase64 ? 26 : 20;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, leftDetailY, detailsBoxWidth, boxHeight, 2, 2, 'F');

    let payTextX = margin + 3.5;
    if (upiQrBase64) {
      try {
        doc.addImage(upiQrBase64, 'JPEG', margin + 3, leftDetailY + 2.5, 21, 21);
        payTextX = margin + 27;
      } catch {
        // ignore
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Payment Instructions / Scan QR:', payTextX, leftDetailY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    let bankTextY = leftDetailY + 8.5;

    if (seller.bank_name) {
      doc.text(`Bank: ${seller.bank_name} | A/C: ${seller.bank_account_no || '-'}`, payTextX, bankTextY);
      bankTextY += 3.6;
      doc.text(`IFSC: ${seller.bank_ifsc || '-'}`, payTextX, bankTextY);
      bankTextY += 3.6;
    }
    if (seller.upi_id) {
      doc.setFont('helvetica', 'bold');
      doc.text(`UPI ID: ${seller.upi_id}`, payTextX, bankTextY);
    }
    leftDetailY += boxHeight + 3;
  }

  if (invoice.notes || seller.default_notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Notes:', margin, leftDetailY + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const splitNotes = doc.splitTextToSize(invoice.notes || seller.default_notes || '', detailsBoxWidth);
    doc.text(splitNotes, margin, leftDetailY + 6.2);
    leftDetailY += splitNotes.length * 3.2 + 3;
  }

  // Right Totals Table (Exact Mathematical Alignment)
  let sumY = cursorY;
  const rowH = 4.6;

  const summaryRows: { label: string; val: string; isBold?: boolean }[] = [
    { label: 'Subtotal (Gross):', val: pdfCurrency(invoice.subtotal) },
  ];

  if (invoice.item_discount_total > 0) {
    summaryRows.push({ label: 'Item Discounts:', val: `-${pdfCurrency(invoice.item_discount_total)}` });
  }

  if (invoice.invoice_discount_amount > 0) {
    summaryRows.push({ label: 'Invoice Discount:', val: `-${pdfCurrency(invoice.invoice_discount_amount)}` });
  }

  summaryRows.push({ label: 'Taxable Value:', val: pdfCurrency(invoice.taxable_amount) });

  if (invoice.shipping_amount > 0) {
    summaryRows.push({ label: 'Shipping Charges:', val: pdfCurrency(invoice.shipping_amount) });
  }

  // Determine explicit tax rate percentages per Rule 46(l)
  const uniqueRates = Array.from(new Set(items.map((it) => it.gst_rate ?? 18)));
  const singleRate = uniqueRates.length === 1 ? uniqueRates[0] : null;

  if (invoice.is_inter_state) {
    const igstLabel = singleRate !== null ? `IGST @ ${singleRate}%:` : 'IGST:';
    summaryRows.push({ label: igstLabel, val: pdfCurrency(invoice.igst) });
  } else {
    const cgstLabel = singleRate !== null ? `CGST @ ${singleRate / 2}%:` : 'CGST:';
    const sgstLabel = singleRate !== null ? `SGST @ ${singleRate / 2}%:` : 'SGST:';
    summaryRows.push({ label: cgstLabel, val: pdfCurrency(invoice.cgst) });
    summaryRows.push({ label: sgstLabel, val: pdfCurrency(invoice.sgst) });
  }

  summaryRows.push({ label: 'Total GST Amount:', val: pdfCurrency(invoice.total_gst), isBold: true });

  summaryRows.forEach((r) => {
    doc.setFont('helvetica', r.isBold ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(r.isBold ? 15 : 71, r.isBold ? 23 : 85, r.isBold ? 42 : 105);
    doc.text(r.label, summaryBoxX + 2, sumY + 3.2);
    doc.text(r.val, pageWidth - margin - 3, sumY + 3.2, { align: 'right' });
    sumY += rowH;
  });

  // Grand Total Filled Banner (Zero Clipping, 3mm Clean Margin)
  if (isDraft) {
    doc.setFillColor(51, 65, 85); // Slate-700
  } else {
    doc.setFillColor(15, 23, 42); // Slate-900
  }
  doc.rect(summaryBoxX, sumY, summaryBoxWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(isDraft ? 'Estimated Total:' : 'Grand Total:', summaryBoxX + 3, sumY + 4.8);
  doc.text(pdfCurrency(invoice.grand_total), pageWidth - margin - 3, sumY + 4.8, { align: 'right' });

  sumY += 9;

  // Amount Paid & Balance Due (For Final Invoices)
  if (!isDraft) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Amount Paid:', summaryBoxX + 2, sumY + 3.2);
    doc.text(pdfCurrency(invoice.amount_paid), pageWidth - margin - 3, sumY + 3.2, { align: 'right' });
    sumY += rowH;

    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due:', summaryBoxX + 2, sumY + 3.2);
    if (invoice.balance_due > 0) {
      doc.setTextColor(220, 38, 38); // Red
    } else {
      doc.setTextColor(22, 163, 74); // Green
    }
    doc.text(pdfCurrency(invoice.balance_due), pageWidth - margin - 3, sumY + 3.2, { align: 'right' });
    sumY += rowH;
  }

  // 9. Signatory Block & Statutory Computer-Generated Disclaimer (Rule 46(q))
  const sigY = Math.max(leftDetailY, sumY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`For ${seller.name || 'Business'}`, pageWidth - margin - 3, sigY, { align: 'right' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signatory', pageWidth - margin - 3, sigY + 10, { align: 'right' });
  doc.setFontSize(6.5);
  doc.text('This is a computer-generated invoice and requires no signature.', pageWidth - margin - 3, sigY + 14, {
    align: 'right',
  });

  // 10. Social Media & Website Footer (Clean ASCII Text)
  const socialHandles: string[] = [];
  if (seller.instagram_handle) socialHandles.push(`Instagram: @${seller.instagram_handle.replace('@', '')}`);
  if (seller.whatsapp_number) socialHandles.push(`WhatsApp: ${seller.whatsapp_number}`);
  if (seller.website) socialHandles.push(`Web: ${seller.website}`);

  if (socialHandles.length > 0) {
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(socialHandles.join('   |   '), pageWidth / 2, pageHeight - 7.5, { align: 'center' });
  }

  const prefix = isDraft ? 'DRAFT-' : '';
  const fileName = `${prefix}${invoice.invoice_number || 'INV'}-${(customer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

  if (action === 'blob') {
    return doc.output('blob');
  }

  doc.save(fileName);
}
