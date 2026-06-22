import React, { useState, useEffect } from "react";
import { 
  LineChart, Line, BarChart, Bar, ResponsiveContainer, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from "recharts";
import { 
  IndianRupee, Package, ShoppingBag, AlertTriangle, Sparkles, 
  Plus, Check, Trash2, Eye, Truck, CheckCircle, RefreshCw,
  Users, UserCheck, ShieldAlert, Download, Brain, Send, MessageCircle
} from "lucide-react";
import { Product, Seller, Order } from "../types";

// Unified notification dispatcher helper
const broadcastNotification = (msg: string, type: "success" | "error" | "info" = "success") => {
  // Dispatched as window alert or custom dispatch to ensure optimal reaction
  const event = new CustomEvent("vendicart_toast", { detail: { msg, type } });
  window.dispatchEvent(event);
};

// ---------------------------------------------------------------------------
// 1. SELLER DASHBOARD
// ---------------------------------------------------------------------------
export function SellerDashboard({ onBackToStore }: { onBackToStore: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "inventory" | "newproduct" | "messages">("overview");

  // New Product Hook states
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Electronics");
  const [newBrand, setNewBrand] = useState("");
  const [newCostPrice, setNewCostPrice] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("20");
  const [newDesc, setNewDesc] = useState("");
  const [newKeywords, setNewKeywords] = useState<string[]>([]);
  const [newFeatures, setNewFeatures] = useState<string[]>([]);
  
  // AI Feature running loaders
  const [isAIGenningDesc, setIsAIGenningDesc] = useState(false);
  const [isAIGenningPrice, setIsAIGenningPrice] = useState(false);
  const [pricingReason, setPricingReason] = useState("");
  
  // Seller Messaging State
  const [chatUser, setChatUser] = useState("usr-customer");
  const [chats, setChats] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState("");

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/sellers/dashboard", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("vendicart_token")}` }
      });
      const resData = await res.json();
      if (res.ok) {
        setData(resData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "messages") {
      fetchChats();
    }
  }, [activeTab, chatUser]);

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/messages", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("vendicart_token")}` }
      });
      const chatList = await res.json();
      if (res.ok) {
        setChats(chatList);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("vendicart_token")}`
        },
        body: JSON.stringify({
          receiverId: chatUser,
          text: msgInput
        })
      });

      if (res.ok) {
        setMsgInput("");
        fetchChats();
        
        // Automated simulated instant customer response in 1 second
        setTimeout(async () => {
          await fetch("/api/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer token-usr-customer` // Vikram customer token
            },
            body: JSON.stringify({
              receiverId: data?.shopName ? "usr-seller-1" : "usr-seller-2",
              text: "Fantastic! Thanks for updating me on current stocks."
            })
          });
          fetchChats();
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // AI Description Generator Trigger
  const handleAIGenerateContents = async () => {
    if (!newBrand || !newCategory) {
      broadcastNotification("Brand and Category fields are critical context hooks for AI description parameters.", "error");
      return;
    }
    setIsAIGenningDesc(true);
    try {
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory, brand: newBrand })
      });
      const aiData = await res.json();
      if (res.ok) {
        setNewDesc(aiData.description);
        setNewFeatures(aiData.features);
        setNewKeywords(aiData.seoTags);
        broadcastNotification("VendiCart AI generated high impact description, feature-bullets and meta-tags safely!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAIGenningDesc(false);
    }
  };

  // AI Pricing Tool Trigger
  const handleAIPricingRecommend = async () => {
    const cost = Number(newCostPrice);
    if (!cost || cost <= 0) {
      broadcastNotification("Cost Price is mandatory for pricing markup computations.", "error");
      return;
    }
    setIsAIGenningPrice(true);
    try {
      const res = await fetch("/api/ai/recommend-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costPrice: cost,
          category: newCategory,
          competitorsPrices: [cost * 1.34, cost * 1.45]
        })
      });
      const aiPrice = await res.json();
      if (res.ok) {
        setNewPrice(String(aiPrice.suggestedPrice));
        setPricingReason(aiPrice.reasoning);
        broadcastNotification("AI Pricing model returned ideal markup!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAIGenningPrice(false);
    }
  };

  // Submit product creation
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPrice || !newStock) {
      broadcastNotification("Title, Price and Stock parameters are fully mandatory.", "error");
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("vendicart_token")}`
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc || `${newTitle} by ${newBrand}. Crafted with luxury specification matrices.`,
          category: newCategory,
          brand: newBrand || "VendiCart Craft",
          basePrice: Number(newPrice),
          discountPct: 10, // Default incentive
          stock: Number(newStock),
          meta: {
            deliveryTimeDays: 3,
            warrantyInfo: "12 Months direct replacement",
            returnPolicy: "7 Days free returns",
            seoKeywords: newKeywords
          }
        })
      });

      if (res.ok) {
        broadcastNotification("New Multi-vendor product listed on VendiCart successfully.");
        // reset form
        setNewTitle("");
        setNewBrand("");
        setNewCostPrice("");
        setNewPrice("");
        setNewDesc("");
        setPricingReason("");
        setNewKeywords([]);
        setNewFeatures([]);
        setActiveTab("inventory");
      } else {
        const err = await res.json();
        broadcastNotification(err.error || "Failed product creation", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateDeliveryStage = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/update-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("vendicart_token")}`
        },
        body: JSON.stringify({
          status: nextStatus,
          note: `Logistic dispatch updated by Seller to ${nextStatus}.`
        })
      });
      if (res.ok) {
        broadcastNotification(`Shipment ${orderId} progressed smoothly to ${nextStatus}.`);
        fetchDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-screen">
        <div className="animate-spin-slow h-8 w-8 border-4 border-neutral-900 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (data && !data.isApproved) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-rose-100 rounded-3xl p-8 shadow-xl text-center">
        <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-bounce" />
        <h3 className="text-xl font-bold font-display text-neutral-900">Application Status: Pending</h3>
        <p className="text-neutral-500 text-sm mt-3 leading-relaxed">
          Your VendiCart Merchant / Vendor registration was submitted successfully but is currently waiting for system administrator verification under VendiCart's Multi-vendor standard compliance rules.
        </p>
        <div className="bg-neutral-50 rounded-xl p-4 mt-6 text-xs text-neutral-400 space-y-2">
          <p>📧 Support contact: compliance@vendicart.com</p>
          <p>Demo Tip: Access the Admin profile <b>(admin@demo.com)</b> to instantly approve this storefront seller account!</p>
        </div>
        <button
          onClick={onBackToStore}
          className="mt-8 bg-neutral-900 text-white rounded-xl px-6 py-2.5 hover:bg-neutral-800 transition-all font-medium text-sm cursor-pointer"
        >
          Return to Storefront
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Dashboard Top Header bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-950 tracking-tight flex items-center gap-2">
            Storefront Manager: <span className="text-neutral-700 font-medium">{data?.shopName}</span>
          </h2>
          <p className="text-[13px] text-neutral-500 mt-0.5">Control listing stock catalogs, review orders, and deploy AI prices.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onBackToStore}
            className="px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-50 hover:border-neutral-800 text-xs font-medium transition-all cursor-pointer"
          >
            Storefront Portal
          </button>
          <button 
            onClick={() => setActiveTab("newproduct")}
            className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl px-4 py-2 hover:shadow-lg transition-all text-xs font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Primary Dashboard layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-1 bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm h-fit">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-medium transition-all cursor-pointer ${
              activeTab === "overview" ? "bg-neutral-900 text-white shadow-md" : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Operations Overview
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-medium transition-all cursor-pointer ${
              activeTab === "inventory" ? "bg-neutral-900 text-white shadow-md" : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <Package className="w-4 h-4" /> Listing Inventory ({data?.kpis?.itemsCount || 0})
          </button>
          <button
            onClick={() => setActiveTab("newproduct")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-medium transition-all cursor-pointer ${
              activeTab === "newproduct" ? "bg-neutral-900 text-white shadow-md" : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-500" /> AI Product Console
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-medium transition-all cursor-pointer ${
              activeTab === "messages" ? "bg-neutral-900 text-white shadow-md" : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <MessageCircle className="w-4 h-4" /> Customer Live Chat
          </button>
        </div>

        {/* Dynamic Panel */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start text-neutral-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Total Revenue</span>
                    <IndianRupee className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold font-display mt-2 text-neutral-950">₹{data?.kpis?.totalSellsValue?.toLocaleString()}</h3>
                  <div className="text-[11px] text-emerald-600 mt-1">★ 10% platform tax accounted</div>
                </div>

                <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start text-neutral-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Orders Gained</span>
                    <ShoppingBag className="w-5 h-5 text-neutral-600" />
                  </div>
                  <h3 className="text-xl font-bold font-display mt-2 text-neutral-950">{data?.kpis?.ordersVolume} Orders</h3>
                  <div className="text-[11px] text-neutral-500 mt-1">From loyal customer streams</div>
                </div>

                <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start text-neutral-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Active Listings</span>
                    <Package className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold font-display mt-2 text-neutral-950">{data?.kpis?.itemsCount} Items</h3>
                  <div className="text-[11px] text-emerald-500 mt-1">Multi-variant configured</div>
                </div>

                <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start text-neutral-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Critical Inventory</span>
                    <AlertTriangle className={`w-5 h-5 ${data?.kpis?.lowStockItems > 0 ? "text-amber-500 animate-pulse" : "text-neutral-300"}`} />
                  </div>
                  <h3 className="text-xl font-bold font-display mt-2 text-neutral-950">{data?.kpis?.lowStockItems} Items</h3>
                  <span className="text-[11px] text-amber-500 font-medium font-sans">Require restock alerts</span>
                </div>
              </div>

              {/* Chart Visual Panels */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
                <h4 className="font-semibold text-sm tracking-wide font-display text-neutral-900 mb-4">Calculated Weekly Sales Trends (₹)</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data?.salesTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                      <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                      <YAxis stroke="#888888" fontSize={11} />
                      <Tooltip formatter={(value: any) => [`₹${value}`, "Sales"]} />
                      <Line type="monotone" dataKey="sales" stroke="#000" strokeWidth={2.5} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Active Orders */}
              <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50/50">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-600">Pending Order Requests Timeline</h4>
                  <span className="bg-neutral-900 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Logistics</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-500 uppercase font-medium">
                        <th className="p-4">Item details</th>
                        <th className="p-4">Total Gained</th>
                        <th className="p-4">Current Milestone</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {data?.recentOrders?.map((ord: any) => (
                        <tr key={ord.id} className="hover:bg-neutral-50/50">
                          <td className="p-4 font-medium text-neutral-900">
                            <span className="block text-neutral-400 text-[10px] font-mono">#{ord.id}</span>
                            {ord.title} x{ord.qty}
                          </td>
                          <td className="p-4 font-semibold">₹{ord.amount}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ord.status === "Placed" ? "bg-amber-100 text-amber-800" :
                              ord.status === "Confirmed" ? "bg-blue-100 text-blue-800" :
                              ord.status === "Shipped" ? "bg-indigo-100 text-indigo-800" :
                              "bg-emerald-100 text-emerald-800"
                            }`}>{ord.status}</span>
                          </td>
                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            {ord.status === "Placed" && (
                              <button 
                                onClick={() => handleUpdateDeliveryStage(ord.id, "Confirmed")}
                                className="bg-blue-600 text-white rounded-lg px-2.5 py-1 text-[11px] font-medium hover:bg-blue-700 transition cursor-pointer"
                              >
                                Accept & Confirm
                              </button>
                            )}
                            {ord.status === "Confirmed" && (
                              <button 
                                onClick={() => handleUpdateDeliveryStage(ord.id, "Shipped")}
                                className="bg-indigo-600 text-white rounded-lg px-2.5 py-1 text-[11px] font-medium hover:bg-indigo-700 transition cursor-pointer"
                              >
                                Dispatch/Ship
                              </button>
                            )}
                            {ord.status === "Shipped" && (
                              <button 
                                onClick={() => handleUpdateDeliveryStage(ord.id, "Delivered")}
                                className="bg-emerald-600 text-white rounded-lg px-2.5 py-1 text-[11px] font-medium hover:bg-emerald-700 transition cursor-pointer"
                              >
                                Handshake Delivered
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(!data?.recentOrders || data.recentOrders.length === 0) && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-neutral-400">Order streams vacant currently.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY LISTING */}
          {activeTab === "inventory" && (
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-600">Active Catalogue Stocks</h4>
              </div>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-400 font-medium uppercase">
                      <th className="p-4">Product ID</th>
                      <th className="p-4">Item parameters</th>
                      <th className="p-4">Base price</th>
                      <th className="p-4">Stock remaining</th>
                      <th className="p-4 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-neutral-700">
                    {data?.inventorySummary?.map((prod: any) => (
                      <tr key={prod.id} className="hover:bg-neutral-50/50">
                        <td className="p-4 font-mono text-[10px] text-neutral-400">#{prod.id}</td>
                        <td className="p-4 font-semibold text-neutral-900">{prod.title}</td>
                        <td className="p-4">₹{prod.price?.toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`font-semibold ${prod.stock <= 5 ? "text-amber-600" : "text-neutral-900"}`}>
                            {prod.stock} units
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={async () => {
                              if(confirm("Confirm removal of listing? ")) {
                                await fetch(`/api/products/${prod.id}`, {
                                  method: "DELETE",
                                  headers: { "Authorization": `Bearer ${localStorage.getItem("vendicart_token")}` }
                                });
                                fetchDashboard();
                              }
                            }}
                            className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 ml-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: NEW INTERACTIVE AI PRODUCT CATALOGUE Console */}
          {activeTab === "newproduct" && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="border-b border-neutral-200 pb-4 flex justify-between items-center">
                <div>
                  <h4 className="font-bold font-display tracking-tight text-neutral-950">AI Multivendor Product Console</h4>
                  <p className="text-[11px] text-neutral-400">Enter simple specs and invoke Gemini keying engines for descriptions and smart pricing recommendations.</p>
                </div>
                <Brain className="w-6 h-6 text-emerald-500 animate-pulse" />
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase text-neutral-500">Brand Name</label>
                    <input 
                      type="text" 
                      value={newBrand} 
                      onChange={e => setNewBrand(e.target.value)}
                      placeholder="e.g. Soniq, VendiCart, Ankertech"
                      className="w-full bg-neutral-50 border border-neutral-200 p-2 text-xs rounded-xl outline-none focus:bg-white" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase text-neutral-500">Category Tag</label>
                    <select 
                      value={newCategory} 
                      onChange={e => setNewCategory(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 p-2 text-xs rounded-xl outline-none focus:bg-white"
                    >
                      <option>Electronics</option>
                      <option>Fashion</option>
                      <option>Home & Living</option>
                      <option>Grocery & Organic</option>
                      <option>Sports & Outdoors</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold uppercase text-neutral-500">Product Title</label>
                    <button
                      type="button"
                      onClick={handleAIGenerateContents}
                      disabled={isAIGenningDesc || !newBrand}
                      className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-500 disabled:opacity-40 font-bold tracking-wide border border-emerald-200/50 bg-emerald-50 px-2.5 py-1 rounded-full hover:shadow-sm cursor-pointer"
                    >
                      {isAIGenningDesc ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Generate AI Description (Gemini Co-pilot)
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={newTitle} 
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. HydroPure Smart Insulated Bottle" 
                    className="w-full bg-neutral-50 border border-neutral-200 p-2.5 text-xs rounded-xl outline-none focus:bg-white focus:border-neutral-900" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase text-neutral-500">Merchant Cost Price (₹)</label>
                    <input 
                      type="number" 
                      value={newCostPrice} 
                      onChange={e => setNewCostPrice(e.target.value)}
                      placeholder="e.g. 500" 
                      className="w-full bg-neutral-50 border border-neutral-200 p-2 text-xs rounded-xl outline-none focus:bg-white" 
                    />
                  </div>

                  <div className="space-y-1 font-mono">
                    <div className="flex justify-between items-center">
                      <label className="block text-[11px] font-bold uppercase text-neutral-500 font-sans font-medium">Selling price (₹)</label>
                      <button
                        type="button"
                        onClick={handleAIPricingRecommend}
                        disabled={isAIGenningPrice || !newCostPrice}
                        className="text-[10px] text-indigo-600 hover:text-indigo-500 border border-indigo-100 bg-indigo-50 px-2 rounded-full font-bold cursor-pointer"
                      >
                        Suggest Price
                      </button>
                    </div>
                    <input 
                      type="number" 
                      value={newPrice} 
                      onChange={e => setNewPrice(e.target.value)}
                      placeholder="Suggested: ₹599" 
                      className="w-full bg-neutral-50 border border-neutral-200 p-2 text-xs rounded-xl outline-none font-bold font-mono" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase text-neutral-500">Initial Stock</label>
                    <input 
                      type="number" 
                      value={newStock} 
                      onChange={e => setNewStock(e.target.value)}
                      placeholder="20" 
                      className="w-full bg-neutral-50 border border-neutral-200 p-2 text-xs rounded-xl" 
                    />
                  </div>
                </div>

                {/* AI Pricing Advice Reasoning log box */}
                {pricingReason && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-[11.5px] leading-relaxed text-indigo-950 flex gap-2">
                    <Brain className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">VendiCart AI Price Insight:</span> {pricingReason}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-neutral-500">Detailed Description</label>
                  <textarea 
                    rows={4}
                    value={newDesc} 
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Provide pristine descriptive context about product properties..."
                    className="w-full bg-neutral-50 border border-neutral-200 p-3 text-xs rounded-xl outline-none focus:bg-white focus:border-neutral-900"
                  />
                </div>

                {/* Generated Features & SEO tags */}
                {newFeatures.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 p-4 border border-neutral-200 rounded-2xl">
                    <div className="space-y-1">
                      <span className="font-bold text-[10px] uppercase text-neutral-500">Vetted Bullet Features:</span>
                      <ul className="list-disc pl-4 space-y-1 text-neutral-600 text-[11.5px]">
                        {newFeatures.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-[10px] uppercase text-neutral-500">Calculated SEO Keyword Logs:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {newKeywords.map((tag, i) => (
                          <span key={i} className="bg-neutral-900 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold p-3 rounded-xl tracking-wide uppercase transition-all shadow-md active:scale-[0.99] cursor-pointer"
                >
                  Publish and Display Listed Item
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: SELLER CUSTOMER CHAT TRANSCRIPTS */}
          {activeTab === "messages" && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col h-[500px]">
              <div className="border-b border-neutral-200 pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 font-display">Merchant Direct Support Room</h4>
                  <p className="text-[10px] text-neutral-400">Respond directly to active client inquiries representing Vikram Sharma.</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Active session
                </span>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-[12px]">
                {chats.map((m, idx) => (
                  <div key={idx} className={`max-w-[80%] p-2.5 rounded-xl ${
                    m.senderId === "usr-customer" 
                      ? "bg-white text-neutral-800 mr-auto shadow-sm rounded-tl-none" 
                      : "bg-neutral-900 text-white ml-auto shadow-sm rounded-tr-none"
                  }`}>
                    {m.text}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  placeholder="Type response back to Vikram..."
                  className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-xs outline-none focus:bg-white focus:border-neutral-900"
                />
                <button
                  type="submit"
                  className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl p-2.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. ADMIN DASHBOARD
// ---------------------------------------------------------------------------
export function AdminDashboard({ onBackToStore }: { onBackToStore: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [curView, setCurView] = useState<"overview" | "users" | "vendors">("overview");

  const fetchAdminDash = async () => {
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("vendicart_token")}` }
      });
      const dashData = await res.json();
      if (res.ok) {
        setData(dashData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDash();
  }, [curView]);

  const handleApproveSeller = async (sellerId: string, approveStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/approve-seller", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("vendicart_token")}`
        },
        body: JSON.stringify({ sellerId, approve: approveStatus })
      });
      if (res.ok) {
        broadcastNotification(approveStatus ? "Vendor credential approved. Listing channels active!" : "Merchant credentials declined.");
        fetchAdminDash();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-screen">
        <div className="animate-spin-slow h-8 w-8 border-4 border-neutral-900 border-t-transparent rounded-full font-mono"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-neutral-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold font-display text-neutral-950 flex items-center gap-2">
            VendiCart System Administration <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5 rounded font-display tracking-wider font-semibold">Security Level</span>
          </h2>
          <p className="text-[12.5px] mt-0.5 text-neutral-500">Approve multi-vendor credentials, manage general client ledgers, and download reports.</p>
        </div>
        <button 
          onClick={onBackToStore}
          className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:shadow cursor-pointer"
        >
          Return storefront
        </button>
      </div>

      {/* KPI statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 text-neutral-700">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Users</span>
          <h3 className="text-2xl font-bold font-display mt-1 text-neutral-950">{data?.kpis?.totalUsers}</h3>
          <span className="text-[9.5px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5"><Users className="w-3" /> Fully verified</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Sellers</span>
          <h3 className="text-2xl font-bold font-display mt-1 text-neutral-950">{data?.kpis?.totalSellers}</h3>
          <span className="text-[9.5px] text-indigo-500 font-semibold flex items-center gap-0.5 mt-0.5"><UserCheck className="w-3" /> Approved merchants</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Orders</span>
          <h3 className="text-2xl font-bold font-display mt-1 text-neutral-950">{data?.kpis?.totalOrders}</h3>
          <span className="text-[9.5px] text-neutral-500 font-semibold mt-0.5 block">Dispatched globally</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">System Gross Revenue</span>
          <h3 className="text-2xl font-bold font-display mt-1 text-neutral-950">₹{data?.kpis?.totalRevenue?.toLocaleString()}</h3>
          <span className="text-[9.5px] text-emerald-500 font-semibold mt-0.5 block">Net earnings margin: 10%</span>
        </div>
        <div className="bg-emerald-950 border border-emerald-950 text-emerald-100 rounded-2xl p-5 shadow-sm bg-emerald-900 border-emerald-950 text-emerald-100">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Pending Approvals</span>
          <h3 className="text-2xl font-bold font-display mt-1 text-white">{data?.kpis?.pendingApprovalsCount} queue</h3>
          <span className="text-[9.5px] text-emerald-200 font-semibold mt-0.5 block animate-pulse">Awaiting manual gate approval</span>
        </div>
      </div>

      {/* Admin tabs */}
      <div className="flex border-b border-neutral-200 gap-4 mb-6">
        <button 
          onClick={() => setCurView("overview")}
          className={`pb-2.5 font-display text-xs font-semibold tracking-wide border-b-2 cursor-pointer ${
            curView === "overview" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400"
          }`}
        >
          General Analytics
        </button>
        <button 
          onClick={() => setCurView("vendors")}
          className={`pb-2.5 font-display text-xs font-semibold tracking-wide border-b-2 cursor-pointer ${
            curView === "vendors" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400"
          }`}
        >
          Merchant Approvals Queue ({data?.kpis?.pendingApprovalsCount})
        </button>
        <button 
          onClick={() => setCurView("users")}
          className={`pb-2.5 font-display text-xs font-semibold tracking-wide border-b-2 cursor-pointer ${
            curView === "users" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400"
          }`}
        >
          Master Client Ledger
        </button>
      </div>

      {/* Admin tab Panels */}

      {/* OVERVIEW PANEL */}
      {curView === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart metrics */}
          <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-neutral-900 font-display">System Platform-Wide Earn trends (₹)</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.revenueTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                  <XAxis dataKey="month" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip formatter={(v) => [`₹${v}`, "Revenue"]} />
                  <Bar dataKey="sales" fill="#111827" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-1 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
                <Brain className="w-5 h-5 text-indigo-500 animate-pulse" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-600">VendiCart AI Insights Panel</h4>
              </div>
              <p className="text-xs leading-relaxed text-neutral-500">
                AI predicts massive volume spikes on <b>Premium Soniq Active Anc Headphones</b> and <b>Organic Ceremonial Matcha</b> during upcoming festive seasons (Confidence score: <b>0.92</b>). Ideal inventory buffer: 45%.
              </p>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] text-indigo-900 flex gap-1.5 items-start">
                <ShieldAlert className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span><b>Compliance Audit:</b> Flagged 0 suspicious large transfer sessions globally today. Channels operating green.</span>
              </div>
            </div>

            <button 
              onClick={() => {
                broadcastNotification("Downloading encrypted master platform log reports (PDF).");
              }}
              className="flex items-center justify-center gap-1.5 mt-6 w-full p-2.5 bg-neutral-900 border hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Analytical PDF Report
            </button>
          </div>
        </div>
      )}

      {/* VENDORS QUEUE */}
      {curView === "vendors" && (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden text-xs">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
            <h4 className="font-semibold text-neutral-700">Awaiting Business Verification Approvals</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-400 font-medium uppercase text-[10px]">
                  <th className="p-4">Store shop name</th>
                  <th className="p-4">Merchant Description</th>
                  <th className="p-4 text-center">License Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {data?.pendingSellers?.map((sel: any) => (
                  <tr key={sel.id} className="hover:bg-neutral-50/50">
                    <td className="p-4 font-semibold text-neutral-900">{sel.shopName}</td>
                    <td className="p-4 text-neutral-500 max-w-sm shrink-0 leading-relaxed">{sel.description}</td>
                    <td className="p-4 text-center space-x-2">
                      <button 
                        onClick={() => handleApproveSeller(sel.id, true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-1 font-semibold text-[10px] cursor-pointer"
                      >
                        Approve License
                      </button>
                      <button 
                        onClick={() => handleApproveSeller(sel.id, false)}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-800 rounded px-3 py-1 font-semibold text-[10px] cursor-pointer"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
                {(!data?.pendingSellers || data.pendingSellers.length === 0) && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-neutral-400">Merchant registration approval queue is currently completely clear.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MASTER USERS LEDGER */}
      {curView === "users" && (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden text-xs">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
            <h4 className="font-semibold text-neutral-700">System Platform master listings</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-400 font-medium uppercase text-[10px]">
                  <th className="p-4">User ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4 text-right">Wallet Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {data?.masterUsers?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-neutral-50/50">
                    <td className="p-4 font-mono text-[9px] text-neutral-400">#{u.id}</td>
                    <td className="p-4 font-semibold text-neutral-950">{u.name}</td>
                    <td className="p-4 text-neutral-600">{u.email}</td>
                    <td className="p-4">
                      <span className={`font-bold px-2 py-0.5 rounded text-[9px] uppercase ${
                        u.role === "admin" ? "bg-red-100 text-red-800" :
                        u.role === "seller" ? "bg-indigo-100 text-indigo-800" :
                        "bg-neutral-100 text-neutral-800"
                      }`}>{u.role}</span>
                    </td>
                    <td className="p-4 text-right font-medium text-neutral-900">₹{u.balance?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
