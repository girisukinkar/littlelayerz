import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { businessService } from '../services/businessService';
import { storageService } from '../services/storageService';
import type { BusinessProfile } from '../types/gst';
import { INDIAN_STATES, getStateCodeFromGstin, validateGstin } from '../utils/indianStates';
import {
  Save,
  CheckCircle2,
  ShieldAlert,
  Settings as SettingsIcon,
  Building2,
  Upload,
  CreditCard,
  FileText,
  Sliders,
  Image as ImageIcon,
  QrCode,
  Share2,
  AtSign,
  MessageCircle,
  Globe,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const settingsStore = useSettingsStore();

  // Tabs: 'business' | 'production'
  const [activeTab, setActiveTab] = useState<'business' | 'production'>('business');

  // Business Profile State
  const [profile, setProfile] = useState<BusinessProfile>({
    id: 'biz-default-001',
    name: 'Dexter3D Studio',
    logo_url: '',
    upi_qr_url: '',
    instagram_handle: 'dexter3d_official',
    whatsapp_number: '+91 98765 43210',
    website: 'https://dexter3d.in',
    address: 'Shop No. 4, Tech Park Commercial Hub',
    city: 'Pune',
    state: 'Maharashtra',
    state_code: '27',
    pincode: '411057',
    gstin: '27AAPFU0939F1ZV',
    phone: '+91 98765 43210',
    email: 'contact@dexter3d.in',
    upi_id: 'dexter3d@okhdfcbank',
    bank_name: 'HDFC Bank Ltd',
    bank_account_no: '50200012345678',
    bank_ifsc: 'HDFC0001234',
    bank_branch: 'Hinjewadi Phase 1, Pune',
    invoice_prefix: 'INV',
    default_gst_rate: 18.0,
    default_notes: 'Thank you for choosing Dexter3D Studio! We appreciate your business.',
    default_terms: '1. Goods once sold will not be returned unless damaged upon receipt.\n2. In case of manufacturing defects, please report within 48 hours with unboxing video.',
  });

  // Production Settings State
  const [packagingCost, setPackagingCost] = useState(settingsStore.defaultPackagingCost.toString());
  const [deliveryCost, setDeliveryCost] = useState(settingsStore.defaultDeliveryCost.toString());
  const [electricityRate, setElectricityRate] = useState(settingsStore.electricityRate.toString());
  const [printerPower, setPrinterPower] = useState(settingsStore.printerPower.toString());

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  useEffect(() => {
    businessService.getProfile().then((data) => {
      if (data) setProfile(data);
    });
  }, []);

  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase();
    let code = profile.state_code;
    let name = profile.state;

    const extracted = getStateCodeFromGstin(clean);
    if (extracted) {
      const found = INDIAN_STATES.find((s) => s.code === extracted);
      if (found) {
        code = found.code;
        name = found.name;
      }
    }

    setProfile({
      ...profile,
      gstin: clean,
      state_code: code,
      state: name,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerAlert('error', 'Please upload a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const uploadedUrl = await storageService.uploadLogo(file);
      setProfile((prev) => ({ ...prev, logo_url: uploadedUrl }));
      triggerAlert('success', 'Company logo uploaded and updated!');
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to upload logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerAlert('error', 'Please upload a valid image file for UPI QR');
      return;
    }

    setIsUploadingQr(true);
    try {
      const uploadedUrl = await storageService.uploadLogo(file);
      setProfile((prev) => ({ ...prev, upi_qr_url: uploadedUrl }));
      triggerAlert('success', 'UPI QR Code uploaded and linked to invoices!');
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to upload UPI QR image.');
    } finally {
      setIsUploadingQr(false);
    }
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile.name.trim()) {
      triggerAlert('error', 'Business Name is required.');
      return;
    }

    if (profile.gstin && !validateGstin(profile.gstin)) {
      triggerAlert('error', 'Please enter a valid 15-character GSTIN or leave it blank.');
      return;
    }

    try {
      const saved = await businessService.updateProfile(profile);
      setProfile(saved);
      triggerAlert('success', 'Business GST profile saved successfully!');
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to save business settings.');
    }
  };

  const handleSaveProduction = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPackaging = parseFloat(packagingCost);
    const parsedDelivery = parseFloat(deliveryCost);
    const parsedElectricity = parseFloat(electricityRate);
    const parsedPower = parseFloat(printerPower);

    if (isNaN(parsedPackaging) || parsedPackaging < 0) {
      triggerAlert('error', 'Packaging cost must be a positive number.');
      return;
    }
    if (isNaN(parsedDelivery) || parsedDelivery < 0) {
      triggerAlert('error', 'Delivery cost must be a positive number.');
      return;
    }
    if (isNaN(parsedElectricity) || parsedElectricity <= 0) {
      triggerAlert('error', 'Electricity rate must be greater than 0.');
      return;
    }
    if (isNaN(parsedPower) || parsedPower <= 0) {
      triggerAlert('error', 'Printer power rating must be greater than 0.');
      return;
    }

    settingsStore.setSettings({
      defaultPackagingCost: parsedPackaging,
      defaultDeliveryCost: parsedDelivery,
      electricityRate: parsedElectricity,
      printerPower: parsedPower,
    });

    triggerAlert('success', 'Production & Electricity parameters saved!');
  };

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-900 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-neutral-50">Business & System Settings</h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Set company branding, logo, UPI QR code, social handles, GST registration & bank details
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab('business')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'business'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Business Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('production')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'production'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Hardware & Production</span>
            </button>
          </div>
        </header>

        {/* Alert notification */}
        {alert && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-xs font-medium backdrop-blur-md shadow-lg ${
              alert.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <ShieldAlert className="h-4 w-4 shrink-0" />
            )}
            <span>{alert.message}</span>
          </div>
        )}

        {/* Business Settings Tab */}
        {activeTab === 'business' && (
          <form onSubmit={handleSaveBusiness} className="space-y-6">
            {/* Section 1: Business Identity & Logo */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-xl space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-neutral-800 pb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                1. Company Identity, Logo & GST Registration
              </h3>

              <div className="flex flex-col sm:flex-row items-start gap-6 pt-2">
                {/* Logo Uploader */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <span className="text-[11px] font-semibold text-neutral-400">Company Logo</span>
                  <div className="h-24 w-24 rounded-xl border border-neutral-700 bg-neutral-950 flex items-center justify-center overflow-hidden relative shadow-inner">
                    {profile.logo_url ? (
                      <img src={profile.logo_url} alt="Logo" className="h-full w-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-neutral-600" />
                    )}
                    {isUploadingLogo && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px] text-purple-400">
                        Uploading...
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-semibold text-neutral-200 border border-neutral-700 transition-all">
                    <Upload className="h-3 w-3" />
                    <span>Upload Logo</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {profile.logo_url && (
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, logo_url: '' })}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Company / Business Name *</label>
                    <input
                      type="text"
                      required
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="e.g. Dexter3D Studio"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">GSTIN (Optional)</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={profile.gstin || ''}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      placeholder="e.g. 27AAPFU0939F1ZV"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono uppercase font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">State & State Code *</label>
                    <select
                      value={profile.state_code}
                      onChange={(e) => {
                        const found = INDIAN_STATES.find((s) => s.code === e.target.value);
                        if (found) {
                          setProfile({ ...profile, state_code: found.code, state: found.name });
                        }
                      }}
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
                      value={profile.city || ''}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      placeholder="e.g. Pune"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Registered Address</label>
                    <input
                      type="text"
                      value={profile.address || ''}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      placeholder="Shop/Office number, commercial building, street..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Business Email</label>
                    <input
                      type="email"
                      value={profile.email || ''}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="contact@dexter3d.in"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Bank, UPI & UPI QR Code */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-xl space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-neutral-800 pb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                2. Bank Account, UPI & QR Code Image
              </h3>

              <div className="flex flex-col sm:flex-row items-start gap-6 pt-2">
                {/* UPI QR Code Image Uploader */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <span className="text-[11px] font-semibold text-neutral-400">UPI QR Code</span>
                  <div className="h-24 w-24 rounded-xl border border-neutral-700 bg-neutral-950 flex items-center justify-center overflow-hidden relative shadow-inner">
                    {profile.upi_qr_url ? (
                      <img src={profile.upi_qr_url} alt="UPI QR" className="h-full w-full object-contain p-1" />
                    ) : (
                      <QrCode className="h-8 w-8 text-neutral-600" />
                    )}
                    {isUploadingQr && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px] text-purple-400">
                        Uploading...
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-semibold text-neutral-200 border border-neutral-700 transition-all">
                    <Upload className="h-3 w-3" />
                    <span>Upload QR</span>
                    <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                  </label>
                  {profile.upi_qr_url && (
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, upi_qr_url: '' })}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Remove QR
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">UPI ID (VPA)</label>
                    <input
                      type="text"
                      value={profile.upi_id || ''}
                      onChange={(e) => setProfile({ ...profile, upi_id: e.target.value })}
                      placeholder="e.g. yourbusiness@okhdfcbank"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={profile.bank_name || ''}
                      onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                      placeholder="e.g. HDFC Bank Ltd"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={profile.bank_account_no || ''}
                      onChange={(e) => setProfile({ ...profile, bank_account_no: e.target.value })}
                      placeholder="e.g. 50200012345678"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={profile.bank_ifsc || ''}
                      onChange={(e) => setProfile({ ...profile, bank_ifsc: e.target.value.toUpperCase() })}
                      placeholder="e.g. HDFC0001234"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Social Media Handles & Online Presence */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-xl space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-neutral-800 pb-3 flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                3. Social Media Handles & Online Presence
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1.5">
                    <AtSign className="h-3.5 w-3.5 text-purple-400" />
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={profile.instagram_handle || ''}
                    onChange={(e) => setProfile({ ...profile, instagram_handle: e.target.value })}
                    placeholder="@dexter3d_official"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                    WhatsApp Order Number
                  </label>
                  <input
                    type="text"
                    value={profile.whatsapp_number || ''}
                    onChange={(e) => setProfile({ ...profile, whatsapp_number: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-indigo-400" />
                    Website URL
                  </label>
                  <input
                    type="text"
                    value={profile.website || ''}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                    placeholder="https://dexter3d.in"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Invoicing Defaults & Terms */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-xl space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-neutral-800 pb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                4. Invoice Defaults, Terms & Notes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Default Invoice Prefix</label>
                  <input
                    type="text"
                    value={profile.invoice_prefix}
                    onChange={(e) => setProfile({ ...profile, invoice_prefix: e.target.value.toUpperCase() })}
                    placeholder="INV"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono font-bold uppercase"
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    {'e.g. INV → INV-0001, D3D → D3D-0001'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Default GST Rate (%)</label>
                  <select
                    value={profile.default_gst_rate}
                    onChange={(e) => setProfile({ ...profile, default_gst_rate: parseFloat(e.target.value) })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono"
                  >
                    <option value={0}>0% (Exempted)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (Standard Default)</option>
                    <option value={28}>28%</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Default Invoice Notes</label>
                  <input
                    type="text"
                    value={profile.default_notes || ''}
                    onChange={(e) => setProfile({ ...profile, default_notes: e.target.value })}
                    placeholder="Thank you for your business!"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Default Terms & Conditions</label>
                  <textarea
                    rows={3}
                    value={profile.default_terms || ''}
                    onChange={(e) => setProfile({ ...profile, default_terms: e.target.value })}
                    placeholder="Goods once sold cannot be returned..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold text-white shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Save className="h-4 w-4" />
                <span>Save Business Profile</span>
              </button>
            </div>
          </form>
        )}

        {/* Production & Electricity Parameters Tab */}
        {activeTab === 'production' && (
          <form onSubmit={handleSaveProduction} className="space-y-6">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-xl space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-neutral-800 pb-3 flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                Hardware, Power & Fulfillment Costs
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Default Packaging Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Default Delivery Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={deliveryCost}
                    onChange={(e) => setDeliveryCost(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Electricity Rate (₹/kWh)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={electricityRate}
                    onChange={(e) => setElectricityRate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Printer Power Rating (Watts)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={printerPower}
                    onChange={(e) => setPrinterPower(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold text-white shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Save className="h-4 w-4" />
                <span>Save Production Settings</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
