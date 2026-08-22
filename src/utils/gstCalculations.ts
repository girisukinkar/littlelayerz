/**
 * GST Calculation Engine
 * Handles high-precision monetary calculations for Indian GST compliance.
 * Supports Intra-State (CGST + SGST) and Inter-State (IGST) split,
 * item discounts, invoice discounts, shipping charges with GST,
 * and payment balance computations with zero floating-point drift.
 */

export type DiscountType = 'fixed' | 'percentage';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type PaymentMethod = 'upi' | 'bank_transfer' | 'cash' | 'card' | 'other';

export interface InvoiceItemInput {
  id?: string;
  productId?: string;
  productName: string;
  description?: string;
  hsnSac?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountType?: DiscountType;
  discountValue?: number;
  gstRate: number; // e.g. 0, 5, 12, 18, 28
}

export interface CalculatedInvoiceItem extends InvoiceItemInput {
  id: string;
  unit: string;
  discountType: DiscountType;
  discountValue: number;
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  gstAmount: number;
  lineTotal: number;
}

export interface InvoiceCalculationInput {
  sellerStateCode: string;
  customerStateCode: string;
  items: InvoiceItemInput[];
  invoiceDiscountType?: DiscountType;
  invoiceDiscountValue?: number;
  shippingAmount?: number;
  shippingGstRate?: number;
  amountPaid?: number;
  applyRounding?: boolean;
}

export interface CalculatedInvoiceTotals {
  isInterState: boolean;
  items: CalculatedInvoiceItem[];
  subtotal: number; // Sum of gross amounts
  itemDiscountTotal: number;
  itemsTaxableTotal: number;
  invoiceDiscountType: DiscountType;
  invoiceDiscountValue: number;
  invoiceDiscountAmount: number;
  taxableAmount: number; // After invoice discount
  shippingAmount: number;
  shippingGstRate: number;
  shippingCgst: number;
  shippingSgst: number;
  shippingIgst: number;
  shippingGstAmount: number;
  shippingTotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalGst: number;
  preRoundTotal: number;
  roundingAdjustment: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
}

/**
 * Rounds a number strictly to 2 decimal places to avoid IEEE-754 floating point issues.
 */
export function round2(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a number as Indian Currency (e.g., 1,23,456.78)
 */
export function formatIndianCurrency(amount: number, includeSymbol = true): string {
  const rounded = round2(amount);
  const isNegative = rounded < 0;
  const absAmount = Math.abs(rounded);
  const parts = absAmount.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian Numbering System grouping (3 digits, then 2 digits)
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherDigits = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  const result = `${integerPart}.${decimalPart}`;
  const sign = isNegative ? '-' : '';
  return includeSymbol ? `${sign}₹${result}` : `${sign}${result}`;
}

/**
 * Determines whether the supply is inter-state (IGST) or intra-state (CGST+SGST).
 */
export function isInterState(sellerStateCode: string, customerStateCode: string): boolean {
  if (!sellerStateCode || !customerStateCode) return false;
  return sellerStateCode.trim().padStart(2, '0') !== customerStateCode.trim().padStart(2, '0');
}

/**
 * Calculates line item financials with item-level discount and tax splitting.
 */
export function calculateLineItem(
  item: InvoiceItemInput,
  isInterStateSupply: boolean,
  index = 0
): CalculatedInvoiceItem {
  const qty = Math.max(0, Number(item.quantity) || 0);
  const price = Math.max(0, Number(item.unitPrice) || 0);
  const gstRate = Math.max(0, Number(item.gstRate) || 0);
  const discountType = item.discountType || 'fixed';
  const discountValue = Math.max(0, Number(item.discountValue) || 0);

  const grossAmount = round2(qty * price);

  const rawDiscount =
    discountType === 'percentage'
      ? round2(grossAmount * (discountValue / 100))
      : round2(discountValue);
  const discountAmount = Math.min(rawDiscount, grossAmount); // Cannot exceed gross

  const taxableAmount = round2(grossAmount - discountAmount);

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isInterStateSupply) {
    igstRate = gstRate;
    igstAmount = round2(taxableAmount * (igstRate / 100));
  } else {
    cgstRate = round2(gstRate / 2);
    sgstRate = round2(gstRate / 2);
    cgstAmount = round2(taxableAmount * (cgstRate / 100));
    sgstAmount = round2(taxableAmount * (sgstRate / 100));
  }

  const gstAmount = round2(cgstAmount + sgstAmount + igstAmount);
  const lineTotal = round2(taxableAmount + gstAmount);

  return {
    ...item,
    id: item.id || `item-${index}-${Date.now()}`,
    unit: item.unit || 'PCS',
    discountType,
    discountValue,
    grossAmount,
    discountAmount,
    taxableAmount,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    gstAmount,
    lineTotal,
  };
}

/**
 * Calculates complete invoice totals including taxes, shipping, discounts, and payments.
 */
