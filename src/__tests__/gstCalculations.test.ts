import { describe, it, expect } from 'vitest';
import {
  calculateInvoice,
  formatIndianCurrency,
} from '../utils/gstCalculations';
import { numberToIndianWords } from '../utils/numberToWords';
import {
  getStateCodeFromGstin,
  validateGstin,
  INDIAN_STATES,
} from '../utils/indianStates';

describe('GST Calculation Engine', () => {
  it('1. Intra-State 18% GST (CGST 9% + SGST 9%)', () => {
    const res = calculateInvoice({
      sellerStateCode: '27', // Maharashtra
      customerStateCode: '27', // Maharashtra
      items: [
        {
          productName: 'Desk Organizer',
          quantity: 2,
          unitPrice: 500,
          gstRate: 18,
        },
      ],
    });

    expect(res.isInterState).toBe(false);
    expect(res.subtotal).toBe(1000.0);
    expect(res.taxableAmount).toBe(1000.0);
    expect(res.totalCgst).toBe(90.0); // 9% of 1000
    expect(res.totalSgst).toBe(90.0); // 9% of 1000
    expect(res.totalIgst).toBe(0.0);
    expect(res.totalGst).toBe(180.0);
    expect(res.grandTotal).toBe(1180.0);
  });

  it('2. Inter-State 18% GST (IGST 18%)', () => {
    const res = calculateInvoice({
      sellerStateCode: '27', // Maharashtra
      customerStateCode: '29', // Karnataka
      items: [
        {
          productName: 'Lithophane Lamp',
          quantity: 1,
          unitPrice: 1000,
          gstRate: 18,
        },
      ],
    });

    expect(res.isInterState).toBe(true);
    expect(res.subtotal).toBe(1000.0);
    expect(res.taxableAmount).toBe(1000.0);
    expect(res.totalCgst).toBe(0.0);
    expect(res.totalSgst).toBe(0.0);
    expect(res.totalIgst).toBe(180.0); // Full 18%
    expect(res.totalGst).toBe(180.0);
    expect(res.grandTotal).toBe(1180.0);
  });

  it('3. 0% GST (Exempted goods/services)', () => {
    const res = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '27',
      items: [
        {
          productName: 'Exempted Prototype Sample',
          quantity: 3,
          unitPrice: 200,
          gstRate: 0,
        },
      ],
    });

    expect(res.subtotal).toBe(600.0);
    expect(res.taxableAmount).toBe(600.0);
    expect(res.totalGst).toBe(0.0);
    expect(res.grandTotal).toBe(600.0);
  });

  it('4. 5% GST (Intra-State: CGST 2.5% + SGST 2.5%)', () => {
    const res = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '27',
      items: [
        {
          productName: 'Raw Filament Sample',
          quantity: 1,
          unitPrice: 1000,
          gstRate: 5,
        },
      ],
    });

    expect(res.totalCgst).toBe(25.0);
    expect(res.totalSgst).toBe(25.0);
    expect(res.totalGst).toBe(50.0);
    expect(res.grandTotal).toBe(1050.0);
  });

  it('5. 12% GST (Inter-State: IGST 12%)', () => {
    const res = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '06', // Haryana
      items: [
        {
          productName: 'Standard Accessory',
          quantity: 2,
          unitPrice: 500,
          gstRate: 12,
        },
      ],
    });

    expect(res.isInterState).toBe(true);
    expect(res.totalIgst).toBe(120.0);
    expect(res.totalGst).toBe(120.0);
    expect(res.grandTotal).toBe(1120.0);
  });

  it('6. 28% GST (Intra-State: CGST 14% + SGST 14%)', () => {
    const res = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '27',
      items: [
        {
          productName: 'Luxury 3D Art Piece',
          quantity: 1,
          unitPrice: 10000,
          gstRate: 28,
        },
      ],
    });

    expect(res.totalCgst).toBe(1400.0);
    expect(res.totalSgst).toBe(1400.0);
    expect(res.totalGst).toBe(2800.0);
    expect(res.grandTotal).toBe(12800.0);
  });

  it('7. Custom GST Rate (e.g., 7.5% custom rate)', () => {
    const res = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '27',
      items: [
        {
          productName: 'Special Item',
          quantity: 1,
          unitPrice: 1000,
          gstRate: 7.5,
        },
      ],
    });

    expect(res.totalCgst).toBe(37.5);
    expect(res.totalSgst).toBe(37.5);
    expect(res.totalGst).toBe(75.0);
    expect(res.grandTotal).toBe(1075.0);
  });

  it('8. Item-Level Percentage Discount', () => {
    const res = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '27',
      items: [
        {
          productName: 'Product with 10% discount',
          quantity: 1,
          unitPrice: 1000,
          discountType: 'percentage',
          discountValue: 10, // 10% off -> 900
          gstRate: 18,
        },
      ],
    });

    expect(res.subtotal).toBe(1000.0);
    expect(res.itemDiscountTotal).toBe(100.0);
    expect(res.taxableAmount).toBe(900.0);
    expect(res.totalCgst).toBe(81.0); // 9% of 900
    expect(res.totalSgst).toBe(81.0);
    expect(res.totalGst).toBe(162.0);
    expect(res.grandTotal).toBe(1062.0);
  });

  it('9. Item-Level Fixed Amount Discount', () => {
    const res = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '27',
      items: [
        {
          productName: 'Product with ₹150 flat discount',
          quantity: 2,
          unitPrice: 500, // Gross 1000
          discountType: 'fixed',
          discountValue: 150, // Discount 150 -> 850
          gstRate: 18,
        },
      ],
    });

    expect(res.subtotal).toBe(1000.0);
    expect(res.itemDiscountTotal).toBe(150.0);
    expect(res.taxableAmount).toBe(850.0);
    expect(res.totalCgst).toBe(76.5); // 9% of 850
    expect(res.totalSgst).toBe(76.5);
    expect(res.totalGst).toBe(153.0);
    expect(res.grandTotal).toBe(1003.0);
  });

  it('10. Invoice-Level Percentage Discount', () => {
    const res = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '27',
      items: [
        { productName: 'Item A', quantity: 1, unitPrice: 600, gstRate: 18 },
        { productName: 'Item B', quantity: 1, unitPrice: 400, gstRate: 18 },
      ],
      invoiceDiscountType: 'percentage',
      invoiceDiscountValue: 10, // 10% of 1000 = 100
    });

    expect(res.subtotal).toBe(1000.0);
    expect(res.invoiceDiscountAmount).toBe(100.0);
    expect(res.taxableAmount).toBe(900.0);
    expect(res.totalGst).toBe(162.0);
    expect(res.grandTotal).toBe(1062.0);
  });

  it('11. Invoice-Level Flat Discount', () => {
    const res = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '27',
      items: [
        { productName: 'Item A', quantity: 1, unitPrice: 1000, gstRate: 18 },
      ],
      invoiceDiscountType: 'fixed',
      invoiceDiscountValue: 200,
    });

    expect(res.subtotal).toBe(1000.0);
    expect(res.invoiceDiscountAmount).toBe(200.0);
    expect(res.taxableAmount).toBe(800.0);
    expect(res.totalGst).toBe(144.0);
    expect(res.grandTotal).toBe(944.0);
  });

  it('12. Multiple Products with Mixed GST Rates', () => {
    const res = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '27',
      items: [
        { productName: 'P1 (18%)', quantity: 1, unitPrice: 1000, gstRate: 18 },
        { productName: 'P2 (12%)', quantity: 2, unitPrice: 500, gstRate: 12 },
        { productName: 'P3 (5%)', quantity: 1, unitPrice: 400, gstRate: 5 },
      ],
    });

    expect(res.subtotal).toBe(2400.0);
    expect(res.taxableAmount).toBe(2400.0);
    // P1 GST = 180 (CGST 90, SGST 90)
    // P2 GST = 120 (CGST 60, SGST 60)
    // P3 GST = 20  (CGST 10, SGST 10)
    expect(res.totalCgst).toBe(160.0);
    expect(res.totalSgst).toBe(160.0);
    expect(res.totalGst).toBe(320.0);
    expect(res.grandTotal).toBe(2720.0);
  });

  it('13. Shipping with GST (Intra-State)', () => {
    const res = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '27',
      items: [
        { productName: 'Product', quantity: 1, unitPrice: 1000, gstRate: 18 },
      ],
      shippingAmount: 100,
      shippingGstRate: 18,
    });

    expect(res.shippingAmount).toBe(100.0);
    expect(res.shippingCgst).toBe(9.0);
    expect(res.shippingSgst).toBe(9.0);
    expect(res.shippingGstAmount).toBe(18.0);
    expect(res.shippingTotal).toBe(118.0);
    expect(res.totalGst).toBe(198.0); // 180 + 18
    expect(res.grandTotal).toBe(1298.0); // 1180 + 118
  });

  it('14. Shipping with GST (Inter-State)', () => {
    const res = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '07', // Delhi
      items: [
        { productName: 'Product', quantity: 1, unitPrice: 1000, gstRate: 18 },
      ],
      shippingAmount: 100,
      shippingGstRate: 18,
    });

    expect(res.isInterState).toBe(true);
    expect(res.shippingIgst).toBe(18.0);
    expect(res.totalIgst).toBe(198.0);
    expect(res.grandTotal).toBe(1298.0);
  });

  it('15. Payment Status & Balance Due Calculations', () => {
    // Unpaid
    const resUnpaid = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '27',
      items: [{ productName: 'P', quantity: 1, unitPrice: 1000, gstRate: 0 }],
      amountPaid: 0,
    });
    expect(resUnpaid.paymentStatus).toBe('unpaid');
    expect(resUnpaid.balanceDue).toBe(1000);

    // Partially Paid
    const resPartial = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '27',
      items: [{ productName: 'P', quantity: 1, unitPrice: 1000, gstRate: 0 }],
      amountPaid: 400,
    });
    expect(resPartial.paymentStatus).toBe('partial');
    expect(resPartial.balanceDue).toBe(600);

    // Fully Paid
    const resPaid = calculateInvoice({
      sellerStateCode: '27',
      customerStateCode: '27',
      items: [{ productName: 'P', quantity: 1, unitPrice: 1000, gstRate: 0 }],
      amountPaid: 1000,
    });
    expect(resPaid.paymentStatus).toBe('paid');
    expect(resPaid.balanceDue).toBe(0);
  });

  it('16. Indian Currency Formatting', () => {
    expect(formatIndianCurrency(1121)).toBe('₹1,121.00');
    expect(formatIndianCurrency(100000)).toBe('₹1,00,000.00');
    expect(formatIndianCurrency(1234567.89)).toBe('₹12,34,567.89');
    expect(formatIndianCurrency(0)).toBe('₹0.00');
  });

  it('17. Number to Indian Words Conversion', () => {
    expect(numberToIndianWords(1121)).toBe(
      'One Thousand One Hundred Twenty-One Rupees Only'
    );
    expect(numberToIndianWords(12450.5)).toBe(
      'Twelve Thousand Four Hundred Fifty Rupees and Fifty Paise Only'
    );
    expect(numberToIndianWords(100000)).toBe('One Lakh Rupees Only');
    expect(numberToIndianWords(15000000)).toBe('One Crore Fifty Lakh Rupees Only');
    expect(numberToIndianWords(0)).toBe('Zero Rupees Only');
  });

  it('18. GSTIN Validation and State Extraction', () => {
    const gstin = '09AANPW1625N1ZY'; // Valid Uttar Pradesh GSTIN
    expect(validateGstin(gstin)).toBe(true);
    expect(getStateCodeFromGstin(gstin)).toBe('09');

    const invalidGstin = '12345XYZ';
    expect(validateGstin(invalidGstin)).toBe(false);

    expect(INDIAN_STATES.length).toBeGreaterThanOrEqual(36);
  });
});
