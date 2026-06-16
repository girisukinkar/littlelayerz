import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Database, ShoppingBag } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Navigation Navbar */}
      <nav className="border-b border-neutral-900 bg-neutral-950/80 sticky top-0 z-40 backdrop-blur-md px-4 py-3 md:px-8">
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
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTab === 'products'
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              Products
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTab === 'orders'
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Orders
            </button>
          </div>
        </div>
      </nav>

      {/* Active Dashboard */}
      <main className="flex-grow">
        {activeTab === 'products' ? <Products /> : <Orders />}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
