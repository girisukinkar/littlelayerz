import React, { useState, useEffect } from 'react';
import type { GstCustomer, GstInvoiceRecord } from '../types/gst';
import { customerService } from '../services/customerService';
import { gstInvoiceService } from '../services/gstInvoiceService';
import { INDIAN_STATES, getStateCodeFromGstin, validateGstin } from '../utils/indianStates';
import { formatIndianCurrency } from '../utils/gstCalculations';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FilePlus,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<GstCustomer[]>([]);
  const [allInvoices, setAllInvoices] = useState<GstInvoiceRecord[]>([]);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<GstCustomer | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    gstin: '',
    billing_address: '',
    shipping_address: '',
    city: '',
    state: 'Maharashtra',
    state_code: '27',
    pincode: '',
    notes: '',
    sameAsBilling: true,
  });

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const navigate = useNavigate();

  const triggerAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const [custData, invData] = await Promise.all([
        customerService.getCustomers(),
        gstInvoiceService.getInvoices(),
      ]);
      setCustomers(custData);
      setAllInvoices(invData);
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const toggleInvoices = (custId: string) => {
    setExpandedCustomerId((prev) => (prev === custId ? null : custId));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'partial':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'unpaid':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      default:
        return 'bg-neutral-700/30 text-neutral-400 border-neutral-600/30';
    }
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      gstin: '',
      billing_address: '',
      shipping_address: '',
      city: '',
      state: 'Maharashtra',
      state_code: '27',
      pincode: '',
      notes: '',
      sameAsBilling: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: GstCustomer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      gstin: customer.gstin || '',
      billing_address: customer.billing_address || '',
      shipping_address: customer.shipping_address || '',
      city: customer.city || '',
      state: customer.state || 'Maharashtra',
      state_code: customer.state_code || '27',
      pincode: customer.pincode || '',
      notes: customer.notes || '',
      sameAsBilling: !customer.shipping_address || customer.shipping_address === customer.billing_address,
    });
    setIsModalOpen(true);
  };

  const handleGstinChange = (value: string) => {
    const clean = value.toUpperCase();
    let stateCode = formData.state_code;
    let stateName = formData.state;

    const extractedCode = getStateCodeFromGstin(clean);
    if (extractedCode) {
      const found = INDIAN_STATES.find((s) => s.code === extractedCode);
      if (found) {
        stateCode = found.code;
        stateName = found.name;
      }
    }

    setFormData({
      ...formData,
      gstin: clean,
      state_code: stateCode,
      state: stateName,
    });
  };

  const handleStateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    const found = INDIAN_STATES.find((s) => s.code === selectedCode);
    if (found) {
      setFormData({
        ...formData,
        state_code: found.code,
        state: found.name,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      triggerAlert('error', 'Customer name is required');
      return;
    }

    if (formData.gstin && !validateGstin(formData.gstin)) {
      triggerAlert('error', 'Invalid 15-character GSTIN format');
      return;
    }

    try {
      const payload: Partial<GstCustomer> = {
        id: editingCustomer?.id,
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        gstin: formData.gstin.trim() ? formData.gstin.trim().toUpperCase() : null,
        billing_address: formData.billing_address.trim() || null,
        shipping_address: formData.sameAsBilling
          ? formData.billing_address.trim() || null
          : formData.shipping_address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state,
        state_code: formData.state_code,
        pincode: formData.pincode.trim() || null,
        notes: formData.notes.trim() || null,
      };

      await customerService.saveCustomer(payload);
      triggerAlert('success', editingCustomer ? 'Customer updated successfully' : 'Customer created successfully');
      setIsModalOpen(false);
      loadCustomers();
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to save customer');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await customerService.deleteCustomer(id);
      triggerAlert('success', 'Customer deleted');
      loadCustomers();
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to delete customer');
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      (c.phone && c.phone.includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.gstin && c.gstin.toLowerCase().includes(query)) ||
      (c.city && c.city.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-900 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-neutral-50">Customer Directory</h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Manage buyers, GSTIN details, shipping destinations, and billing histories
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/20 hover:from-purple-500 hover:to-indigo-500 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>

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

        {/* Search Bar */}
        <div className="mb-6 flex items-center gap-3 bg-neutral-900/80 border border-neutral-800 rounded-xl px-3.5 py-2.5 max-w-md">
          <Search className="h-4 w-4 text-neutral-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone, GSTIN or city..."
            className="bg-transparent border-none text-xs text-neutral-100 focus:outline-none w-full placeholder:text-neutral-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-neutral-500 hover:text-neutral-300">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Customer Cards Grid */}
        {loading ? (
          <div className="py-20 text-center text-neutral-500 text-xs">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-12 text-center">
            <Users className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-neutral-300">No customers found</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              {searchQuery ? 'No matching customers found for your search query.' : 'Add your first customer to quickly prefill invoices with billing and shipping details.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-500"
              >
                <Plus className="h-3.5 w-3.5" /> Add First Customer
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((cust) => (
              <div
                key={cust.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/70 p-5 transition-all shadow-md flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-neutral-100">{cust.name}</h3>
                      <span className="inline-block mt-0.5 text-[10px] bg-neutral-800 border border-neutral-700 text-neutral-300 px-2 py-0.5 rounded font-mono">
                        {cust.state}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(cust)}
                        className="p-1.5 text-neutral-400 hover:text-purple-400 hover:bg-neutral-800 rounded-lg transition-all"
                        title="Edit Customer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cust.id, cust.name)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-all"
                        title="Delete Customer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {cust.gstin && (
                    <div className="text-[11px] font-mono font-bold text-purple-400 bg-purple-950/30 border border-purple-500/20 px-2.5 py-1 rounded-md">
                      GSTIN: {cust.gstin}
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-neutral-400 pt-1">
                    {cust.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                        <span>{cust.phone}</span>
                      </div>
                    )}
                    {cust.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                        <span className="truncate">{cust.email}</span>
                      </div>
                    )}
                    {(cust.billing_address || cust.city) && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-neutral-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-relaxed text-neutral-400 line-clamp-2">
                          {cust.billing_address ? `${cust.billing_address}, ` : ''}{cust.city} {cust.pincode}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800/80">
                  {/* Stats row */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">Total Spent</span>
                      <span className="text-xs font-mono font-bold text-neutral-200">
                        {formatIndianCurrency(
                          allInvoices
                            .filter((inv) => inv.customer_id === cust.id)
                            .reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0) || cust.total_spent || 0
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleInvoices(cust.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-neutral-700/40 text-neutral-300 border border-neutral-700 hover:bg-neutral-700/70 transition-all"
                        title="View customer invoices"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>
                          {allInvoices.filter((inv) => inv.customer_id === cust.id).length} Invoice
                          {allInvoices.filter((inv) => inv.customer_id === cust.id).length !== 1 ? 's' : ''}
                        </span>
                        {expandedCustomerId === cust.id
                          ? <ChevronUp className="h-3 w-3" />
                          : <ChevronDown className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => navigate(`/invoices/new?customerId=${cust.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 transition-all"
                        title="Create new invoice for this customer"
                      >
                        <FilePlus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Invoice History */}
                  {expandedCustomerId === cust.id && (
                    <div className="mt-2 rounded-xl border border-neutral-700/60 overflow-hidden">
                      {(() => {
                        const custInvoices = allInvoices
                          .filter((inv) => inv.customer_id === cust.id)
                          .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
                        return custInvoices.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-neutral-500">
                            No invoices yet for this customer.
                          </div>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-neutral-800/60 border-b border-neutral-700/60">
                                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Invoice #</th>
                                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Date</th>
                                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Amount</th>
                                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Status</th>
                                <th className="px-3 py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {custInvoices.map((inv, idx) => (
                                <tr
                                  key={inv.id}
                                  className={`border-b border-neutral-800/40 hover:bg-neutral-800/30 transition-colors ${
                                    idx === custInvoices.length - 1 ? 'border-none' : ''
                                  }`}
                                >
                                  <td className="px-3 py-2 font-mono font-bold text-neutral-200">
                                    {inv.is_draft && (
                                      <span className="text-[9px] font-normal text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded px-1 mr-1">DRAFT</span>
                                    )}
                                    {inv.invoice_number}
                                  </td>
                                  <td className="px-3 py-2 text-neutral-400">
                                    {new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono font-semibold text-neutral-100">
                                    {formatIndianCurrency(inv.grand_total)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${getStatusBadge(inv.payment_status)}`}>
                                      {inv.payment_status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <button
                                      onClick={() => navigate(`/invoices/${inv.id}`)}
                                      className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                                      title="Open invoice"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Customer Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/60">
                <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-neutral-300">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Customer / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma or TechDesign Ltd"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="client@example.com"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="e.g. 27AABCU9603R1ZM"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono uppercase"
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    Entering a valid GSTIN automatically resolves state and code.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">State & State Code *</label>
                    <select
                      value={formData.state_code}
                      onChange={handleStateSelect}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. Pune"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Billing Address</label>
                  <textarea
                    rows={2}
                    value={formData.billing_address}
                    onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                    placeholder="Full street address, office or flat number..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                    <input
                      type="checkbox"
                      checked={formData.sameAsBilling}
                      onChange={(e) => setFormData({ ...formData, sameAsBilling: e.target.checked })}
                      className="rounded border-neutral-700 bg-neutral-950 text-purple-600 focus:ring-0"
                    />
                    <span>Shipping address is same as billing address</span>
                  </label>
                </div>

                {!formData.sameAsBilling && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Shipping Address</label>
                    <textarea
                      rows={2}
                      value={formData.shipping_address}
                      onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                      placeholder="Delivery location / warehouse address..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Customer Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Preferred delivery times, specific filament choices..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-neutral-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow hover:from-purple-500 hover:to-indigo-500 transition-all"
                  >
                    {editingCustomer ? 'Update Customer' : 'Save Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
