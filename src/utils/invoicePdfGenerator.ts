import jsPDF from 'jspdf';
import type { GstInvoiceRecord } from '../types/gst';
import { formatIndianCurrency } from './gstCalculations';

/**
 * Pre-scales image for lightweight, fast jsPDF embedding
 */
const getScaledImageDataUrl = (url: string, maxWidth = 300, maxHeight = 150): Promise<string> => {
  return new Promise((resolve) => {
    if (!url) {
      resolve('');
      return;
    }
    if (url.startsWith('data:image')) {
      resolve(url);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
          return;
        }
      } catch (e) {
        console.warn('Image scaling warning:', e);
      }
      resolve('');
    };

    img.onerror = () => resolve('');
    img.src = url;
  });
};

/**
 * Generates and downloads a compact, professional A4 GST Tax Invoice / Draft Proforma PDF.
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
    doc.setFontSize(48);
    doc.setTextColor(226, 232, 240); // very faint slate
    doc.text('DRAFT', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45,
    });
    doc.restoreGraphicsState();
  }

  let cursorY = margin;

  // Header Banner / Title Bar
  if (isDraft) {
    doc.setFillColor(51, 65, 85); // Slate-700 for draft/proforma
  } else {
    doc.setFillColor(15, 23, 42); // Slate-900 for final tax invoice
  }
  doc.rect(margin, cursorY, contentWidth, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(isDraft ? 'INVOICE' : 'TAX INVOICE', margin + 6, cursorY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate-300
  const supplyType = invoice.is_inter_state ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST + SGST)';
  doc.text(supplyType, pageWidth - margin - 6, cursorY + 11.5, { align: 'right' });

  cursorY += 22;

  // Seller Details (Left) + Invoice Metadata (Right)
  const metaBoxY = cursorY;

  // Logo + Seller
  let textLeftX = margin;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', margin, cursorY, 24, 24);
      textLeftX = margin + 28;
    } catch {
      // ignore
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(seller.name || 'Business Name', textLeftX, cursorY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate-600

  let sellerLineY = cursorY + 9;
  if (seller.address) {
    doc.text(`${seller.address}, ${seller.city || ''} ${seller.pincode || ''}`, textLeftX, sellerLineY);
    sellerLineY += 4.5;
  }
  if (seller.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${seller.gstin}`, textLeftX, sellerLineY);
    doc.setFont('helvetica', 'normal');
    sellerLineY += 4.5;
  }
  // Remove bracket numbers in State
  doc.text(`State: ${seller.state || 'Maharashtra'}`, textLeftX, sellerLineY);
  sellerLineY += 4.5;
  if (seller.phone || seller.email) {
    doc.text(`Phone: ${seller.phone || '-'} | Email: ${seller.email || '-'}`, textLeftX, sellerLineY);
    sellerLineY += 4.5;
  }

  // Invoice Metadata Box (Right)
  const metaBoxWidth = 72;
  const metaBoxX = pageWidth - margin - metaBoxWidth;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(metaBoxX, metaBoxY, metaBoxWidth, 32, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(isDraft ? 'Estimate / Draft #:' : 'Invoice No:', metaBoxX + 4, metaBoxY + 7);
  doc.text(invoice.invoice_number, metaBoxX + metaBoxWidth - 4, metaBoxY + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Invoice Date:', metaBoxX + 4, metaBoxY + 13);
  doc.text(invoice.invoice_date, metaBoxX + metaBoxWidth - 4, metaBoxY + 13, { align: 'right' });

  doc.text('Place of Supply:', metaBoxX + 4, metaBoxY + 19);
  // Remove bracket numbers
  doc.text(`${invoice.place_of_supply}`, metaBoxX + metaBoxWidth - 4, metaBoxY + 19, { align: 'right' });

  doc.text('Status:', metaBoxX + 4, metaBoxY + 25);
  doc.setFont('helvetica', 'bold');
  if (isDraft) {
    doc.setTextColor(147, 51, 234); // Purple-600
    doc.text('DRAFT (REVIEW)', metaBoxX + metaBoxWidth - 4, metaBoxY + 25, { align: 'right' });
  } else if (invoice.payment_status === 'paid') {
    doc.setTextColor(22, 163, 74); // Green-600
    doc.text('PAID', metaBoxX + metaBoxWidth - 4, metaBoxY + 25, { align: 'right' });
  } else if (invoice.payment_status === 'partial') {
    doc.setTextColor(217, 119, 6); // Amber-600
    doc.text('PARTIAL', metaBoxX + metaBoxWidth - 4, metaBoxY + 25, { align: 'right' });
  } else {
    doc.setTextColor(220, 38, 38); // Red-600
    doc.text('UNPAID', metaBoxX + metaBoxWidth - 4, metaBoxY + 25, { align: 'right' });
  }

  cursorY = Math.max(sellerLineY, metaBoxY + 35) + 2;

  // Bill To / Ship To Container
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 4;

  const colW = contentWidth / 2 - 2;

  // Bill To (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('BILL TO:', margin, cursorY + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  let billY = cursorY + 8;
  doc.setFont('helvetica', 'bold');
  doc.text(customer.name || 'Cash Customer', margin, billY);
  doc.setFont('helvetica', 'normal');
  billY += 4;
  if (customer.billing_address) {
    const splitAddr = doc.splitTextToSize(customer.billing_address, colW);
    doc.text(splitAddr, margin, billY);
    billY += splitAddr.length * 3.8;
  }
  if (customer.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${customer.gstin}`, margin, billY);
    doc.setFont('helvetica', 'normal');
    billY += 4;
  }
  // Remove bracket numbers in State
  doc.text(`State: ${customer.state || invoice.place_of_supply}`, margin, billY);
  billY += 4;
  if (customer.phone) {
    doc.text(`Phone: ${customer.phone}`, margin, billY);
    billY += 4;
  }

  // Ship To (Right)
  const shipX = margin + colW + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('SHIP TO:', shipX, cursorY + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  let shipY = cursorY + 8;
  doc.setFont('helvetica', 'bold');
  doc.text(customer.name || 'Same as Bill To', shipX, shipY);
  doc.setFont('helvetica', 'normal');
  shipY += 4;
  const shipAddress = invoice.shipping_address || customer.shipping_address || customer.billing_address || 'Same as Billing Address';
  const splitShip = doc.splitTextToSize(shipAddress, colW);
  doc.text(splitShip, shipX, shipY);
  shipY += splitShip.length * 3.8;
  shipY += 4;

  cursorY = Math.max(billY, shipY) + 3;

  // Check if any product has discounts
  const hasItemDiscounts = items.some((item) => (item.discount_amount || 0) > 0);

  // Dynamic Table Columns (Clean headers without '( ¹)' suffixes)
  type TableCol = { key: string; label: string; w: number; align: 'left' | 'center' | 'right' };

  const cols: TableCol[] = hasItemDiscounts
    ? [
        { key: 'idx', label: '#', w: 8, align: 'left' },
        { key: 'desc', label: 'Item & Description', w: 58, align: 'left' },
        { key: 'hsn', label: 'HSN/SAC', w: 16, align: 'center' },
        { key: 'qty', label: 'Qty', w: 14, align: 'center' },
        { key: 'rate', label: 'Rate', w: 20, align: 'right' },
        { key: 'disc', label: 'Discount', w: 18, align: 'right' },
        { key: 'taxable', label: 'Taxable Value', w: 24, align: 'right' },
        { key: 'total', label: 'Amount', w: 28, align: 'right' },
      ]
    : [
        { key: 'idx', label: '#', w: 8, align: 'left' },
        { key: 'desc', label: 'Item & Description', w: 74, align: 'left' }, // Expanded
        { key: 'hsn', label: 'HSN/SAC', w: 18, align: 'center' },
        { key: 'qty', label: 'Qty', w: 16, align: 'center' },
        { key: 'rate', label: 'Rate', w: 22, align: 'right' },
        { key: 'taxable', label: 'Taxable Value', w: 22, align: 'right' },
        { key: 'total', label: 'Amount', w: 26, align: 'right' },
      ];

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, cursorY, contentWidth, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, cursorY + 7, margin + contentWidth, cursorY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  let currentX = margin + 2;
  cols.forEach((col) => {
    if (col.align === 'right') {
      doc.text(col.label, currentX + col.w - 4, cursorY + 4.8, { align: 'right' });
    } else if (col.align === 'center') {
      doc.text(col.label, currentX + col.w / 2, cursorY + 4.8, { align: 'center' });
    } else {
      doc.text(col.label, currentX, cursorY + 4.8);
    }
    currentX += col.w;
  });

  cursorY += 8;

  // Item Rows
  items.forEach((item, index) => {
    if (cursorY > pageHeight - 65) {
      doc.addPage();
      cursorY = margin;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    let rowX = margin + 2;

    // # index
    doc.text((index + 1).toString(), rowX, cursorY + 4);
    rowX += cols[0].w;

    // Product Name
    doc.setFont('helvetica', 'bold');
    doc.text(item.product_name_snapshot, rowX, cursorY + 4);
    doc.setFont('helvetica', 'normal');
    rowX += cols[1].w;

    // HSN/SAC
    doc.text(item.hsn_sac_snapshot || '-', rowX + cols[2].w / 2, cursorY + 4, { align: 'center' });
    rowX += cols[2].w;

    // Qty
    doc.text(`${item.quantity} ${item.unit || 'PCS'}`, rowX + cols[3].w / 2, cursorY + 4, { align: 'center' });
    rowX += cols[3].w;

    // Unit Price (Rate)
    doc.text(formatIndianCurrency(item.unit_price, false), rowX + cols[4].w - 4, cursorY + 4, { align: 'right' });
    rowX += cols[4].w;

    // Discount (only if column present)
    if (hasItemDiscounts) {
      doc.text(
        item.discount_amount > 0 ? formatIndianCurrency(item.discount_amount, false) : '-',
        rowX + cols[5].w - 4,
        cursorY + 4,
        { align: 'right' }
      );
      rowX += cols[5].w;

      // Taxable Value
      doc.text(formatIndianCurrency(item.taxable_amount, false), rowX + cols[6].w - 4, cursorY + 4, { align: 'right' });
      rowX += cols[6].w;

      // Total Amount
      doc.setFont('helvetica', 'bold');
      doc.text(formatIndianCurrency(item.line_total, false), rowX + cols[7].w - 4, cursorY + 4, { align: 'right' });
    } else {
      // Taxable Value
      doc.text(formatIndianCurrency(item.taxable_amount, false), rowX + cols[5].w - 4, cursorY + 4, { align: 'right' });
      rowX += cols[5].w;

      // Total Amount
      doc.setFont('helvetica', 'bold');
      doc.text(formatIndianCurrency(item.line_total, false), rowX + cols[6].w - 4, cursorY + 4, { align: 'right' });
    }

    cursorY += 6;

    if (item.description_snapshot) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      const splitDesc = doc.splitTextToSize(item.description_snapshot, cols[1].w + 30);
      doc.text(splitDesc, margin + cols[0].w + 2, cursorY + 1);
      cursorY += splitDesc.length * 3 + 1;
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, cursorY, margin + contentWidth, cursorY);
    cursorY += 2;
  });

  if (cursorY > pageHeight - 75) {
    doc.addPage();
    cursorY = margin;
  }

  cursorY += 4;

  const summaryBoxWidth = 78;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;
  const detailsBoxWidth = contentWidth - summaryBoxWidth - 6;

  // Left Box: Amount in words, Bank/UPI Info + QR, Notes & Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Amount in Words:', margin, cursorY + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const wordsSplit = doc.splitTextToSize(invoice.amount_in_words || 'Zero Rupees Only', detailsBoxWidth);
  doc.text(wordsSplit, margin, cursorY + 7.5);

  let leftDetailY = cursorY + 7.5 + wordsSplit.length * 3.8 + 3;

  // Payment Box with optional UPI QR Code
  if (seller.bank_name || seller.upi_id || upiQrBase64) {
    const boxHeight = upiQrBase64 ? 28 : 22;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, leftDetailY, detailsBoxWidth, boxHeight, 2, 2, 'F');

    let payTextX = margin + 4;
    if (upiQrBase64) {
      try {
        doc.addImage(upiQrBase64, 'JPEG', margin + 3, leftDetailY + 3, 22, 22);
        payTextX = margin + 28;
      } catch {
        // ignore
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Payment Instructions / Scan QR:', payTextX, leftDetailY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    let bankTextY = leftDetailY + 9.5;
    if (seller.bank_name) {
      doc.text(`Bank: ${seller.bank_name} | A/C: ${seller.bank_account_no || '-'}`, payTextX, bankTextY);
      bankTextY += 4;
      doc.text(`IFSC: ${seller.bank_ifsc || '-'} | Branch: ${seller.bank_branch || '-'}`, payTextX, bankTextY);
      bankTextY += 4;
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
    doc.text('Notes:', margin, leftDetailY + 3);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const splitNotes = doc.splitTextToSize(invoice.notes || seller.default_notes || '', detailsBoxWidth);
    doc.text(splitNotes, margin, leftDetailY + 7);
    leftDetailY += splitNotes.length * 3.5 + 3;
  }

  // Right Box: Totals Breakdown Table
  let sumY = cursorY;
  const rowH = 4.8;

  const summaryRows = [
    { label: 'Subtotal (Gross):', val: formatIndianCurrency(invoice.subtotal) },
  ];

  if (invoice.item_discount_total > 0) {
    summaryRows.push({ label: 'Item Discounts:', val: `-${formatIndianCurrency(invoice.item_discount_total)}` });
  }

  if (invoice.invoice_discount_amount > 0) {
    summaryRows.push({ label: 'Invoice Discount:', val: `-${formatIndianCurrency(invoice.invoice_discount_amount)}` });
  }

  summaryRows.push({ label: 'Taxable Value:', val: formatIndianCurrency(invoice.taxable_amount) });

  if (invoice.shipping_amount > 0) {
    summaryRows.push({ label: 'Shipping Charges:', val: formatIndianCurrency(invoice.shipping_amount) });
  }

  if (invoice.is_inter_state) {
    summaryRows.push({ label: 'IGST:', val: formatIndianCurrency(invoice.igst) });
  } else {
    summaryRows.push({ label: 'CGST:', val: formatIndianCurrency(invoice.cgst) });
    summaryRows.push({ label: 'SGST:', val: formatIndianCurrency(invoice.sgst) });
  }

  summaryRows.push({ label: 'Total GST Amount:', val: formatIndianCurrency(invoice.total_gst) });

  summaryRows.forEach((r) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(r.label, summaryBoxX, sumY + 3.5);
    doc.text(r.val, pageWidth - margin, sumY + 3.5, { align: 'right' });
    sumY += rowH;
  });

  // Grand Total Banner
  if (isDraft) {
    doc.setFillColor(51, 65, 85); // Slate-700
  } else {
    doc.setFillColor(15, 23, 42); // Slate-900
  }
  doc.rect(summaryBoxX - 2, sumY, summaryBoxWidth + 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(isDraft ? 'Estimated Total:' : 'Grand Total:', summaryBoxX + 2, sumY + 5);
  doc.text(formatIndianCurrency(invoice.grand_total), pageWidth - margin - 2, sumY + 5, { align: 'right' });

  sumY += 9;

  // Amount Paid & Balance Due
  if (!isDraft) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Amount Paid:', summaryBoxX, sumY + 3.5);
    doc.text(formatIndianCurrency(invoice.amount_paid), pageWidth - margin, sumY + 3.5, { align: 'right' });
    sumY += rowH;

    doc.text('Balance Due:', summaryBoxX, sumY + 3.5);
    doc.setTextColor(invoice.balance_due > 0 ? 220 : 71, invoice.balance_due > 0 ? 38 : 85, invoice.balance_due > 0 ? 38 : 105);
    doc.text(formatIndianCurrency(invoice.balance_due), pageWidth - margin, sumY + 3.5, { align: 'right' });
  }

  // Signature Block
  const sigY = Math.max(leftDetailY, sumY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`For ${seller.name || 'Business'}`, pageWidth - margin, sigY, { align: 'right' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('Authorized Signatory', pageWidth - margin, sigY + 12, { align: 'right' });

  // Social Media Footer Bar
  const socialHandles: string[] = [];
  if (seller.instagram_handle) socialHandles.push(`IG: @${seller.instagram_handle.replace('@', '')}`);
  if (seller.whatsapp_number) socialHandles.push(`WhatsApp: ${seller.whatsapp_number}`);
  if (seller.website) socialHandles.push(`Web: ${seller.website}`);

  if (socialHandles.length > 0) {
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(socialHandles.join('   |   '), pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  const prefix = isDraft ? 'DRAFT-' : '';
  const fileName = `${prefix}${invoice.invoice_number || 'INV'}-${(customer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

  if (action === 'blob') {
    return doc.output('blob');
  }

  doc.save(fileName);
}
