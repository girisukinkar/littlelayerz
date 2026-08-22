import jsPDF from 'jspdf';
import type { Sale } from '../types/sale';

export function exportSaleReceiptPDF(sale: Sale) {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 160 + (sale.items?.length || 1) * 12], // 80mm thermal receipt style width
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 10;

  // Header - Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text('LITTLE LAYERZ', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Market Stall & 3D Print Studio', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('Specialist in 3D Toys, Puzzles & Custom Gifts', pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(6, y, pageWidth - 6, y);
  y += 5;

  // Receipt details
  doc.setLineDashPattern([], 0);
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);

  const formattedDate = sale.created_at
    ? new Date(sale.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-IN');

  doc.text(`Receipt: ${sale.receipt_no}`, 6, y);
  y += 4;
  doc.text(`Date: ${formattedDate}`, 6, y);
  y += 4;
  doc.text(`Payment: ${sale.payment_method} Paid`, 6, y);
  y += 4;

  if (sale.customer_name || sale.customer_phone) {
    const cust = [sale.customer_name, sale.customer_phone].filter(Boolean).join(' | ');
    doc.text(`Customer: ${cust}`, 6, y);
    y += 4;
  }

  y += 2;
  // Divider line
  doc.setDrawColor(180, 180, 180);
  doc.line(6, y, pageWidth - 6, y);
  y += 5;

  // Items Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text('Item', 6, y);
  doc.text('Qty', 46, y, { align: 'center' });
  doc.text('Price', 58, y, { align: 'right' });
  doc.text('Total', pageWidth - 6, y, { align: 'right' });
  y += 4;

  doc.setDrawColor(220, 220, 220);
  doc.line(6, y, pageWidth - 6, y);
  y += 4;

  // Items List
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);

  for (const item of sale.items || []) {
    // Truncate long product names
    let name = item.product_name || 'Custom 3D Item';
    if (name.length > 22) {
      name = name.slice(0, 20) + '...';
    }

    doc.text(name, 6, y);
    doc.text(`${item.quantity}`, 46, y, { align: 'center' });
    doc.text(`₹${item.unit_price}`, 58, y, { align: 'right' });
    doc.text(`₹${item.total_price}`, pageWidth - 6, y, { align: 'right' });
    y += 4.5;
  }

  y += 2;
  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(6, y, pageWidth - 6, y);
  y += 5;
  doc.setLineDashPattern([], 0);

  // Financial Summary
  if (sale.discount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Subtotal:', 6, y);
    doc.text(`₹${sale.subtotal}`, pageWidth - 6, y, { align: 'right' });
    y += 4;

    doc.setTextColor(200, 50, 50);
    doc.text('Discount:', 6, y);
    doc.text(`-₹${sale.discount}`, pageWidth - 6, y, { align: 'right' });
    y += 4.5;
  }

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL AMOUNT:', 6, y);
  doc.text(`₹${sale.total_amount}`, pageWidth - 6, y, { align: 'right' });
  y += 7;

  // Footer / Thank you
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(6, y, pageWidth - 6, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 110);
  doc.text('*** THANK YOU FOR VISITING OUR STALL! ***', pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.text('Share your prints with us on Instagram & WhatsApp', pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.text('For custom 3D printing orders, visit Dexter3D', pageWidth / 2, y, { align: 'center' });

  // Save the PDF
  doc.save(`${sale.receipt_no || 'Dexter3D-Receipt'}.pdf`);
}

/**
 * Generates formatted text for WhatsApp or clipboard sharing
 */
export function formatSaleReceiptText(sale: Sale): string {
  const formattedDate = sale.created_at
    ? new Date(sale.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-IN');

  const itemsLines = (sale.items || [])
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.product_name}*\n   Qty: ${item.quantity} × ₹${item.unit_price} = ₹${item.total_price}`
    )
    .join('\n');

  let text = `🧾 *DEXTER 3D CREATIONS - STALL RECEIPT*\n`;
  text += `--------------------------------------\n`;
  text += `*Receipt No:* ${sale.receipt_no}\n`;
  text += `*Date:* ${formattedDate}\n`;
  text += `*Payment:* ${sale.payment_method} Paid ✅\n`;

  if (sale.customer_name) {
    text += `*Customer:* ${sale.customer_name}\n`;
  }
  text += `--------------------------------------\n`;
  text += `*ITEMS PURCHASED:*\n${itemsLines}\n`;
  text += `--------------------------------------\n`;

  if (sale.discount > 0) {
    text += `*Subtotal:* ₹${sale.subtotal}\n`;
    text += `*Discount:* -₹${sale.discount}\n`;
  }

  text += `*GRAND TOTAL: ₹${sale.total_amount}*\n`;
  text += `--------------------------------------\n`;
  text += `✨ Thank you for shopping at our stall! Have a wonderful day!\n`;
  text += `🌐 Dexter3D - Custom 3D Printing & Design`;

  return text;
}
