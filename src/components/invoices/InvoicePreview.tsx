import React from 'react';
import type { GstInvoiceRecord, BusinessProfile } from '../../types/gst';
import { formatIndianCurrency } from '../../utils/gstCalculations';
import { formatStateWithCode } from '../../utils/indianStates';
import { Download, Share2, CheckCircle, FileText, Sparkles, AtSign, MessageCircle, Globe } from 'lucide-react';
import { generateInvoicePDF } from '../../utils/invoicePdfGenerator';

interface InvoicePreviewProps {
  invoice: Partial<GstInvoiceRecord>;
  onDownloadPdf?: () => void;
  onShareWhatsApp?: () => void;
  onConvertToFinal?: () => void;
  isSaving?: boolean;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  onDownloadPdf,
  onShareWhatsApp,
  onConvertToFinal,
  isSaving = false,
}) => {
  const seller = (invoice.seller_snapshot || {
    name: 'Little Layerz',
    state: 'Uttar Pradesh',
    state_code: '09',
    gstin: '09AANPW1625N1ZY',
  }) as Partial<BusinessProfile>;

  const customer = invoice.customer_snapshot || { name: 'Cash Customer' };
  const items = invoice.items || [];
  const isDraft = Boolean(invoice.is_draft);

  // Check if any product has discounts
  const hasItemDiscounts = items.some((item) => (item.discount_amount || 0) > 0);

  const handleDownload = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
    } else {
      generateInvoicePDF(invoice as GstInvoiceRecord, 'download');
    }
  };

  const handleWhatsApp = () => {
    if (onShareWhatsApp) {
      onShareWhatsApp();
      return;
    }
    const customerPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const docType = isDraft ? 'draft invoice' : 'invoice';
    const message = encodeURIComponent(
      `Hi ${customer.name || 'Customer'}, here is your ${docType} #${invoice.invoice_number || 'INV'} from ${seller.name || 'Dexter3D Studio'} for ${formatIndianCurrency(invoice.grand_total || 0)}. Please review and let us know if any adjustments are needed!`
    );
    window.open(`https://wa.me/${customerPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-3 bg-neutral-900 border-b border-neutral-800 p-3 rounded-t-2xl">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
          <FileText className="h-4 w-4 text-purple-400" />
          <span>{isDraft ? 'Draft Invoice Preview' : 'Live A4 Tax Invoice Preview'}</span>
          {isDraft ? (
            <span className="flex items-center gap-1 text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
              <Sparkles className="h-3 w-3" /> DRAFT (FOR REVIEW)
            </span>
          ) : (
            invoice.payment_status === 'paid' && (
              <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                <CheckCircle className="h-3 w-3" /> PAID
              </span>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDraft && onConvertToFinal && (
            <button
              type="button"
              onClick={onConvertToFinal}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all"
              title="Convert draft into official Tax Invoice"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Make Final</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all"
            title="Share review summary on WhatsApp"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:from-purple-500 hover:to-indigo-500 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isDraft ? 'Download Draft PDF' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* A4 Paper Document Container */}
      <div className="flex-1 overflow-y-auto bg-neutral-950 p-4 md:p-6 border-x border-b border-neutral-800 rounded-b-2xl">
        <div className="mx-auto max-w-[760px] bg-white text-slate-900 rounded-lg shadow-2xl p-6 sm:p-8 text-xs font-sans border border-slate-200 relative overflow-hidden">
          {/* Draft Watermark Background */}
          {isDraft && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <span className="text-slate-100 font-black text-6xl rotate-[-30deg] tracking-widest select-none uppercase">
                DRAFT
              </span>
            </div>
          )}

          <div className="relative z-10">
            {/* Header Banner */}
            <div
              className={`p-3.5 rounded-md flex items-center justify-between mb-5 text-white ${
                isDraft ? 'bg-slate-700' : 'bg-slate-900'
              }`}
            >
              <div>
                <h2 className="text-base font-black tracking-tight text-white uppercase">
                  {isDraft ? 'INVOICE' : 'TAX INVOICE'}
                </h2>
                <p className="text-[10px] text-slate-300">
                  {invoice.is_inter_state ? 'Inter-State Supply (IGST)' : 'Intra-State Supply (CGST + SGST)'}
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-sm text-purple-300">
                  {invoice.invoice_number || 'INV-0001'}
                </span>
                <p className="text-[10px] text-slate-400">Date: {invoice.invoice_date || '-'}</p>
              </div>
            </div>

            {/* Business & Customer 2-Column Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200 mb-4">
              {/* Seller */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  {seller.logo_url && (
                    <img
                      src={seller.logo_url}
                      alt="Company Logo"
                      className="h-10 w-auto max-w-[100px] object-contain rounded border border-slate-200"
                    />
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{seller.name || 'Your Business Name'}</h3>
                    {seller.gstin && (
                      <p className="font-mono font-bold text-purple-700 text-[11px]">GSTIN: {seller.gstin}</p>
                    )}
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  {seller.address ? `${seller.address}, ` : ''}
                  {seller.city ? `${seller.city} ` : ''}
                  {seller.pincode ? `- ${seller.pincode}` : ''}
                </p>
                <p className="text-slate-600 text-[11px]">
                  State:{' '}
                  <span className="font-medium text-slate-800">
                    {formatStateWithCode(seller.state, seller.state_code) || 'Uttar Pradesh (09)'}
                  </span>
                </p>
                {(seller.phone || seller.email) && (
                  <p className="text-slate-500 text-[10px]">
                    Phone: {seller.phone || '-'} | Email: {seller.email || '-'}
                  </p>
                )}
              </div>

              {/* Buyer / Bill To */}
              <div className="space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Bill To</span>
                  <div className="text-[10px] text-slate-500 text-right">
                    <span>
                      Place of Supply:{' '}
                      <b className="text-slate-800">
                        {formatStateWithCode(invoice.place_of_supply, invoice.place_of_supply_state_code) ||
                          'Uttar Pradesh (09)'}
                      </b>
                    </span>
                    <span className="ml-2 font-mono font-semibold text-slate-600">
                      Reverse Charge: <b>{invoice.reverse_charge ? 'YES' : 'NO'}</b>
                    </span>
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 text-xs">{customer.name || 'Cash Customer'}</h4>
                {customer.gstin && (
                  <p className="font-mono font-bold text-purple-700 text-[10px]">GSTIN: {customer.gstin}</p>
                )}
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {(() => {
                    const addr = invoice.billing_address || customer.billing_address || 'Same as shipping';
                    if (customer.pincode && !addr.includes(customer.pincode)) {
                      return `${addr}${customer.city && !addr.includes(customer.city) ? ', ' + customer.city : ''} - ${customer.pincode}`;
                    }
                    return addr;
                  })()}
                </p>
                <p className="text-slate-500 text-[10px]">
                  State:{' '}
                  {formatStateWithCode(
                    customer.state || invoice.place_of_supply,
                    customer.state_code || invoice.place_of_supply_state_code
                  )}
                </p>
                {customer.phone && <p className="text-slate-500 text-[10px]">Phone: {customer.phone}</p>}
              </div>
            </div>

            {/* Line Items Table (Dynamic columns without `( ¹)` suffixes) */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                    <th className="py-2 px-1 text-center w-6">#</th>
                    <th className="py-2 px-2">Item Description</th>
                    <th className="py-2 px-1 text-center">HSN/SAC</th>
                    <th className="py-2 px-1 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Rate</th>
                    {hasItemDiscounts && <th className="py-2 px-2 text-right">Discount</th>}
                    <th className="py-2 px-2 text-right">Taxable Value</th>
                    <th className="py-2 px-1 text-center">GST %</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={hasItemDiscounts ? 9 : 8} className="py-6 text-center text-slate-400 italic">
                        No items added yet. Search or select a product above to add.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/80">
                        <td className="py-2 px-1 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-2">
                          <span className="font-bold text-slate-900">{item.product_name_snapshot}</span>
                          {item.description_snapshot && (
                            <p className="text-[10px] text-slate-500 leading-tight">{item.description_snapshot}</p>
                          )}
                        </td>
                        <td className="py-2 px-1 text-center font-mono text-[10px] text-slate-600">
                          {item.hsn_sac_snapshot || '-'}
                        </td>
                        <td className="py-2 px-1 text-center font-medium text-slate-800">
                          {item.quantity} <span className="text-[9px] text-slate-500">{item.unit || 'PCS'}</span>
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {formatIndianCurrency(item.unit_price, false)}
                        </td>
                        {hasItemDiscounts && (
                          <td className="py-2 px-2 text-right font-mono text-slate-500">
                            {item.discount_amount > 0
                              ? `-${formatIndianCurrency(item.discount_amount, false)}`
                              : '-'}
                          </td>
                        )}
                        <td className="py-2 px-2 text-right font-mono font-medium">
                          {formatIndianCurrency(item.taxable_amount, false)}
                        </td>
                        <td className="py-2 px-1 text-center font-mono text-[10px]">{item.gst_rate}%</td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                          {formatIndianCurrency(item.line_total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculation Summary Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-slate-200">
              {/* Left Box: Words, Bank Details, UPI QR, Notes */}
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Amount in Words
                  </span>
                  <p className="font-semibold text-slate-800 text-[11px] bg-slate-50 p-2 rounded border border-slate-200 leading-relaxed">
                    {invoice.amount_in_words || 'Zero Rupees Only'}
                  </p>
                </div>

                {/* Payment Instructions & UPI QR Code Image */}
                {(seller.bank_name || seller.upi_id || seller.upi_qr_url) && (
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[10px] flex items-start gap-3">
                    {seller.upi_qr_url && (
                      <div className="shrink-0 bg-white p-1 rounded border border-slate-200">
                        <img
                          src={seller.upi_qr_url}
                          alt="UPI QR"
                          className="h-16 w-16 object-contain"
                        />
                        <span className="text-[8px] text-slate-500 text-center block font-bold mt-0.5">Scan to Pay</span>
                      </div>
                    )}
                    <div className="space-y-1 flex-1">
                      <span className="font-bold text-slate-700 uppercase tracking-wider block">
                        Payment Instructions
                      </span>
                      {seller.bank_name && (
                        <p className="text-slate-600 leading-tight">
                          <b>Bank:</b> {seller.bank_name} | <b>A/C:</b> {seller.bank_account_no || '-'}
                          <br />
                          <b>IFSC:</b> {seller.bank_ifsc || '-'}
                        </p>
                      )}
                      {seller.upi_id && (
                        <p className="text-slate-600">
                          <b>UPI ID:</b> <span className="font-mono font-bold text-purple-700">{seller.upi_id}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {invoice.notes && (
                  <div className="text-[10px] text-slate-500">
                    <span className="font-bold text-slate-600">Notes: </span>
                    {invoice.notes}
                  </div>
                )}
              </div>

              {/* Right Box: Breakdown Totals */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (Gross):</span>
                  <span className="font-mono">{formatIndianCurrency(invoice.subtotal || 0)}</span>
                </div>

                {(invoice.item_discount_total || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Item Discounts:</span>
                    <span className="font-mono">-{formatIndianCurrency(invoice.item_discount_total || 0)}</span>
                  </div>
                )}

                {(invoice.invoice_discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Invoice Discount:</span>
                    <span className="font-mono">-{formatIndianCurrency(invoice.invoice_discount_amount || 0)}</span>
                  </div>
                )}

                <div className="flex justify-between font-medium text-slate-700 pt-1 border-t border-slate-200">
                  <span>Taxable Value:</span>
                  <span className="font-mono">{formatIndianCurrency(invoice.taxable_amount || 0)}</span>
                </div>

                {(invoice.shipping_amount || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping Charges:</span>
                    <span className="font-mono">{formatIndianCurrency(invoice.shipping_amount || 0)}</span>
                  </div>
                )}

                {(() => {
                  const uniqueRates = Array.from(new Set(items.map((it) => it.gst_rate ?? 18)));
                  const singleRate = uniqueRates.length === 1 ? uniqueRates[0] : null;

                  if (invoice.is_inter_state) {
                    return (
                      <div className="flex justify-between text-slate-600">
                        <span>{singleRate !== null ? `IGST @ ${singleRate}%:` : 'IGST:'}</span>
                        <span className="font-mono">{formatIndianCurrency(invoice.igst || 0)}</span>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>{singleRate !== null ? `CGST @ ${singleRate / 2}%:` : 'CGST:'}</span>
                        <span className="font-mono">{formatIndianCurrency(invoice.cgst || 0)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{singleRate !== null ? `SGST @ ${singleRate / 2}%:` : 'SGST:'}</span>
                        <span className="font-mono">{formatIndianCurrency(invoice.sgst || 0)}</span>
                      </div>
                    </>
                  );
                })()}

                {/* Grand Total Bar */}
                <div
                  className={`flex justify-between items-center text-white p-2 rounded mt-2 font-bold text-sm ${
                    isDraft ? 'bg-slate-700' : 'bg-slate-900'
                  }`}
                >
                  <span>{isDraft ? 'Estimated Total:' : 'Grand Total:'}</span>
                  <span className="font-mono text-purple-300">
                    {formatIndianCurrency(invoice.grand_total || 0)}
                  </span>
                </div>

                {/* Paid & Balance (only if not draft) */}
                {!isDraft && (
                  <>
                    <div className="flex justify-between text-slate-600 pt-1 text-[10px]">
                      <span>Amount Paid:</span>
                      <span className="font-mono font-medium">{formatIndianCurrency(invoice.amount_paid || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[11px] text-slate-900">
                      <span>Balance Due:</span>
                      <span
                        className={`font-mono ${
                          (invoice.balance_due || 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatIndianCurrency(invoice.balance_due || 0)}
                      </span>
                    </div>
                  </>
                )}

                {/* Authorized Signatory & Rule 46 Proviso */}
                <div className="pt-4 text-right space-y-1">
                  <p className="text-[11px] text-slate-600 font-medium">For {seller.name || 'Little Layerz'}</p>
                  <p className="text-[10px] text-slate-400 italic pt-3">Authorized Signatory</p>
                  <p className="text-[9px] text-slate-400 font-sans">
                    This is a computer-generated invoice and requires no signature.
                  </p>
                </div>
              </div>
            </div>

            {/* Social Media Footer in Preview */}
            {(seller.instagram_handle || seller.whatsapp_number || seller.website) && (
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-center gap-4 text-[10px] text-slate-400">
                {seller.instagram_handle && (
                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                    <AtSign className="h-3 w-3 text-purple-600" />
                    @{seller.instagram_handle.replace('@', '')}
                  </span>
                )}
                {seller.whatsapp_number && (
                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                    <MessageCircle className="h-3 w-3 text-emerald-600" />
                    {seller.whatsapp_number}
                  </span>
                )}
                {seller.website && (
                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                    <Globe className="h-3 w-3 text-indigo-600" />
                    {seller.website}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
