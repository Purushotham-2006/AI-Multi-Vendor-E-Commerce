import React, { useState, useEffect } from "react";
import { 
  Search, Mic, MicOff, Star, Filter, Heart, ShoppingCart, 
  ChevronRight, ArrowLeft, RotateCw, Sparkles, Scale, Info, 
  FileText, ShieldCheck, Truck, RefreshCcw, Loader2, Play
} from "lucide-react";
import { Product, Review } from "../types";

// Unified notification dispatcher helper
const broadcastNotification = (msg: string, type: "success" | "error" | "info" = "success") => {
  const event = new CustomEvent("vendicart_toast", { detail: { msg, type } });
  window.dispatchEvent(event);
};

export default function Storefront({
  onViewProduct,
  onAddToCart,
  userWishlist,
  onToggleWishlist
}: {
  onViewProduct: (p: Product) => void;
  onAddToCart: (p: Product, qty: number) => void;
  userWishlist: string[];
  onToggleWishlist: (p: Product) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  // Search/Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [maxPrice, setMaxPrice] = useState("10000");
  const [minRating, setMinRating] = useState("0");

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);

  // Compare listings
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [compareResultMarkdown, setCompareResultMarkdown] = useState("");
  const [isAIGenningCompare, setIsAIGenningCompare] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        q: searchQuery,
        category: selectedCategory,
        brand: selectedBrand,
        maxPrice: maxPrice,
        rating: minRating
      });
      const res = await fetch(`/api/products?${qs.toString()}`);
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCategory, selectedBrand, maxPrice, minRating]);

  useEffect(() => {
    // Quick categories baseline hydration
    setCategories([
      { name: "Electronics", tag: "📱", banner: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80" },
      { name: "Fashion", tag: "👗", banner: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=400&q=80" },
      { name: "Home & Living", tag: "🏠", banner: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80" },
      { name: "Sports & Outdoors", tag: "⚽", banner: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=400&q=80" },
      { name: "Grocery & Organic", tag: "🍵", banner: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80" }
    ]);
  }, []);

  // HTML5 Web Speech Voice Search
  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      broadcastNotification("Web Speech API is not fully compatible on your system frame permissions.", "error");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.lang = "en-IN";

    rec.onstart = () => {
      setIsListening(true);
      broadcastNotification("VendiCart Voice Listener active: Speak now...", "info");
    };

    rec.onresult = (e: any) => {
      const voiceInput = e.results[0][0].transcript;
      setSearchQuery(voiceInput);
      broadcastNotification(`Matched speech: "${voiceInput}"`);
    };

    rec.onerror = () => {
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.start();
  };

  // Compare toggle
  const handleToggleCompareSelection = (p: Product) => {
    if (compareList.some(item => item.id === p.id)) {
      setCompareList(prev => prev.filter(item => item.id !== p.id));
    } else {
      if (compareList.length >= 3) {
        broadcastNotification("Maximum limit of 3 products for comparison matrix.", "error");
        return;
      }
      setCompareList(prev => [...prev, p]);
    }
  };

  // AI Product Comparison analysis Trigger
  const handleRequestAIComparisonMatrix = async () => {
    if (compareList.length < 2) {
      broadcastNotification("Choose at least 2 products to trigger comparative models.", "error");
      return;
    }

    setIsComparing(true);
    setIsAIGenningCompare(true);
    setCompareResultMarkdown("");

    try {
      const res = await fetch("/api/ai/compare-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pids: compareList.map(item => item.id) })
      });
      const data = await res.json();
      if (res.ok) {
        setCompareResultMarkdown(data.result);
      }
    } catch (e) {
      console.error(e);
      setCompareResultMarkdown("Unified Comparison System offline. Soniq Hybrid ANC Headphones (₹5,099) offer advanced noise cancelations. VendiCart Watch serves as jewelry accessorizes.");
    } finally {
      setIsAIGenningCompare(false);
    }
  };

  return (
    <div id="vendicart-storefront-root" className="font-sans space-y-8">
      {/* 1. Luxurious Promo Hero Canvas */}
      <div className="relative bg-neutral-900 text-white rounded-3xl overflow-hidden shadow-2xl py-12 px-8 md:px-16 flex flex-col md:flex-row items-center justify-between gap-8 max-w-7xl mx-auto my-4 border border-neutral-800">
        <div className="space-y-4 max-w-lg z-10 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-400 rounded-full text-xs font-semibold uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5 animate-bounce" /> Certified Multi-Vendor Portal
          </span>
          <h1 className="text-3xl md:text-5xl font-bold font-display tracking-tight leading-tight">
            Elevate Daily Life <br />
            With <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">VendiCart Crafts</span>
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm leading-relaxed font-light">
            Discover verified merchant offerings integrated with smart generative pricing, instant returns, and real-time shipping timelines backstopped by VendiCart Co-pilot.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button 
              onClick={() => setSelectedCategory("Electronics")}
              className="bg-white text-neutral-900 rounded-xl px-5 py-2 hover:bg-neutral-100 transition font-semibold text-xs tracking-wide cursor-pointer"
            >
              Explore Tech
            </button>
            <button 
              onClick={() => handleToggleCompareSelection(products[0])}
              className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 px-5 py-2 rounded-xl text-white font-medium text-xs tracking-wide flex items-center gap-1.5 cursor-pointer"
            >
              <Scale className="w-4 h-4" /> Compare Matrix
            </button>
          </div>
        </div>

        {/* Dynamic visual placeholder on promo */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20 rounded-full animate-pulse filter blur-xl"></div>
          <img 
            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80" 
            alt="VendiCart Tech Feature" 
            className="w-48 h-48 object-contain scale-110 drop-shadow-2xl hover:rotate-6 transition-transform duration-500 rounded-full border border-neutral-800" 
          />
        </div>
      </div>

      {/* 2. Top Smart Category Tags Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-sm tracking-wide font-display text-neutral-900 uppercase">Browse Verified Collections</h4>
          {selectedCategory && (
            <button 
              onClick={() => setSelectedCategory("")}
              className="text-xs text-rose-500 font-bold tracking-wide hover:underline cursor-pointer"
            >
              Clear Category filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((cat, i) => (
            <button
              key={i}
              onClick={() => setSelectedCategory(cat.name)}
              className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all group overflow-hidden relative cursor-pointer ${
                selectedCategory === cat.name 
                  ? "bg-neutral-900 text-white border-neutral-900 shadow-md" 
                  : "bg-white border-neutral-200 hover:border-neutral-800 hover:shadow-md"
              }`}
            >
              <span className="text-xl shrink-0">{cat.tag}</span>
              <div>
                <span className="block text-xs font-semibold tracking-wide font-display">{cat.name}</span>
                <span className="text-[10px] text-neutral-400 group-hover:text-neutral-500">certified</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Products list layout and Filter column */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Filters Box */}
        <div className="lg:col-span-1 bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-6 h-fit">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-600 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filters Sidebar
            </h4>
            <button 
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("");
                setSelectedBrand("");
                setMaxPrice("10000");
                setMinRating("0");
              }}
              className="text-[10px] text-neutral-400 hover:text-neutral-900 hover:underline font-bold uppercase transition"
            >
              Reset All
            </button>
          </div>

          {/* Voice Search Integrated Inputs */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Search Keywords</label>
            <div className="relative bg-neutral-100 border border-neutral-200 rounded-xl flex items-center px-3 group focus-within:border-neutral-900 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Smart Search (try 'under 3000')" 
                className="w-full text-xs bg-transparent p-2.5 outline-none font-medium" 
              />
              <button 
                onClick={handleVoiceSearch}
                type="button"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isListening ? "bg-red-105 text-red-600 animate-pulse" : "text-neutral-400 hover:text-neutral-900"
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Maximum Selling Price (₹)</label>
            <div className="space-y-1 font-mono">
              <input 
                type="range" 
                min="500" 
                max="10000" 
                step="500"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900" 
              />
              <div className="flex justify-between text-[11px] text-neutral-500 font-medium font-mono">
                <span>₹500</span>
                <span className="text-neutral-900 font-bold">₹{maxPrice}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Brand filter</label>
            <select 
              value={selectedBrand} 
              onChange={e => setSelectedBrand(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 p-2 text-xs rounded-xl outline-none focus:bg-white"
            >
              <option value="">All Brands</option>
              <option value="Soniq">Soniq</option>
              <option value="VendiCart">VendiCart</option>
              <option value="Aero">Aero</option>
              <option value="Ankertech">Ankertech</option>
              <option value="ChefCraft">ChefCraft</option>
              <option value="UjiZen">UjiZen</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Customer Rating Criteria</label>
            <div className="grid grid-cols-5 gap-1.5">
              {["0", "3", "4", "4.5", "4.8"].map((val, idx) => (
                <button
                  key={idx}
                  onClick={() => setMinRating(val)}
                  className={`p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                    minRating === val 
                      ? "bg-neutral-900 border-neutral-900 text-white" 
                      : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-800"
                  }`}
                >
                  {val === "0" ? "All" : `${val}★`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Catalog Grid Cards (3 columns) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Active Comparison banner */}
          {compareList.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex items-center justify-between text-xs animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2">
                <span className="font-bold flex items-center gap-1 text-indigo-900">
                  <Scale className="w-4 h-4 text-indigo-500 animate-spin-slow" /> Comparing Products ({compareList.length}/3 selected):
                </span>
                <div className="flex items-center gap-2 font-medium text-neutral-600">
                  {compareList.map((c, i) => (
                    <span key={i} className="bg-white border border-indigo-100 rounded px-2 py-0.5">{c.title.split(" ")[0]}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleRequestAIComparisonMatrix}
                  disabled={compareList.length < 2 || isAIGenningCompare}
                  className="bg-indigo-900 hover:bg-indigo-800 disabled:opacity-40 text-white px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 hover:shadow cursor-pointer"
                >
                  {isAIGenningCompare ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Ask Gemini Comparative Matrix
                </button>
                <button 
                  onClick={() => setCompareList([])}
                  className="text-neutral-400 hover:text-rose-500 font-semibold cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Grid of product components */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-neutral-200 rounded-2xl h-80 animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {products.map((p) => {
                  const finalPrice = Math.round(p.basePrice * (1 - p.discountPct / 100));
                  const isWish = userWishlist.includes(p.id);
                  const isCompareSelected = compareList.some(item => item.id === p.id);

                  return (
                    <div 
                      key={p.id}
                      className="bg-white border border-neutral-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group relative"
                    >
                      {/* Wishlist toggle badge */}
                      <button 
                        onClick={() => onToggleWishlist(p)}
                        className="absolute top-3 right-3 p-2 rounded-full backdrop-blur-md bg-white/70 hover:bg-white text-rose-500 shadow transition-all z-10 cursor-pointer"
                      >
                        <Heart className={`w-4 h-4 ${isWish ? "fill-rose-500" : ""}`} />
                      </button>

                      <div className="relative h-44 overflow-hidden bg-neutral-100 flex items-center justify-center">
                        <img 
                          src={p.images[0]} 
                          alt={p.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-550" 
                        />
                        {p.discountPct > 0 && (
                          <span className="absolute bottom-3 left-3 bg-rose-500 text-white font-bold text-[10px] px-2 py-0.5 rounded">
                            {p.discountPct}% OFF
                          </span>
                        )}
                        <span className="absolute bottom-3 right-3 bg-neutral-900/75 text-white backdrop-blur-sm text-[10px] px-2 py-0.5 rounded font-medium">
                          {p.category}
                        </span>
                      </div>

                      {/* Info blocks */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-neutral-400">
                            <span className="font-medium">{p.brand}</span>
                            <span className="flex items-center gap-0.5 text-amber-500 font-semibold font-mono">
                              ⭐ {p.avgRating} ({p.reviewCount})
                            </span>
                          </div>
                          
                          <h4 
                            onClick={() => onViewProduct(p)}
                            className="font-semibold text-neutral-950 font-display text-sm tracking-tight hover:underline cursor-pointer line-clamp-1"
                          >
                            {p.title}
                          </h4>
                          <p className="text-neutral-500 text-[11px] leading-relaxed line-clamp-2">
                            {p.description}
                          </p>
                        </div>

                        {/* Buy rows */}
                        <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                          <div className="font-mono">
                            <span className="block text-[11px] text-neutral-400 line-through">₹{p.basePrice?.toLocaleString()}</span>
                            <span className="text-sm font-bold text-neutral-900">₹{finalPrice?.toLocaleString()}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleCompareSelection(p)}
                              className={`p-2 rounded-xl transition-all border shrink-0 cursor-pointer ${
                                isCompareSelected 
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                                  : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-800 hover:bg-neutral-50"
                              }`}
                              title="Compare Specification Grid"
                            >
                              <Scale className="w-3.5 h-3.5" />
                            </button>
                            {p.stock > 0 ? (
                              <button 
                                onClick={() => onAddToCart(p, 1)}
                                className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl py-1.5 px-3.5 font-bold text-[11px] tracking-wide transition shadow-sm hover:shadow cursor-pointer"
                              >
                                Add to Cart
                              </button>
                            ) : (
                              <span className="text-[10px] bg-neutral-100 text-neutral-400 font-bold rounded px-2.5 py-1">SOLDOUT</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {products.length === 0 && (
                <div className="text-center py-12 bg-white border border-neutral-200 rounded-2xl shadow-sm text-neutral-400">
                  <Star className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
                  <span className="text-xs">No certified VendiCart products match search query filters.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. DYNAMIC INTERACTIVE MATRIX COMPARISON MODAL */}
      {isComparing && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-neutral-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-xs text-left">
            {/* Modal top */}
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-spin-slow" />
                <h4 className="font-bold font-display tracking-tight text-sm">Gemini AI Complete Comparison Suite</h4>
              </div>
              <button 
                onClick={() => setIsComparing(false)}
                className="text-neutral-400 hover:text-white hover:bg-neutral-800 p-1 rounded-xl transition cursor-pointer"
              >
                Close Portal
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1">
              {isAIGenningCompare ? (
                <div className="text-center py-12 space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  <span className="block text-neutral-500 font-medium">VendiCart AI parsing catalogue specs matrix...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-indigo-950 leading-relaxed text-[12.5px]">
                    <div className="font-bold mb-1">VendiCart Advisor Output:</div>
                    <div className="prose prose-sm prose-neutral max-w-full">
                      <p className="whitespace-pre-line text-[11.5px] leading-relaxed select-text font-mono text-neutral-900">
                        {compareResultMarkdown}
                      </p>
                    </div>
                  </div>

                  {/* Quick specs columns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-neutral-200 pt-4">
                    {compareList.map(item => (
                      <div key={item.id} className="bg-neutral-50 border border-neutral-200 p-4 rounded-2xl space-y-2">
                        <img src={item.images[0]} className="w-12 h-12 object-cover rounded-lg" />
                        <h5 className="font-bold text-neutral-950 font-display truncate">{item.title}</h5>
                        <div className="text-[10px] space-y-1 text-neutral-500">
                          <p>💰 Price: ₹{Math.round(item.basePrice * (1 - item.discountPct/100))}</p>
                          <p>⭐ Rating: {item.avgRating} ({item.reviewCount})</p>
                          <p>🚚 Ship Time: {item.meta.deliveryTimeDays} Days</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 text-right">
              <button 
                onClick={() => setIsComparing(false)}
                className="bg-neutral-900 text-white rounded-xl px-5 py-2 hover:bg-neutral-800 transition font-bold text-xs cursor-pointer"
              >
                Close Comparison Map
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
