import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import type { GstCustomer, GstProduct, GstInvoiceRecord, BusinessProfile } from '../types/gst';
import { customerService } from '../services/customerService';
import { gstProductService } from '../services/gstProductService';
import { gstInvoiceService } from '../services/gstInvoiceService';
import { businessService } from '../services/businessService';
import {
  calculateInvoice,
  type DiscountType,
  type InvoiceItemInput,
  formatIndianCurrency,
  type PaymentMethod,
} from '../utils/gstCalculations';
import { numberToIndianWords } from '../utils/numberToWords';
import { INDIAN_STATES } from '../utils/indianStates';
import { generateInvoicePDF } from '../utils/invoicePdfGenerator';
import { InvoicePreview } from '../components/invoices/InvoicePreview';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Save,
  Download,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Percent,
  Sparkles,
  X,
  Maximize2,
} from 'lucide-react';

export const CreateInvoice: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: editInvoiceId } = useParams<{ id: string }>();

  // Master Data
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [customers, setCustomers] = useState<GstCustomer[]>([]);
  const [products, setProducts] = useState<GstProduct[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Mode: Draft vs Final Tax Invoice & Reverse Charge (RCM)
  const [isDraft, setIsDraft] = useState(false);
  const [reverseCharge, setReverseCharge] = useState(false);

  // Customer Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState('09'); // Uttar Pradesh default
  const [placeOfSupplyName, setPlaceOfSupplyName] = useState('Uttar Pradesh');

  // Invoice Meta
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');

  // Line Items
  const [items, setItems] = useState<InvoiceItemInput[]>([
    {
      id: `item-${Date.now()}-0`,
      productName: '',
      description: '',
      hsnSac: '3926',
      quantity: 1,
      unit: 'PCS',
      unitPrice: 0,
      discountType: 'fixed',
      discountValue: 0,
      gstRate: 18,
    },
  ]);

  // Adjustments & Shipping
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<DiscountType>('fixed');
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState<number>(0);
  const [shippingAmount, setShippingAmount] = useState<number>(0);
  const [shippingGstRate, setShippingGstRate] = useState<number>(18);

  // Payment State
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [isFullPaymentChecked, setIsFullPaymentChecked] = useState(false);

  // Notes & Terms
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  // Notifications
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // 1. Initial Load of Master Data
  useEffect(() => {
    async function init() {
      try {
        const [biz, custs, prods] = await Promise.all([
          businessService.getProfile(),
          customerService.getCustomers(),
          gstProductService.getProducts(),
        ]);

        setBusinessProfile(biz);
        setCustomers(custs);
        setProducts(prods);

        setNotes(biz.default_notes || 'Thank you for choosing us! We appreciate your business.');
        setTerms(biz.default_terms || 'Goods once sold will not be returned unless damaged.');

        if (editInvoiceId) {
          // Edit Mode
          const existing = await gstInvoiceService.getInvoiceById(editInvoiceId);
          if (existing) {
            setIsDraft(Boolean(existing.is_draft));
            setReverseCharge(Boolean(existing.reverse_charge));
            setInvoiceNumber(existing.invoice_number);
            setInvoiceDate(existing.invoice_date);
            setDueDate(existing.due_date || '');
            setSelectedCustomerId(existing.customer_id || '');
            setCustomerName(existing.customer_snapshot?.name || '');
            setCustomerPhone(existing.customer_snapshot?.phone || '');
            setCustomerEmail(existing.customer_snapshot?.email || '');
            setCustomerGstin(existing.customer_snapshot?.gstin || '');
            setBillingAddress(existing.billing_address || existing.customer_snapshot?.billing_address || '');
            setShippingAddress(existing.shipping_address || existing.customer_snapshot?.shipping_address || '');
            setPlaceOfSupplyCode(existing.place_of_supply_state_code);
            setPlaceOfSupplyName(existing.place_of_supply);

            setInvoiceDiscountType(existing.invoice_discount_type);
            setInvoiceDiscountValue(existing.invoice_discount_value);
            setShippingAmount(existing.shipping_amount);
            setShippingGstRate(existing.shipping_gst_rate);
            setAmountPaid(existing.amount_paid);
            setPaymentMethod((existing.payment_method as PaymentMethod) || 'upi');
            setNotes(existing.notes || '');
            setTerms(existing.terms || '');

            if (existing.items && existing.items.length > 0) {
              setItems(
                existing.items.map((it, idx) => ({
                  id: it.id || `item-${Date.now()}-${idx}`,
                  productId: it.product_id || undefined,
                  productName: it.product_name_snapshot,
                  description: it.description_snapshot || '',
                  hsnSac: it.hsn_sac_snapshot || '3926',
                  quantity: it.quantity,
                  unit: it.unit || 'PCS',
                  unitPrice: it.unit_price,
                  discountType: it.discount_type || 'fixed',
                  discountValue: it.discount_value || 0,
                  gstRate: it.gst_rate,
                }))
              );
            }
          }
        } else {
          // New Invoice
          const nextNumber = await gstInvoiceService.getNextInvoiceNumber(biz.invoice_prefix || 'INV');
          setInvoiceNumber(nextNumber);

          // Check if customer query param is provided
          const queryCustId = searchParams.get('customerId');
          if (queryCustId) {
            const foundCust = custs.find((c) => c.id === queryCustId);
            if (foundCust) {
              selectCustomer(foundCust);
            }
          }
        }
      } catch (err) {
        console.error(err);
        triggerAlert('error', 'Error loading master data.');
      }
    }

    init();
  }, [editInvoiceId]);

  const selectCustomer = (c: GstCustomer) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    setCustomerEmail(c.email || '');
    setCustomerGstin(c.gstin || '');
    setBillingAddress(c.billing_address || '');
    setShippingAddress(c.shipping_address || c.billing_address || '');
    setPlaceOfSupplyCode(c.state_code || '09');
    setPlaceOfSupplyName(c.state || 'Uttar Pradesh');
    setSameAsBilling(!c.shipping_address || c.shipping_address === c.billing_address);
    setShowCustomerDropdown(false);
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
    setShowAddressSuggestions(false);
  };

  // Autocomplete matching lists
  const nameSuggestions = useMemo(() => {
    if (!customerName.trim() || selectedCustomerId) return [];
    const q = customerName.trim().toLowerCase();
    return customers.filter((c) => c.name && c.name.toLowerCase().includes(q));
  }, [customerName, customers, selectedCustomerId]);

  const phoneSuggestions = useMemo(() => {
    const clean = customerPhone.replace(/[^0-9]/g, '');
    if (clean.length < 3 || selectedCustomerId) return [];
    return customers.filter((c) => {
      const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
      return cPhone.includes(clean);
    });
  }, [customerPhone, customers, selectedCustomerId]);

  const addressSuggestions = useMemo(() => {
    if (!billingAddress.trim() || billingAddress.trim().length < 3 || selectedCustomerId) return [];
    const q = billingAddress.trim().toLowerCase();
    return customers.filter(
      (c) =>
        (c.billing_address && c.billing_address.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }, [billingAddress, customers, selectedCustomerId]);

  // Line Item Handlers
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}-${items.length}`,
        productName: '',
        description: '',
        hsnSac: '3926',
        quantity: 1,
        unit: 'PCS',
        unitPrice: 0,
        discountType: 'fixed',
        discountValue: 0,
        gstRate: businessProfile?.default_gst_rate || 18,
      },
    ]);
  };

  const handleProductSelect = (index: number, product: GstProduct) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: product.id,
      productName: product.name,
      description: product.description || '',
      hsnSac: product.hsn_sac || '3926',
      unitPrice: product.default_price,
      gstRate: product.default_gst_rate,
      unit: product.unit || 'PCS',
    };
    setItems(updated);
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItemInput,
    val: string | number | DiscountType | undefined
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  const handleDuplicateItem = (index: number) => {
    const itemToDup = items[index];
    const newItems = [...items];
    newItems.splice(index + 1, 0, {
      ...itemToDup,
      id: `item-${Date.now()}-${Math.random()}`,
    });
    setItems(newItems);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) {
      triggerAlert('error', 'Invoice must have at least one product line item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Perform Calculations
  const calculatedTotals = useMemo(() => {
    const sellerCode = businessProfile?.state_code || '27';
    return calculateInvoice({
      sellerStateCode: sellerCode,
      customerStateCode: placeOfSupplyCode,
      items,
      invoiceDiscountType,
      invoiceDiscountValue,
      shippingAmount,
      shippingGstRate,
      amountPaid: isFullPaymentChecked ? undefined : amountPaid,
      applyRounding: false,
    });
  }, [
    businessProfile,
    placeOfSupplyCode,
    items,
    invoiceDiscountType,
    invoiceDiscountValue,
    shippingAmount,
    shippingGstRate,
    amountPaid,
    isFullPaymentChecked,
  ]);

  // Sync Full Payment Checkbox
  useEffect(() => {
    if (isFullPaymentChecked) {
      setAmountPaid(calculatedTotals.grandTotal);
    }
  }, [isFullPaymentChecked, calculatedTotals.grandTotal]);

  // Construct Complete Invoice Snapshot for Preview & Save
  const currentInvoiceSnapshot: Partial<GstInvoiceRecord> = useMemo(() => {
    const words = numberToIndianWords(calculatedTotals.grandTotal);

    return {
      id: editInvoiceId,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      is_draft: isDraft,
      reverse_charge: reverseCharge,
      place_of_supply: placeOfSupplyName,
      place_of_supply_state_code: placeOfSupplyCode,
      is_inter_state: calculatedTotals.isInterState,
      customer_id: selectedCustomerId || null,
      seller_snapshot: businessProfile || {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Little Layerz',
        state: 'Uttar Pradesh',
        state_code: '09',
        gstin: '09AANPW1625N1ZY',
        invoice_prefix: 'INV',
        default_gst_rate: 18,
      },
      customer_snapshot: {
        id: selectedCustomerId || undefined,
        name: customerName || 'Cash Customer',
        phone: customerPhone || null,
        email: customerEmail || null,
        gstin: customerGstin || null,
        billing_address: billingAddress || null,
        shipping_address: sameAsBilling ? billingAddress || null : shippingAddress || null,
        state: placeOfSupplyName,
        state_code: placeOfSupplyCode,
      },
      billing_address: billingAddress || null,
      shipping_address: sameAsBilling ? billingAddress || null : shippingAddress || null,
      subtotal: calculatedTotals.subtotal,
      item_discount_total: calculatedTotals.itemDiscountTotal,
      invoice_discount_type: calculatedTotals.invoiceDiscountType,
      invoice_discount_value: calculatedTotals.invoiceDiscountValue,
      invoice_discount_amount: calculatedTotals.invoiceDiscountAmount,
      shipping_amount: calculatedTotals.shippingAmount,
      shipping_gst_rate: calculatedTotals.shippingGstRate,
      shipping_gst_amount: calculatedTotals.shippingGstAmount,
      taxable_amount: calculatedTotals.taxableAmount,
      cgst: calculatedTotals.totalCgst,
      sgst: calculatedTotals.totalSgst,
      igst: calculatedTotals.totalIgst,
      total_gst: calculatedTotals.totalGst,
      rounding_adjustment: calculatedTotals.roundingAdjustment,
      grand_total: calculatedTotals.grandTotal,
      amount_in_words: words,
      amount_paid: isFullPaymentChecked ? calculatedTotals.grandTotal : amountPaid,
      balance_due: isFullPaymentChecked ? 0 : Math.max(0, calculatedTotals.grandTotal - amountPaid),
      payment_status: isFullPaymentChecked
        ? 'paid'
        : amountPaid >= calculatedTotals.grandTotal
        ? 'paid'
        : amountPaid > 0
        ? 'partial'
        : 'unpaid',
      payment_method: paymentMethod,
      notes,
      terms,
      items: calculatedTotals.items.map((it, idx) => ({
        id: it.id,
        product_id: it.productId || null,
        product_name_snapshot: it.productName || 'Custom Item',
        description_snapshot: it.description || null,
        hsn_sac_snapshot: it.hsnSac || '3926',
        quantity: it.quantity,
        unit: it.unit || 'PCS',
        unit_price: it.unitPrice,
        gross_amount: it.grossAmount,
        discount_type: it.discountType,
        discount_value: it.discountValue,
        discount_amount: it.discountAmount,
        taxable_amount: it.taxableAmount,
        gst_rate: it.gstRate,
        cgst_rate: it.cgstRate,
        cgst_amount: it.cgstAmount,
        sgst_rate: it.sgstRate,
        sgst_amount: it.sgstAmount,
        igst_rate: it.igstRate,
        igst_amount: it.igstAmount,
        gst_amount: it.gstAmount,
        line_total: it.lineTotal,
        sort_order: idx,
      })),
    };
  }, [
    editInvoiceId,
    invoiceNumber,
    invoiceDate,
    dueDate,
    isDraft,
    reverseCharge,
    placeOfSupplyName,
    placeOfSupplyCode,
    selectedCustomerId,
    customerName,
    customerPhone,
    customerEmail,
    customerGstin,
    billingAddress,
    shippingAddress,
    sameAsBilling,
    businessProfile,
    calculatedTotals,
    isFullPaymentChecked,
    amountPaid,
    paymentMethod,
    notes,
    terms,
  ]);

  const handleSave = async (shouldDownloadPdf = false) => {
    if (!customerName.trim()) {
      triggerAlert('error', 'Please enter or select a customer name.');
      return;
    }

    const hasEmptyProduct = items.some((it) => !it.productName.trim());
    if (hasEmptyProduct) {
      triggerAlert('error', 'All items must have a valid product name.');
      return;
    }

    setIsSaving(true);
    try {
      let finalCustId = selectedCustomerId;
      if (customerName && customerName.trim() && customerName.trim().toLowerCase() !== 'cash customer') {
        try {
          const savedCust = await customerService.saveCustomer({
            id: finalCustId || undefined,
            name: customerName.trim(),
            phone: customerPhone ? customerPhone.trim() : null,
            email: customerEmail ? customerEmail.trim() : null,
            gstin: customerGstin ? customerGstin.trim().toUpperCase() : null,
            billing_address: billingAddress ? billingAddress.trim() : null,
            shipping_address: sameAsBilling ? (billingAddress ? billingAddress.trim() : null) : (shippingAddress ? shippingAddress.trim() : null),
            state: placeOfSupplyName,
            state_code: placeOfSupplyCode,
            total_orders: 1,
            total_spent: calculatedTotals.grandTotal,
            last_purchase_date: invoiceDate,
          });
          finalCustId = savedCust?.id || null;
          customerService.getCustomers().then((res) => setCustomers(res)).catch(() => {});
        } catch (custErr) {
          console.warn('Could not auto-save customer record:', custErr);
          // If we fail to save the customer, do not use the local generated ID for the invoice,
          // as it will cause a foreign key constraint violation. Use null instead.
          finalCustId = null;
        }
      }

      const saved = await gstInvoiceService.saveInvoice({
        ...currentInvoiceSnapshot,
        is_draft: isDraft,
        customer_id: finalCustId,
      });

      // Refresh this customer's running stats in the Customer Directory
      if (finalCustId) {
        try {
          const allInvoices = await gstInvoiceService.getInvoices();
          await customerService.refreshCustomerStats(finalCustId, allInvoices);
        } catch (statsErr) {
          // Non-critical — stats will sync on next load
          console.warn('Could not refresh customer stats:', statsErr);
        }
      }

      if (shouldDownloadPdf) {
        triggerAlert(
          'success',
          isDraft
            ? `Draft Invoice #${saved.invoice_number} saved & downloaded!`
            : `Tax Invoice #${saved.invoice_number} saved & downloaded!`
        );
        await generateInvoicePDF(saved, 'download');
      } else {
        triggerAlert(
          'success',
          isDraft
            ? `Draft Invoice #${saved.invoice_number} saved to database!`
            : `Tax Invoice #${saved.invoice_number} saved to database!`
        );
      }

      setTimeout(() => {
        navigate('/invoices');
      }, 1000);
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to save invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdfOnly = async () => {
    await generateInvoicePDF(currentInvoiceSnapshot as GstInvoiceRecord, 'download');
  };

  const filteredCustomerResults = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-4 sm:px-6 sm:py-6 md:px-8 pb-32 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
      <div className="mx-auto max-w-7xl">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 border-b border-neutral-900 pb-4 sm:pb-5 mb-4 sm:mb-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-neutral-50 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span>{editInvoiceId ? 'Edit Invoice' : isDraft ? 'Draft Invoice' : 'GST Tax Invoice'}</span>
                {isDraft && (
                  <span className="text-[10px] sm:text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                    Draft Mode
                  </span>
                )}
              </h1>
              <p className="text-[11px] sm:text-xs text-neutral-500 line-clamp-1 sm:line-clamp-none mt-0.5">
                {isDraft
                  ? 'Send preliminary draft invoice to customer for review'
                  : 'WhatsApp order billing with automated GST tax computations & PDF'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            {/* Mobile View Switcher */}
            <div className="flex lg:hidden bg-neutral-900 p-0.5 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'editor' ? 'bg-purple-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Form</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'preview' ? 'bg-purple-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Preview Modal Button */}
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 border border-purple-500/40 text-purple-300 hover:bg-purple-950/40 text-xs font-bold transition-all shadow-md hover:scale-[1.02] active:scale-95"
              >
                <Eye className="h-3.5 w-3.5 text-purple-400" />
                <span className="hidden xs:inline sm:inline">Preview</span>
              </button>

              {/* 1. Save (Only Store Data in Database) */}
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-xs font-bold text-neutral-100 shadow transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                title="Save to database without downloading PDF"
              >
                <Save className="h-3.5 w-3.5 text-emerald-400" />
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </button>

              {/* 2. Save & Download PDF */}
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-purple-600/20 hover:from-purple-500 hover:to-indigo-500 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                title="Save to database and download PDF"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden xs:inline sm:inline">{isSaving ? 'Saving...' : isDraft ? 'Save Draft & PDF' : 'Save & PDF'}</span>
                <span className="xs:hidden sm:hidden">{isSaving ? '...' : 'PDF'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Alerts */}
        {alert && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-xs font-medium backdrop-blur-md shadow-lg ${
              alert.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {alert.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{alert.message}</span>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (7 cols on lg) */}
          <div className={`lg:col-span-7 space-y-6 ${activeTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
            {/* 1. Document Mode & Meta Details Bar */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-300 ml-1">Document Type:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsDraft(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        !isDraft
                          ? 'bg-purple-600 text-white shadow'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Official Tax Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDraft(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        isDraft
                          ? 'bg-amber-600 text-white shadow'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Draft Invoice</span>
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-300 bg-neutral-900/80 px-2.5 py-1 rounded-lg border border-neutral-800">
                  <input
                    type="checkbox"
                    checked={reverseCharge}
                    onChange={(e) => setReverseCharge(e.target.checked)}
                    className="rounded border-neutral-700 bg-neutral-950 text-purple-600 focus:ring-0"
                  />
                  <span>Reverse Charge (RCM): <b className={reverseCharge ? 'text-amber-400' : 'text-neutral-400'}>{reverseCharge ? 'YES' : 'NO'}</b></span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-400 mb-1">
                    {isDraft ? 'Draft Invoice No. *' : 'Invoice No. *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono font-bold focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-400 mb-1">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-400 mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Customer Selection / Add Customer */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Customer & Place of Supply
                </h3>
                {selectedCustomerId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId('');
                      setCustomerName('');
                      setCustomerPhone('');
                      setCustomerEmail('');
                      setCustomerGstin('');
                      setBillingAddress('');
                      setShippingAddress('');
                    }}
                    className="text-[11px] text-neutral-400 hover:text-red-400"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {/* Autocomplete Search Bar */}
              <div className="relative">
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Search Existing Customer or Type Name below
                </label>
                <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-neutral-500" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Search by name, phone or GSTIN..."
                    className="bg-transparent border-none text-xs text-neutral-100 focus:outline-none w-full placeholder:text-neutral-500"
                  />
                </div>

                {/* Dropdown list */}
                {showCustomerDropdown && customerSearch && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                    {filteredCustomerResults.length === 0 ? (
                      <div className="p-3 text-xs text-neutral-500 text-center">No saved customer matches.</div>
                    ) : (
                      filteredCustomerResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            selectCustomer(c);
                            setCustomerSearch('');
                          }}
                          className="p-2.5 hover:bg-neutral-800 cursor-pointer text-xs border-b border-neutral-800/50 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-neutral-200">{c.name}</p>
                            <p className="text-[10px] text-neutral-400">
                              {c.phone || c.email || 'No contact'} • {c.state}
                            </p>
                          </div>
                          {c.gstin && <span className="font-mono text-[10px] text-purple-400 font-bold">{c.gstin}</span>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Customer Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* 1. Customer Name Autocomplete */}
                <div className="relative">
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setSelectedCustomerId('');
                      setShowNameSuggestions(true);
                    }}
                    onFocus={() => setShowNameSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-bold focus:border-purple-500 focus:outline-none"
                  />
                  {showNameSuggestions && nameSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {nameSuggestions.map((c) => (
                        <div
                          key={c.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectCustomer(c);
                          }}
                          className="p-2.5 hover:bg-neutral-800 cursor-pointer text-xs border-b border-neutral-800/50 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-neutral-200">{c.name}</p>
                            <p className="text-[10px] text-neutral-400">
                              {c.phone || c.email || 'No contact'} • {c.state}
                            </p>
                          </div>
                          {c.gstin && <span className="font-mono text-[10px] text-purple-400 font-bold">{c.gstin}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Customer Phone Autocomplete */}
                <div className="relative">
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Customer Phone / Mobile</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      setSelectedCustomerId('');
                      setShowPhoneSuggestions(true);
                    }}
                    onFocus={() => setShowPhoneSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPhoneSuggestions(false), 200)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono focus:border-purple-500 focus:outline-none"
                  />
                  {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {phoneSuggestions.map((c) => (
                        <div
                          key={c.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectCustomer(c);
                          }}
                          className="p-2.5 hover:bg-neutral-800 cursor-pointer text-xs border-b border-neutral-800/50 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-neutral-200">{c.name}</p>
                            <p className="text-[10px] text-neutral-400 font-mono">
                              {c.phone} • {c.state}
                            </p>
                          </div>
                          {c.gstin && <span className="font-mono text-[10px] text-purple-400 font-bold">{c.gstin}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. GSTIN */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={customerGstin}
                    onChange={(e) => {
                      const clean = e.target.value.toUpperCase();
                      setCustomerGstin(clean);
                    }}
                    placeholder="e.g. 27AABCU9603R1ZM"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono uppercase focus:border-purple-500 focus:outline-none"
                  />
                </div>

                {/* 4. Place of Supply */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Place of Supply (State) *
                  </label>
                  <select
                    value={placeOfSupplyCode}
                    onChange={(e) => {
                      const selected = e.target.value;
                      const found = INDIAN_STATES.find((s) => s.code === selected);
                      if (found) {
                        setPlaceOfSupplyCode(found.code);
                        setPlaceOfSupplyName(found.name);
                      }
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:border-purple-500 focus:outline-none"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Billing Address Autocomplete */}
                <div className="sm:col-span-2 relative">
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Billing Address</label>
                  <input
                    type="text"
                    value={billingAddress}
                    onChange={(e) => {
                      setBillingAddress(e.target.value);
                      setShowAddressSuggestions(true);
                    }}
                    onFocus={() => setShowAddressSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
                    placeholder="Full street address..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:border-purple-500 focus:outline-none"
                  />
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {addressSuggestions.map((c) => (
                        <div
                          key={c.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectCustomer(c);
                          }}
                          className="p-2.5 hover:bg-neutral-800 cursor-pointer text-xs border-b border-neutral-800/50 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-neutral-200">{c.name}</p>
                            <p className="text-[10px] text-neutral-400">
                              {c.billing_address} • {c.state}
                            </p>
                          </div>
                          {c.phone && <span className="font-mono text-[10px] text-neutral-400">{c.phone}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={(e) => setSameAsBilling(e.target.checked)}
                      className="rounded border-neutral-700 bg-neutral-950 text-purple-600 focus:ring-0"
                    />
                    <span>Shipping address is same as billing address</span>
                  </label>
                </div>

                {!sameAsBilling && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Shipping Address</label>
                    <input
                      type="text"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Delivery warehouse or location..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 3. Product Line Items */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Product Line Items ({items.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Item</span>
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-3 sm:p-4 rounded-xl border border-neutral-800 bg-neutral-950 space-y-2.5 sm:space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-400">Item #{index + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(index)}
                          className="p-1.5 text-neutral-400 hover:text-purple-400 rounded-lg hover:bg-neutral-900 transition-all"
                          title="Duplicate item"
                        >
                          <Copy className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(index)}
                          className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-neutral-900 transition-all"
                          title="Delete item"
                        >
                          <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5 sm:space-y-3">
                      {/* Product Selector / Name */}
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-neutral-400 mb-1">
                          Product Name *
                        </label>
                        <div className="space-y-1">
                          <input
                            type="text"
                            required
                            value={item.productName}
                            onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                            placeholder="e.g. Lithophane Lamp or select below"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-2 sm:py-1.5 text-xs text-neutral-100 font-bold focus:border-purple-500 focus:outline-none"
                          />
                          {products.length > 0 && (
                            <select
                              onChange={(e) => {
                                const selected = products.find((p) => p.id === e.target.value);
                                if (selected) handleProductSelect(index, selected);
                              }}
                              defaultValue=""
                              className="w-full bg-neutral-900/60 border border-neutral-800/80 rounded-md px-2 py-1.5 sm:py-1 text-[11px] sm:text-[10px] text-neutral-400 focus:outline-none truncate"
                            >
                              <option value="" disabled>
                                ⚡ Or select from saved catalogue...
                              </option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({formatIndianCurrency(p.default_price)}) - {p.default_gst_rate}% GST
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Row 2: HSN (4 cols), Qty (3 cols), Unit Price (5 cols) on mobile */}
                      <div className="grid grid-cols-12 gap-2 sm:gap-3">
                        {/* HSN / SAC */}
                        <div className="col-span-4 sm:col-span-4">
                          <label className="block text-[10px] font-semibold uppercase text-neutral-400 mb-1">
                            HSN/SAC
                          </label>
                          <input
                            type="text"
                            value={item.hsnSac || ''}
                            onChange={(e) => handleItemChange(index, 'hsnSac', e.target.value)}
                            placeholder="3926"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-2 sm:py-1.5 text-xs text-neutral-100 font-mono text-center focus:border-purple-500 focus:outline-none"
                          />
                        </div>

                        {/* Quantity & Unit */}
                        <div className="col-span-3 sm:col-span-3">
                          <label className="block text-[10px] font-semibold uppercase text-neutral-400 mb-1 text-center">
                            Qty
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            required
                            value={item.quantity === 0 ? '' : item.quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              handleItemChange(index, 'quantity', isNaN(val) ? 0 : val);
                            }}
                            placeholder="1"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-1.5 py-2 sm:py-1.5 text-xs text-neutral-100 font-mono text-center focus:border-purple-500 focus:outline-none"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="col-span-5 sm:col-span-5">
                          <label className="block text-[10px] font-semibold uppercase text-neutral-400 mb-1 text-right">
                            Unit Price (₹)
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={item.unitPrice === 0 ? '' : item.unitPrice}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              handleItemChange(index, 'unitPrice', isNaN(val) ? 0 : val);
                            }}
                            placeholder="0.00"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-2 sm:py-1.5 text-xs text-neutral-100 font-mono text-right focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Row 3: Description & (Discount + GST Rate) */}
                      <div className="space-y-2 pt-2 border-t border-neutral-900">
                        {/* Item Description */}
                        <div>
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Optional specifications / notes..."
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-[11px] text-neutral-300 focus:border-purple-500 focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Item Discount */}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.discountValue === 0 ? '' : (item.discountValue || '')}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                handleItemChange(index, 'discountValue', isNaN(val) ? 0 : val);
                              }}
                              placeholder="Discount"
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-[11px] text-neutral-100 font-mono focus:border-purple-500 focus:outline-none"
                            />
                            <select
                              value={item.discountType || 'fixed'}
                              onChange={(e) => handleItemChange(index, 'discountType', e.target.value as DiscountType)}
                              className="bg-neutral-900 border border-neutral-800 rounded-lg px-1.5 py-1.5 text-[10px] text-neutral-300 focus:outline-none"
                            >
                              <option value="fixed">₹</option>
                              <option value="percentage">%</option>
                            </select>
                          </div>

                          {/* GST Rate */}
                          <div>
                            <select
                              value={item.gstRate}
                              onChange={(e) => handleItemChange(index, 'gstRate', parseFloat(e.target.value) || 0)}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-[11px] text-neutral-100 font-mono focus:border-purple-500 focus:outline-none"
                            >
                              <option value={0}>GST 0%</option>
                              <option value={5}>GST 5%</option>
                              <option value={12}>GST 12%</option>
                              <option value={18}>GST 18%</option>
                              <option value={28}>GST 28%</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Discounts, Shipping & Payment Status */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-lg space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-neutral-800 pb-3 flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Invoice Adjustments & Payments
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Invoice-Level Discount */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Invoice-Level Discount</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={invoiceDiscountValue === 0 ? '' : invoiceDiscountValue}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setInvoiceDiscountValue(isNaN(val) ? 0 : val);
                      }}
                      placeholder="0.00"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono focus:border-purple-500 focus:outline-none"
                    />
                    <select
                      value={invoiceDiscountType}
                      onChange={(e) => setInvoiceDiscountType(e.target.value as DiscountType)}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-300 focus:outline-none"
                    >
                      <option value="fixed">₹ Fixed</option>
                      <option value="percentage">% Percent</option>
                    </select>
                  </div>
                </div>

                {/* Shipping Charges & Tax */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Shipping Charges (₹)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={shippingAmount === 0 ? '' : shippingAmount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setShippingAmount(isNaN(val) ? 0 : val);
                      }}
                      placeholder="0.00"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono focus:border-purple-500 focus:outline-none"
                    />
                    <select
                      value={shippingGstRate}
                      onChange={(e) => setShippingGstRate(parseFloat(e.target.value) || 0)}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-2 text-xs text-neutral-300 focus:outline-none font-mono"
                    >
                      <option value={0}>0% Tax</option>
                      <option value={18}>18% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={5}>5% GST</option>
                    </select>
                  </div>
                </div>

                {/* Payment Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-neutral-300">Amount Received (₹)</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-emerald-400 font-bold">
                      <input
                        type="checkbox"
                        checked={isFullPaymentChecked}
                        onChange={(e) => setIsFullPaymentChecked(e.target.checked)}
                        className="rounded border-neutral-700 bg-neutral-950 text-emerald-600"
                      />
                      <span>Mark Fully Paid</span>
                    </label>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    disabled={isFullPaymentChecked}
                    value={isFullPaymentChecked ? calculatedTotals.grandTotal : (amountPaid === 0 ? '' : amountPaid)}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setAmountPaid(isNaN(val) ? 0 : val);
                    }}
                    placeholder="0.00"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono font-bold focus:border-purple-500 focus:outline-none disabled:opacity-60"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="bank_transfer">Bank Transfer / IMPS / NEFT</option>
                    <option value="cash">Cash</option>
                    <option value="card">Debit / Credit Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 5. Notes & Terms */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 shadow-lg space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-neutral-800 pb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes & Terms
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Invoice Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Thank you for your order!"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Terms & Conditions</label>
                  <textarea
                    rows={2}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="e.g. Goods once sold will not be returned..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live A4 Preview (5 cols on lg, sticky) */}
          <div
            className={`lg:col-span-5 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] ${
              activeTab === 'editor' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="relative h-full">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="absolute top-3 right-4 z-20 hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 backdrop-blur-sm transition-all"
                title="Expand to Fullscreen Preview"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Fullscreen</span>
              </button>
              <InvoicePreview
                invoice={currentInvoiceSnapshot}
                onDownloadPdf={handleDownloadPdfOnly}
                onConvertToFinal={() => {
                  setIsDraft(false);
                  triggerAlert('success', 'Document converted to Official Tax Invoice mode!');
                }}
                isSaving={isSaving}
              />
            </div>
          </div>
        </div>

        {/* Sticky Floating Quick Action Bar (Always visible & handy at bottom) */}
        <div className="fixed bottom-3 sm:bottom-4 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:max-w-xl z-40 bg-neutral-900/95 backdrop-blur-md border border-neutral-800/90 p-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-2xl flex items-center justify-between sm:justify-center gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 pr-2 border-r border-neutral-800 shrink-0">
            <span className="text-[10px] sm:text-[11px] text-neutral-400">Total:</span>
            <span className="font-mono font-bold text-xs sm:text-sm text-purple-300">
              {formatIndianCurrency(calculatedTotals.grandTotal)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 text-xs font-bold transition-all"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden xs:inline sm:inline">Preview</span>
            </button>

            {/* Quick Save (Database Only) */}
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white text-xs font-bold transition-all disabled:opacity-50"
              title="Save to Supabase without downloading PDF"
            >
              <Save className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isSaving ? '...' : 'Save'}</span>
            </button>

            {/* Quick Save & Download PDF */}
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold hover:from-purple-500 hover:to-indigo-500 shadow-md transition-all disabled:opacity-50"
              title="Save to Supabase and download PDF"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isSaving ? '...' : isDraft ? 'Draft PDF' : 'Save & PDF'}</span>
            </button>
          </div>
        </div>

        {/* Fullscreen High-Res Invoice Preview Modal */}
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
              <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/80 shrink-0">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-neutral-100">
                    {isDraft ? 'Draft Invoice Preview' : 'Tax Invoice Live Preview'}
                  </h3>
                  <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-mono">
                    {invoiceNumber || 'INV-0001'}
                  </span>
                </div>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-950">
                <InvoicePreview
                  invoice={currentInvoiceSnapshot}
                  onDownloadPdf={handleDownloadPdfOnly}
                  onConvertToFinal={() => {
                    setIsDraft(false);
                    triggerAlert('success', 'Document converted to Official Tax Invoice mode!');
                  }}
                  isSaving={isSaving}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
