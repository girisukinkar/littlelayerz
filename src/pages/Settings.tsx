import React, { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { Save, CheckCircle2, ShieldAlert, Settings as SettingsIcon, Info } from 'lucide-react';

export const Settings: React.FC = () => {
  const settings = useSettingsStore();

  const [packagingCost, setPackagingCost] = useState(settings.defaultPackagingCost.toString());
  const [deliveryCost, setDeliveryCost] = useState(settings.defaultDeliveryCost.toString());
  const [electricityRate, setElectricityRate] = useState(settings.electricityRate.toString());
  const [printerPower, setPrinterPower] = useState(settings.printerPower.toString());

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPackaging = parseFloat(packagingCost);
    const parsedDelivery = parseFloat(deliveryCost);
    const parsedElectricity = parseFloat(electricityRate);
    const parsedPower = parseFloat(printerPower);

    if (isNaN(parsedPackaging) || parsedPackaging < 0) {
      triggerAlert('error', 'Default Packaging Cost must be a valid positive number.');
      return;
    }
    if (isNaN(parsedDelivery) || parsedDelivery < 0) {
      triggerAlert('error', 'Default Delivery Cost must be a valid positive number.');
      return;
    }
    if (isNaN(parsedElectricity) || parsedElectricity <= 0) {
      triggerAlert('error', 'Electricity Rate must be a valid positive number greater than 0.');
      return;
    }
    if (isNaN(parsedPower) || parsedPower <= 0) {
      triggerAlert('error', 'Printer Power must be a valid positive number greater than 0.');
      return;
    }

    settings.setSettings({
      defaultPackagingCost: parsedPackaging,
      defaultDeliveryCost: parsedDelivery,
      electricityRate: parsedElectricity,
      printerPower: parsedPower,
    });

    triggerAlert('success', 'Settings updated successfully!');
  };

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
      <div className="mx-auto max-w-2xl">
        {/* Header Block */}
        <header className="flex items-center gap-3 border-b border-neutral-900 pb-6 mb-6">
          <div className="h-10 w-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-50">
              System Settings
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Configure default values, electrical rates, and production parameters
            </p>
          </div>
        </header>

        {/* Success/Error Alerts */}
        {alert && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-sm shadow-lg backdrop-blur-md transition-all duration-300 ${
              alert.type === 'success'
                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                : 'border-red-500/20 bg-red-500/5 text-red-400'
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <ShieldAlert className="h-5 w-5 shrink-0" />
            )}
            <span className="font-medium">{alert.message}</span>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-900 pb-3 mb-4">
              Default Cost & Profit Parameters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-neutral-400">Default Packaging Cost (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-mono"
                  placeholder="e.g., 20"
                  required
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Prefilled automatically when creating a new product.
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400">Default Delivery Cost (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={deliveryCost}
                  onChange={(e) => setDeliveryCost(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-mono"
                  placeholder="e.g., 60"
                  required
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Prefilled automatically when creating a new product.
                </span>
              </div>
            </div>

            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-900 pb-3 pt-3 mb-4">
              Electricity & Hardware Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-neutral-400 font-sans">
                  Electricity Rate (₹/kWh)
                </label>
                <input
                  type="number"
                  step="any"
                  value={electricityRate}
                  onChange={(e) => setElectricityRate(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-mono"
                  placeholder="e.g., 7.1"
                  required
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Cost per kilowatt-hour of power consumed.
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 font-sans">
                  Printer Power Rating (kW)
                </label>
                <input
                  type="number"
                  step="any"
                  value={printerPower}
                  onChange={(e) => setPrinterPower(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-mono"
                  placeholder="e.g., 0.08"
                  required
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Power rating in kW (e.g. Bambu A1 Mini averages ~80W = 0.08 kW).
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg bg-neutral-900/40 border border-neutral-800 p-3 text-xs text-neutral-400 mt-4 leading-relaxed">
              <Info className="h-4 w-4 shrink-0 text-purple-400 mt-0.5" />
              <div>
                Updating these parameters will affect the live preview calculator on new products, and dynamically update the total costs and profits on the product table dashboard.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
