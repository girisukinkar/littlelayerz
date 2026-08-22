import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { InvoicesList } from './pages/InvoicesList';
import { CreateInvoice } from './pages/CreateInvoice';
import { InvoiceDetail } from './pages/InvoiceDetail';
import { Customers } from './pages/Customers';
import { Reports } from './pages/Reports';
import { Products } from './pages/Products';
import { EditProduct } from './pages/EditProduct';
import { Settings } from './pages/Settings';
import { Catalog } from './pages/Catalog';
import { Orders } from './pages/Orders';
import { Quotations } from './pages/Quotations';
import { FilamentInventory } from './pages/FilamentInventory';
import { MeeshoCategories } from './pages/MeeshoCategories';
import { ProfitCalculator } from './pages/ProfitCalculator';
import { Sales } from './pages/Sales';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Users,
  Database,
  FileSpreadsheet,
  Settings as SettingsIcon,
  Grid,
  Receipt,
  Sparkles,
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col print:bg-white print:text-black">
      {/* Navigation Navbar */}
      <nav className="border-b border-neutral-900 bg-neutral-950/90 sticky top-0 z-40 backdrop-blur-md px-4 py-2.5 md:px-8 print:hidden">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo Brand */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-white shadow shadow-purple-500/50 group-hover:scale-105 transition-all">
                D3D
              </div>
              <div>
                <span className="font-black tracking-tight text-neutral-100 text-sm block leading-none">
                  Dexter3D ERP
                </span>
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                  GST Invoicing Suite
                </span>
              </div>
            </NavLink>

            {/* Quick Action Button for Mobile */}
            <NavLink
              to="/invoices/new"
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white shadow"
            >
              <FilePlus className="h-3.5 w-3.5" />
              <span>New Invoice</span>
            </NavLink>
          </div>

          {/* Primary GST Navigation Links */}
          <div className="flex items-center gap-1 flex-wrap overflow-x-auto max-w-full pb-1 md:pb-0">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  isActive
                    ? 'border-purple-500/40 bg-purple-500/15 text-purple-300 shadow-sm'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                }`
              }
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-purple-400" />
              Dashboard
            </NavLink>

            <NavLink
              to="/invoices/new"
              className={({ isActive }) =>
                `hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  isActive
                    ? 'border-purple-500/40 bg-purple-500/15 text-purple-300 shadow-sm'
                    : 'border-purple-500/20 bg-purple-950/30 text-purple-300 hover:bg-purple-900/40 hover:text-purple-200'
                }`
              }
            >
              <FilePlus className="h-3.5 w-3.5 text-purple-400" />
              Create Invoice
            </NavLink>

            <NavLink
              to="/invoices"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  isActive
                    ? 'border-purple-500/40 bg-purple-500/15 text-purple-300 shadow-sm'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                }`
              }
            >
              <FileText className="h-3.5 w-3.5" />
              Invoices
            </NavLink>

            <NavLink
              to="/customers"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  isActive
                    ? 'border-purple-500/40 bg-purple-500/15 text-purple-300 shadow-sm'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                }`
              }
            >
              <Users className="h-3.5 w-3.5" />
              Customers
            </NavLink>

            <NavLink
              to="/products"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  isActive
                    ? 'border-purple-500/40 bg-purple-500/15 text-purple-300 shadow-sm'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                }`
              }
            >
              <Database className="h-3.5 w-3.5" />
              Products
            </NavLink>

            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  isActive
                    ? 'border-purple-500/40 bg-purple-500/15 text-purple-300 shadow-sm'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                }`
              }
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Reports
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  isActive
                    ? 'border-purple-500/40 bg-purple-500/15 text-purple-300 shadow-sm'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                }`
              }
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              Settings
            </NavLink>

            {/* Separator */}
            <span className="h-4 w-px bg-neutral-800 mx-1 hidden lg:inline-block" />

            {/* 3D Printing ERP Modules */}
            <NavLink
              to="/sales"
              className={({ isActive }) =>
                `hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isActive
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`
              }
              title="Market / Stall Sales"
            >
              <Receipt className="h-3.5 w-3.5 text-emerald-500" />
              Stall Sales
            </NavLink>

            <NavLink
              to="/catalog"
              className={({ isActive }) =>
                `hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isActive
                    ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`
              }
              title="All 3D Catalog"
            >
              <Grid className="h-3.5 w-3.5" />
              Catalog
            </NavLink>

            <NavLink
              to="/quotations"
              className={({ isActive }) =>
                `hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isActive
                    ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`
              }
              title="Quotations"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Quotes
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow print:p-0">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/invoices" element={<InvoicesList />} />
          <Route path="/invoices/new" element={<CreateInvoice />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/invoices/:id/edit" element={<CreateInvoice />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/edit/:id" element={<EditProduct />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />

          {/* 3D Printing Companion Routes */}
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/catalog/edit/:id" element={<EditProduct />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/quotations/:id" element={<Quotations />} />
          <Route path="/filament-inventory" element={<FilamentInventory />} />
          <Route path="/meesho-categories" element={<MeeshoCategories />} />
          <Route path="/calculator" element={<ProfitCalculator />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/rs" element={<Sales />} />
          <Route path="/items-sold" element={<Sales />} />
          <Route path="/market-sales" element={<Sales />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
