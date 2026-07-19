import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, ChevronRight, ChevronDown, Tag, Layers, Grid3X3, Leaf, X, Package, ExternalLink, Image as ImageIcon, Sparkles, UploadCloud, Copy, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CategoryNode {
  id: number | string;
  name: string;
  type?: string;
  level: number;
  leaf: boolean;
  path: string;
  ancestor_ids?: number[];
  min_products?: number;
  max_products?: number;
  children: CategoryNode[];
}

interface LeafCategory {
  id: string;
  name: string;
  path: string;
  level: number;
  min_products: number | null;
  max_products: number | null;
  ancestor_ids: number[];
  super_category: string;
  category: string;
  sub_category: string;
  leaf_category: string;
}

const LEVEL_COLORS = [
  { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', dot: 'bg-violet-500' },
  { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-500' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', dot: 'bg-cyan-500' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
];

const LEVEL_ICONS = [
  <Grid3X3 className="w-3.5 h-3.5" />,
  <Layers className="w-3.5 h-3.5" />,
  <Tag className="w-3.5 h-3.5" />,
  <Leaf className="w-3.5 h-3.5" />,
];

// ─── Tree Node Component ──────────────────────────────────────────────────────
function TreeNode({
  node,
  depth = 0,
  searchQuery,
  onSelectLeaf,
  selectedId,
  defaultOpen = false,
}: {
  node: CategoryNode;
  depth?: number;
  searchQuery: string;
  onSelectLeaf: (node: CategoryNode) => void;
  selectedId: string | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || depth < 1);
  const color = LEVEL_COLORS[Math.min(depth, 3)];
  const hasChildren = node.children && node.children.length > 0;

  const isHighlighted = searchQuery &&
    node.name.toLowerCase().includes(searchQuery.toLowerCase());

  if (node.leaf) {
    const isSelected = String(node.id) === selectedId;
    return (
      <button
        onClick={() => onSelectLeaf(node)}
        className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all group ${
          isSelected
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            : isHighlighted
            ? 'bg-yellow-500/10 text-yellow-300'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
        }`}
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-emerald-400' : 'bg-neutral-600 group-hover:bg-neutral-400'}`} />
        <span className="truncate">{node.name}</span>
        {node.min_products !== undefined && (
          <span className="ml-auto text-[10px] text-neutral-600 shrink-0">
            {node.min_products}–{node.max_products}p
          </span>
        )}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
          isHighlighted
            ? 'bg-yellow-500/10 text-yellow-300'
            : depth === 0
            ? `${color.bg} ${color.text} border ${color.border}`
            : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/60'
        }`}
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
      >
        <span className="shrink-0 transition-transform duration-150" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <ChevronDown className="w-3.5 h-3.5" />
        </span>
        <span className="truncate flex-1">{node.name}</span>
        <span className="ml-auto text-[10px] text-neutral-600 shrink-0">
          {hasChildren ? node.children.length : ''}
        </span>
      </button>
      {open && hasChildren && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child, i) => (
            <TreeNode
              key={child.id ?? i}
              node={child}
              depth={depth + 1}
              searchQuery={searchQuery}
              onSelectLeaf={onSelectLeaf}
              selectedId={selectedId}
              defaultOpen={searchQuery.length > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LeafDetailPanel({
  node,
  attributes = {},
  onClose,
}: {
  node: CategoryNode | null;
  attributes?: Record<string, any>;
  onClose: () => void;
}) {
  if (!node) return (
    <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-4">
      <Leaf className="w-12 h-12 opacity-20" />
      <p className="text-sm">Select a leaf category to view details</p>
    </div>
  );

  const pathParts = node.path.split(' > ');
  const attrData = attributes && typeof attributes === 'object' ? attributes[String(node.id)] : undefined;

  return (
    <div className="p-5 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Leaf Category</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-100">{node.name}</h2>
          <p className="text-xs text-neutral-500 mt-1">ID: {node.id}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Hierarchy Breadcrumb */}
      <div className="mb-5">
        <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-2">Category Hierarchy</p>
        <div className="flex flex-col gap-1.5">
          {pathParts.map((part, i) => {
            const color = LEVEL_COLORS[i];
            const isLast = i === pathParts.length - 1;
            return (
              <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${i * 14}px` }}>
                {i > 0 && <ChevronRight className="w-3 h-3 text-neutral-700 shrink-0" />}
                <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${color.bg} ${color.text} border ${color.border}`}>
                  {LEVEL_ICONS[i]}
                  {part}
                  {isLast && <span className="ml-1 text-[9px] opacity-60">#{node.id}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Min Products</span>
          </div>
          <p className="text-2xl font-bold text-neutral-100">{node.min_products ?? '—'}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Max Products</span>
          </div>
          <p className="text-2xl font-bold text-neutral-100">{node.max_products ?? '—'}</p>
        </div>
      </div>

      {/* Image Requirements (Crawl Attribute Live Data) */}
      {attrData && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-5 space-y-3">
          <div className="flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">CRAWLED IMAGE RULES</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-[9px] text-neutral-500 block mb-0.5">REQUIRED IMAGES</span>
              <span className="text-base font-bold text-neutral-200">
                {attrData.required_images_count !== null ? `${attrData.required_images_count} image(s)` : 'Not specified'}
              </span>
            </div>
            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-[9px] text-neutral-500 block mb-0.5">SIZE CHART STATUS</span>
              <span className={`text-xs font-semibold ${attrData.image_link ? 'text-emerald-400' : 'text-neutral-400'}`}>
                {attrData.image_link ? '✓ Template Available' : 'No Template'}
              </span>
            </div>
          </div>
          
          {attrData.image_link && (
            <div className="mt-3">
              <span className="text-[9px] text-neutral-500 block mb-1">SIZE CHART / TEMPLATE</span>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 flex flex-col items-center gap-2 group relative overflow-hidden">
                <img
                  src={attrData.image_link}
                  alt="Size guide template"
                  className="max-h-32 object-contain rounded hover:scale-105 transition-transform duration-200"
                />
                <a
                  href={attrData.image_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 mt-1"
                >
                  View Full Template <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Path */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3 mb-4">
        <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-1.5">Full Path</p>
        <code className="text-xs text-neutral-300 leading-relaxed">{node.path}</code>
      </div>

      {/* Open in Meesho */}
      <a
        href={`https://supplier.meesho.com/panel/v3/new/cataloging/req4n/catalogs/single/select-category`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 rounded-xl text-violet-300 text-xs font-semibold transition-all"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Open in Meesho Supplier
      </a>
    </div>
  );
}

