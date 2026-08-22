import type { GstInvoiceRecord } from '../types/gst';

/**
 * Converts invoice records to flat rows suitable for CSV and Excel exports.
 */
export function formatInvoicesForExport(invoices: GstInvoiceRecord[]) {
  const rows: Record<string, string | number>[] = [];

  invoices.forEach((inv) => {
    const items = inv.items && inv.items.length > 0 ? inv.items : [null];

    items.forEach((it) => {
      rows.push({
        'Invoice Number': inv.invoice_number,
        'Invoice Date': inv.invoice_date,
        'Due Date': inv.due_date || '',
        'Customer Name': inv.customer_snapshot?.name || 'Cash Customer',
        'Customer Phone': inv.customer_snapshot?.phone || '',
        'Customer Email': inv.customer_snapshot?.email || '',
        'Customer GSTIN': inv.customer_snapshot?.gstin || '',
        'Place of Supply': `${inv.place_of_supply} (${inv.place_of_supply_state_code})`,
        'Supply Type': inv.is_inter_state ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)',
        'Product Name': it ? it.product_name_snapshot : '',
        'HSN / SAC': it ? it.hsn_sac_snapshot || '' : '',
        'Quantity': it ? it.quantity : '',
        'Unit': it ? it.unit : '',
        'Unit Price': it ? it.unit_price : '',
        'Gross Amount': it ? it.gross_amount : '',
        'Item Discount': it ? it.discount_amount : '',
        'Item Taxable Value': it ? it.taxable_amount : '',
        'GST Rate %': it ? it.gst_rate : '',
        'CGST Amount': it ? it.cgst_amount : '',
        'SGST Amount': it ? it.sgst_amount : '',
        'IGST Amount': it ? it.igst_amount : '',
        'Item Line Total': it ? it.line_total : '',
        'Invoice Subtotal': inv.subtotal,
        'Invoice Total Discount': inv.invoice_discount_amount,
        'Shipping Charge': inv.shipping_amount,
        'Total Taxable Amount': inv.taxable_amount,
        'Total CGST': inv.cgst,
        'Total SGST': inv.sgst,
        'Total IGST': inv.igst,
        'Total GST': inv.total_gst,
        'Grand Total': inv.grand_total,
        'Amount Paid': inv.amount_paid,
        'Balance Due': inv.balance_due,
        'Payment Status': inv.payment_status.toUpperCase(),
        'Payment Method': inv.payment_method ? inv.payment_method.toUpperCase() : '',
      });
    });
  });

  return rows;
}

/**
 * Downloads data as a CSV file.
 */
export function exportToCSV(invoices: GstInvoiceRecord[], filename = 'gst_sales_report.csv') {
  const rows = formatInvoicesForExport(invoices);
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
