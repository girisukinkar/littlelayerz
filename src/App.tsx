import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Quotations } from './pages/Quotations';
import { Settings } from './pages/Settings';
import { FilamentInventory } from './pages/FilamentInventory';
import { MeeshoCategories } from './pages/MeeshoCategories';
import { ProfitCalculator } from './pages/ProfitCalculator';
import { Catalog } from './pages/Catalog';
import { Database, ShoppingBag, FileText, Layers, Settings as SettingsIcon, Store, Calculator, Grid } from 'lucide-react';

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
      <nav className="border-b border-neutral-900 bg-neutral-950/80 sticky top-0 z-40 backdrop-blur-md px-4 py-3 md:px-8 print:hidden">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow shadow-purple-500/50">
              D3D
            </div>
            <span className="font-extrabold tracking-tight text-neutral-200 text-sm hidden sm:inline-block">
              Dexter3D ERP
            </span>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <NavLink
              to="/products"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isActive
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 font-bold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              Products
            </NavLink>
            <NavLink
              to="/catalog"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isActive
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 font-bold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <Grid className="h-3.5 w-3.5 text-purple-400" />
              All Catalog
            </NavLink>
            <NavLink
              to="/orders"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isActive
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 font-bold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Orders
            </NavLink>
            <NavLink
              to="/filament-inventory"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isActive
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 font-bold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Filaments
            </NavLink>
            <NavLink
              to="/meesho-categories"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isActive
                  ? 'border-orange-500/30 bg-orange-500/10 text-orange-400 font-bold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              Meesho
            </NavLink>
            <NavLink
              to="/quotations"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isActive
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 font-bold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Quotations
            </NavLink>
            <NavLink
              to="/calculator"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isActive
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 font-bold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              Calculator
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isActive
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 font-bold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              Settings
            </NavLink>
          </div>
        </div>
      </nav>

      <main className="flex-grow print:p-0">
        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<Products />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/quotations/:id" element={<Quotations />} />
          <Route path="/filament-inventory" element={<FilamentInventory />} />
          <Route path="/meesho-categories" element={<MeeshoCategories />} />
          <Route path="/calculator" element={<ProfitCalculator />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/products" replace />} />
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