// ─── Search Result Item ────────────────────────────────────────────────────────
function SearchResultItem({ cat, onClick, isSelected }: { cat: LeafCategory; onClick: () => void; isSelected: boolean }) {
  const pathParts = cat.path.split(' > ');
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isSelected
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 text-neutral-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{cat.name}</p>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {pathParts.slice(0, -1).map((p, i) => (
              <span key={i} className="flex items-center gap-0.5 text-[10px] text-neutral-500">
                {i > 0 && <ChevronRight className="w-2.5 h-2.5" />}
                {p}
              </span>
            ))}
          </div>
        </div>
        <span className="text-[10px] text-neutral-600 shrink-0 mt-0.5">#{cat.id}</span>
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function MeeshoCategoryBrowser() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [leafCategories, setLeafCategories] = useState<LeafCategory[]>([]);
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<CategoryNode | null>(null);
  
  // New AI Assistant states
  const [viewMode, setViewMode] = useState<'browser' | 'ai-assistant'>('browser');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [productDesc, setProductDesc] = useState('');
  const [copied, setCopied] = useState(false);

  // Load data from JSON files in the public dir or via import
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [catRes, leafRes] = await Promise.all([
          fetch('/meesho/categories.json'),
          fetch('/meesho/leaf_categories.json'),
        ]);
        
        if (!catRes.ok) throw new Error('categories.json not found in /public/meesho/');
        
        const [cats, leaves] = await Promise.all([catRes.json(), leafRes.json()]);
        setCategories(cats);
        setLeafCategories(leaves);

        // Fetch attributes if available (tolerating failure during background crawl)
        try {
          const attrRes = await fetch('/meesho/attributes.json');
          if (attrRes.ok) {
            const attrs = await attrRes.json();
            setAttributes(attrs);
          }
        } catch (e) {}
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    load();

    // Set up a polling interval to refresh attributes while the crawl is active
    const interval = setInterval(async () => {
      try {
        const attrRes = await fetch('/meesho/attributes.json');
        if (attrRes.ok) {
          const attrs = await attrRes.json();
          setAttributes(attrs);
        }
      } catch (e) {}
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return leafCategories
      .filter(cat =>
        cat.name.toLowerCase().includes(q) ||
        cat.path.toLowerCase().includes(q) ||
        cat.id === q
      )
      .slice(0, 60);
  }, [searchQuery, leafCategories]);

  // AI Assistant: live matching suggestions based on description
  const aiMatches = useMemo(() => {
    if (!productDesc.trim() || productDesc.length < 2) return [];
    const q = productDesc.toLowerCase();
    return leafCategories
      .filter(cat =>
        cat.name.toLowerCase().includes(q) ||
        cat.path.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [productDesc, leafCategories]);

  const handleSelectLeaf = useCallback((node: CategoryNode) => {
    setSelectedNode(node);
  }, []);

  const handleSearchSelect = useCallback((cat: LeafCategory) => {
    // Convert leaf category to node format
    const node: CategoryNode = {
      id: cat.id,
      name: cat.name,
      type: 'leaf_category',
      level: 4,
      leaf: true,
      path: cat.path,
      ancestor_ids: cat.ancestor_ids,
      min_products: cat.min_products ?? undefined,
      max_products: cat.max_products ?? undefined,
      children: [],
    };
    setSelectedNode(node);
  }, []);

  // Handle image drop/upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate and copy helper prompt for AI chat
  const copyPromptToClipboard = () => {
    const descText = productDesc.trim() || "this product";
    const promptText = `Hey, I want to list a new product on Meesho. It's a "${descText}". Based on the crawled category system, which leaf category should I select? Please provide the exact 4-level category path (e.g. Super > Category > Sub > Leaf), the category ID, and any image rules/size guide requirements.`;
    
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stats
  const stats = useMemo(() => {
    let subCatCount = 0, catCount = 0;
    categories.forEach(sc => {
      sc.children.forEach(c => { catCount++; subCatCount += c.children.length; });
    });
    return {
      superCats: categories.length,
      cats: catCount,
      subCats: subCatCount,
      leaves: leafCategories.length,
    };
  }, [categories, leafCategories]);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-neutral-400 text-sm">Loading Meesho categories...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-96">
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md text-center">
        <p className="text-red-400 font-semibold mb-2">Failed to load categories</p>
        <p className="text-red-300/60 text-sm">{error}</p>
        <p className="text-neutral-500 text-xs mt-3">
          Make sure the JSON files are in <code className="bg-neutral-800 px-1 rounded">public/meesho/</code>
        </p>
      </div>
    </div>
  );

  const showSearch = searchQuery.length >= 2;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header + Mode Switcher */}
      <div className="px-6 pt-6 pb-4 border-b border-neutral-900 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-900/30">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-100">Meesho Category Center</h1>
              <p className="text-xs text-neutral-500">Complete supplier category hierarchy & assistant</p>
            </div>
          </div>

          {/* View Mode Selector */}
          <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('browser')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'browser'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Browse Tree
            </button>
            <button
              onClick={() => setViewMode('ai-assistant')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'ai-assistant'
                  ? 'bg-gradient-to-r from-orange-600/30 to-pink-600/30 border border-orange-500/20 text-orange-200 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Assistant Guide
            </button>
          </div>
        </div>

        {/* Browser Stats (Only visible in browser mode) */}
        {viewMode === 'browser' && (
          <>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Super', value: stats.superCats, color: 'text-violet-400' },
                { label: 'Category', value: stats.cats, color: 'text-blue-400' },
                { label: 'Sub-Cat', value: stats.subCats, color: 'text-cyan-400' },
                { label: 'Leaf', value: stats.leaves, color: 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search categories by name, path, or ID..."
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-violet-500/50 rounded-xl pl-9 pr-9 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {viewMode === 'browser' ? (
          <>
            {/* Tree / Search panel */}
            <div className="w-[380px] shrink-0 border-r border-neutral-900 overflow-y-auto overflow-x-hidden p-3 space-y-1">
              {showSearch ? (
                <div className="space-y-1.5">
                  {searchResults.length === 0 ? (
                    <div className="text-center text-neutral-600 text-sm py-8">No categories matching "{searchQuery}"</div>
                  ) : (
                    <>
                      <p className="text-[10px] text-neutral-500 px-1 pb-1 font-semibold uppercase tracking-wider">
                        {searchResults.length} results for "{searchQuery}"
                      </p>
                      {searchResults.map(cat => (
                        <SearchResultItem
                          key={cat.id}
                          cat={cat}
                          onClick={() => handleSearchSelect(cat)}
                          isSelected={selectedNode?.id === cat.id}
                        />
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {categories.map((node, i) => (
                    <TreeNode
                      key={node.id ?? i}
                      node={node}
                      depth={0}
                      searchQuery={searchQuery}
                      onSelectLeaf={handleSelectLeaf}
                      selectedId={selectedNode ? String(selectedNode.id) : null}
                      defaultOpen={false}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Detail panel */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <LeafDetailPanel
                node={selectedNode}
                attributes={attributes}
                onClose={() => setSelectedNode(null)}
              />
            </div>
          </>
        ) : (
          /* AI Assistant Classification Guide View */
          <div className="flex-1 overflow-y-auto p-6 bg-neutral-950">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Column: Image Uploader Zone */}
              <div className="space-y-6">
                <div className="bg-neutral-900/60 border border-neutral-850 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-neutral-200 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-orange-400" />
                    Product Photo Preview
                  </h3>
                  
                  {uploadedImage ? (
                    <div className="relative group rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 p-2 flex flex-col items-center">
                      <img
                        src={uploadedImage}
                        alt="Product preview"
                        className="max-h-72 object-contain rounded-lg"
                      />
                      <button
                        onClick={() => setUploadedImage(null)}
                        className="absolute top-4 right-4 bg-neutral-900/80 hover:bg-neutral-900 text-neutral-300 hover:text-white p-1.5 rounded-lg border border-neutral-800 backdrop-blur"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-neutral-800 hover:border-neutral-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors group bg-neutral-950/40 min-h-64">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200 border border-neutral-800">
                        <UploadCloud className="w-6 h-6 text-neutral-500 group-hover:text-neutral-300" />
                      </div>
                      <p className="text-xs font-semibold text-neutral-300 text-center mb-1">
                        Drag & Drop or Click to Upload Image
                      </p>
                      <p className="text-[10px] text-neutral-500 text-center">
                        Supports JPEG, PNG, WEBP files
                      </p>
                    </label>
                  )}
                </div>

                {/* Live Match Search Helper */}
                <div className="bg-neutral-900/60 border border-neutral-850 rounded-2xl p-5 shadow-sm space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Product Name / Keywords</h3>
                    <p className="text-[10px] text-neutral-500">Refines matching suggestions from the 3,850 leaf categories</p>
                  </div>
                  <input
                    type="text"
                    value={productDesc}
                    onChange={e => setProductDesc(e.target.value)}
                    placeholder="e.g. Saree, Kurta, Phone Holder, Bedsheet..."
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-orange-500/40 rounded-xl px-3.5 py-2 text-xs text-neutral-200 placeholder-neutral-700 outline-none transition-colors"
                  />

                  {aiMatches.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Direct Category Matches</p>
                      <div className="space-y-1">
                        {aiMatches.map(m => (
                          <div
                            key={m.id}
                            className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-850 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-neutral-200 truncate">{m.name}</p>
                              <p className="text-[9px] text-neutral-500 truncate mt-0.5">{m.path}</p>
                            </div>
                            <span className="text-[9px] text-neutral-600 font-mono shrink-0">#{m.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: AI Assistant Steps */}
              <div className="space-y-6">
                <div className="bg-neutral-900/60 border border-neutral-850 rounded-2xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-400" />
                    <h3 className="text-base font-bold text-neutral-100">Category Classification Guide</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Step 1 */}
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-neutral-950 border border-neutral-800 text-xs font-bold text-neutral-400 flex items-center justify-center shrink-0">
                        1
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-200">Prepare Image</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Upload your product photo on the left so you can preview details.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-neutral-950 border border-neutral-800 text-xs font-bold text-neutral-400 flex items-center justify-center shrink-0">
                        2
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-200">Share in AI Chat Window</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Since this is a local ERP system, paste the image directly in our conversation window or ask me to check your current browser view.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-neutral-950 border border-neutral-800 text-xs font-bold text-neutral-400 flex items-center justify-center shrink-0">
                        3
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-neutral-200">Copy AI Prompt</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5 mb-2.5">
                          Use this template prompt to ask the AI assistant for an immediate, high-fidelity classification:
                        </p>
                        
                        <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-3 flex items-start gap-2 relative">
                          <code className="text-[10px] text-neutral-400 leading-relaxed block pr-8 select-all">
                            Hey, I want to list a new product on Meesho. It's a "{productDesc.trim() || "this product"}". Based on the crawled category system, which leaf category should I select?
                          </code>
                          <button
                            onClick={copyPromptToClipboard}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors shrink-0"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-neutral-800/80 pt-4">
                    <div className="bg-gradient-to-r from-orange-600/10 to-pink-600/10 rounded-xl p-4 border border-orange-500/10">
                      <p className="text-xs font-semibold text-orange-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Multimodal Capabilities
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">
                        I can automatically inspect the colors, patterns, material types, and shapes of the product photo you share, cross-referencing it with the crawled categories database to suggest the exact mapping.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
              
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
