import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Quotations } from './pages/Quotations';
import { Database, ShoppingBag, FileText } from 'lucide-react';

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

          <div className="flex gap-1.5">
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
          </div>
        </div>
      </nav>

      <main className="flex-grow print:p-0">
        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/quotations/:id" element={<Quotations />} />
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