export function calculateInvoice(input: InvoiceCalculationInput): CalculatedInvoiceTotals {
  const isInter = isInterState(input.sellerStateCode, input.customerStateCode);

  const calculatedItems = (input.items || []).map((item, idx) =>
    calculateLineItem(item, isInter, idx)
  );

  const subtotal = round2(calculatedItems.reduce((acc, it) => acc + it.grossAmount, 0));
  const itemDiscountTotal = round2(
    calculatedItems.reduce((acc, it) => acc + it.discountAmount, 0)
  );
  const itemsTaxableTotal = round2(
    calculatedItems.reduce((acc, it) => acc + it.taxableAmount, 0)
  );

  // Invoice-level discount
  const invoiceDiscountType = input.invoiceDiscountType || 'fixed';
  const invoiceDiscountValue = Math.max(0, Number(input.invoiceDiscountValue) || 0);
  const rawInvoiceDiscount =
    invoiceDiscountType === 'percentage'
      ? round2(itemsTaxableTotal * (invoiceDiscountValue / 100))
      : round2(invoiceDiscountValue);
  const invoiceDiscountAmount = Math.min(rawInvoiceDiscount, itemsTaxableTotal);

  const taxableAmount = round2(itemsTaxableTotal - invoiceDiscountAmount);

  // Shipping Calculation
  const shippingAmount = Math.max(0, round2(Number(input.shippingAmount) || 0));
  const shippingGstRate = Math.max(0, Number(input.shippingGstRate) || 0);

  let shippingCgst = 0;
  let shippingSgst = 0;
  let shippingIgst = 0;

  if (shippingAmount > 0 && shippingGstRate > 0) {
    if (isInter) {
      shippingIgst = round2(shippingAmount * (shippingGstRate / 100));
    } else {
      const halfRate = round2(shippingGstRate / 2);
      shippingCgst = round2(shippingAmount * (halfRate / 100));
      shippingSgst = round2(shippingAmount * (halfRate / 100));
    }
  }

  const shippingGstAmount = round2(shippingCgst + shippingSgst + shippingIgst);
  const shippingTotal = round2(shippingAmount + shippingGstAmount);

  // Total Tax Sums
  // If invoice discount is present, taxes on items adjust proportionally or use calculated item taxes
  let totalCgst = round2(calculatedItems.reduce((acc, it) => acc + it.cgstAmount, 0) + shippingCgst);
  let totalSgst = round2(calculatedItems.reduce((acc, it) => acc + it.sgstAmount, 0) + shippingSgst);
  let totalIgst = round2(calculatedItems.reduce((acc, it) => acc + it.igstAmount, 0) + shippingIgst);

  if (invoiceDiscountAmount > 0 && itemsTaxableTotal > 0) {
    const discountRatio = (itemsTaxableTotal - invoiceDiscountAmount) / itemsTaxableTotal;
    const itemsCgst = round2(
      calculatedItems.reduce((acc, it) => acc + it.cgstAmount, 0) * discountRatio
    );
    const itemsSgst = round2(
      calculatedItems.reduce((acc, it) => acc + it.sgstAmount, 0) * discountRatio
    );
    const itemsIgst = round2(
      calculatedItems.reduce((acc, it) => acc + it.igstAmount, 0) * discountRatio
    );
    totalCgst = round2(itemsCgst + shippingCgst);
    totalSgst = round2(itemsSgst + shippingSgst);
    totalIgst = round2(itemsIgst + shippingIgst);
  }

  const totalGst = round2(totalCgst + totalSgst + totalIgst);
  const preRoundTotal = round2(taxableAmount + totalGst + shippingAmount);

  let grandTotal = preRoundTotal;
  let roundingAdjustment = 0;

  if (input.applyRounding) {
    grandTotal = Math.round(preRoundTotal);
    roundingAdjustment = round2(grandTotal - preRoundTotal);
  }

  const amountPaid = Math.max(0, round2(Number(input.amountPaid) || 0));
  const balanceDue = Math.max(0, round2(grandTotal - amountPaid));

  let paymentStatus: PaymentStatus = 'unpaid';
  if (amountPaid >= grandTotal && grandTotal > 0) {
    paymentStatus = 'paid';
  } else if (amountPaid > 0) {
    paymentStatus = 'partial';
  }

  return {
    isInterState: isInter,
    items: calculatedItems,
    subtotal,
    itemDiscountTotal,
    itemsTaxableTotal,
    invoiceDiscountType,
    invoiceDiscountValue,
    invoiceDiscountAmount,
    taxableAmount,
    shippingAmount,
    shippingGstRate,
    shippingCgst,
    shippingSgst,
    shippingIgst,
    shippingGstAmount,
    shippingTotal,
    totalCgst,
    totalSgst,
    totalIgst,
    totalGst,
    preRoundTotal,
    roundingAdjustment,
    grandTotal,
    amountPaid,
    balanceDue,
    paymentStatus,
  };
}
