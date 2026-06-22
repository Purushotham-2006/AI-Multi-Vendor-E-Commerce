import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, Star, Heart, User, Bell, LogIn, LogOut, 
  ChevronRight, ArrowLeft, RotateCw, Sparkles, Plus, Loader2,
  Trash2, MapPin, CreditCard, ShieldCheck, Mail, Lock, 
  MapIcon, Truck, CheckCircle, RefreshCw, Smartphone, List, Gift,
  QrCode, FileText, CheckCircle2, MessageCircle, ShoppingCart
} from "lucide-react";
import Storefront from "./components/Storefront";
import { SellerDashboard, AdminDashboard } from "./components/SellersAdminDashboards";
import AIChatWidget from "./components/AIChatWidget";
import { Product, User as UserType, Address, CartItem, Order, Notification, WalletTransaction } from "./types";

interface ToastMsg {
  id: string;
  msg: string;
  type: "success" | "error" | "info";
}

export default function App() {
  // Global Auth / Session state
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [currentSeller, setCurrentSeller] = useState<any | null>(null);
  const [userToken, setUserToken] = useState<string | null>(localStorage.getItem("vendicart_token"));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // App routing views
  // "store" | "product-detail" | "cart-checkout" | "my-orders" | "messages" | "seller-dash" | "admin-dash"
  const [currentView, setCurrentView] = useState<"store" | "product-detail" | "cart-checkout" | "my-orders">("store");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // App reactive registries
  const [productsCache, setProductsCache] = useState<Product[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [wallet, setWallet] = useState<{ balance: number; transactions: WalletTransaction[] }>({ balance: 0, transactions: [] });
  
  // Detail page state
  const [detailRotateAngle, setDetailRotateAngle] = useState(0); // 360 rotation simulator
  const [aiReviewSummary, setAiReviewSummary] = useState("");
  const [isSummarizingReviews, setIsSummarizingReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitReviewLoading, setSubmitReviewLoading] = useState(false);

  // Checkout page state
  const [checkpointStep, setCheckpointStep] = useState<"cart" | "address" | "payment" | "invoice">("cart");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState("");
  const [giftWrap, setGiftWrap] = useState(false);
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"COD" | "STRIPE" | "RAZORPAY">("COD");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState("");

  // UI components toggles
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [walletAutoloadAmt, setWalletAutoloadAmt] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({ label: "Home", line1: "", city: "", state: "", pincode: "" });

  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Direct custom toaster dispatch hooks
  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4505);
  };

  useEffect(() => {
    // Listen for custom toasts triggers from nested components
    const handleCustomToast = (e: any) => {
      showToast(e.detail.msg, e.detail.type);
    };
    window.addEventListener("vendicart_toast", handleCustomToast);
    return () => window.removeEventListener("vendicart_toast", handleCustomToast);
  }, []);

  const fetchCurrentUser = async (token: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setCurrentSeller(data.seller);
        fetchClientData(token);
      } else {
        // Token stale
        localStorage.removeItem("vendicart_token");
        setUserToken(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClientData = async (token: string) => {
    const fetchHeaders = { "Authorization": `Bearer ${token}` };
    try {
      // Parallelize safe fetches
      const [cartRes, addrRes, notifRes, walletRes, wishRes, ordersRes] = await Promise.all([
        fetch("/api/cart", { headers: fetchHeaders }),
        fetch("/api/users/addresses", { headers: fetchHeaders }),
        fetch("/api/notifications", { headers: fetchHeaders }),
        fetch("/api/wallet/balance", { headers: fetchHeaders }),
        fetch("/api/wishlist", { headers: fetchHeaders }),
        fetch("/api/orders", { headers: fetchHeaders })
      ]);

      if (cartRes.ok) setCart(await cartRes.json());
      if (addrRes.ok) {
        const addrs = await addrRes.json();
        setAddresses(addrs);
        const def = addrs.find((a: any) => a.isDefault);
        if (def) setSelectedAddressId(def.id);
      }
      if (notifRes.ok) setNotifications(await notifRes.json());
      if (walletRes.ok) setWallet(await walletRes.json());
      if (wishRes.ok) {
        const items = await wishRes.json();
        setWishlist(items.map((i: any) => i.productId));
      }
      if (ordersRes.ok) setOrders(await ordersRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (userToken) {
      fetchCurrentUser(userToken);
    }
  }, [userToken]);

  const handleDemoLogin = async (role: "CUSTOMER" | "SELLER" | "ADMIN") => {
    setAuthLoading(true);
    let email = "customer@demo.com";
    if (role === "SELLER") email = "seller@demo.com";
    if (role === "ADMIN") email = "admin@demo.com";

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "Demo@1234" })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("vendicart_token", data.token);
        setUserToken(data.token);
        setCurrentUser(data.user);
        setCurrentSeller(data.seller);
        setShowAuthModal(false);
        showToast(`Logged in successfully as VendiCart ${role}!`);
      } else {
        showToast(data.error || "Login failed", "error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      showToast("All credentials locks are required.", "error");
      return;
    }
    setAuthLoading(true);

    const url = isRegister ? "/api/auth/register" : "/api/auth/login";
    const body = isRegister 
      ? { name: authName, email: authEmail, password: authPassword, role: "CUSTOMER" }
      : { email: authEmail, password: authPassword };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("vendicart_token", data.token);
        setUserToken(data.token);
        setCurrentUser(data.user);
        setCurrentSeller(data.seller);
        setShowAuthModal(false);
        setAuthName("");
        setAuthEmail("");
        setAuthPassword("");
        showToast(`Verification success. Session secured!`);
      } else {
        showToast(data.error || "Authentication gate error.", "error");
      }
    } catch (err) {
       console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (userToken) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${userToken}` }
      });
    }
    localStorage.removeItem("vendicart_token");
    setUserToken(null);
    setCurrentUser(null);
    setCurrentSeller(null);
    setCart([]);
    setAddresses([]);
    setOrders([]);
    setWishlist([]);
    setCurrentView("store");
    showToast("Session disconnected securely.");
  };

  // Cart Operations
  const handleAddToCart = async (p: Product, qty: number) => {
    if (!currentUser) {
      setShowAuthModal(true);
      showToast("Access required: Please authenticate to allocate items to cart.", "info");
      return;
    }

    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ productId: p.id, quantity: qty })
      });
      if (res.ok) {
        showToast(`Added ${p.title} x${qty} to cart!`);
        fetchClientData(userToken!);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCartQty = async (itemId: string, newQty: number) => {
    try {
      const res = await fetch("/api/cart/update-qty", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ cartItemId: itemId, quantity: newQty })
      });
      if (res.ok) {
        fetchClientData(userToken!);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveCartItem = async (itemId: string) => {
    try {
      const res = await fetch("/api/cart/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ cartItemId: itemId })
      });
      if (res.ok) {
        showToast("Cart item removed.");
        fetchClientData(userToken!);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Wishlist Action Toggle
  const handleToggleWishlist = async (p: Product) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await fetch("/api/wishlist/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ productId: p.id })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.action === "added") {
          showToast(`Wishlisted: ${p.title}!`);
        } else {
          showToast("Removed from wishlist.");
        }
        fetchClientData(userToken!);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Product Reviews
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !reviewText.trim()) return;

    setSubmitReviewLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          rating: reviewRating,
          text: reviewText
        })
      });

      if (res.ok) {
        showToast("VendiCart customer review published successfully!");
        setReviewText("");
        // Reload details
        const detRes = await fetch(`/api/products/${selectedProduct.id}`);
        const detData = await detRes.json();
        if (detRes.ok) {
          setSelectedProduct(detData.product);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitReviewLoading(false);
    }
  };

  // AI Review summaries
  const handleAIReviewsSummaryRequest = async () => {
    if (!selectedProduct) return;
    setIsSummarizingReviews(true);
    setAiReviewSummary("");
    try {
      const res = await fetch("/api/ai/summarize-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct.id })
      });
      const data = await res.json();
      if (res.ok) {
        setAiReviewSummary(data.summary);
        showToast("Gemini summarized active customer review consensus.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummarizingReviews(false);
    }
  };

  // Coupon validator
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    try {
      const res = await fetch("/api/cart/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, cartTotal: getCartTotal() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppliedCoupon(data.coupon);
        showToast(`Promo applied code successfully! Discount value allocated: ₹${data.coupon.value}`);
      } else {
        setCouponError(data.error || "Coupon verification check failed.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getCartTotal = () => {
    return cart
      .filter(item => !item.savedForLater && item.product)
      .reduce((sum, item) => {
        const finalPrice = Math.round(item.product!.basePrice * (1 - item.product!.discountPct / 100));
        return sum + finalPrice * item.quantity;
      }, 0);
  };

  const getSubtotalWithOffers = () => {
    const base = getCartTotal();
    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.type === "FLAT") discount = appliedCoupon.value;
      if (appliedCoupon.type === "PERCENT") discount = Math.round(base * (appliedCoupon.value / 100));
    }
    const wrap = giftWrap ? 50 : 0;
    let computed = base - discount + wrap;
    return computed < 0 ? 0 : computed;
  };

  // Address create
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressForm.line1 || !newAddressForm.city || !newAddressForm.pincode) return;

    try {
      const res = await fetch("/api/users/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify(newAddressForm)
      });
      if (res.ok) {
        showToast("New destination delivery addresses mapped.");
        setNewAddressForm({ label: "Home", line1: "", city: "", state: "", pincode: "" });
        fetchClientData(userToken!);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Autoload deposit wallet
  const handleAutoloadWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(walletAutoloadAmt);
    if (!amt || amt <= 0) return;
    setWalletLoading(true);

    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ amount: amt, description: "UPI Direct Ledger Deposit" })
      });
      if (res.ok) {
        showToast(`Autoload success: ₹${amt} credited safely!`);
        setWalletAutoloadAmt("");
        fetchClientData(userToken!);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWalletLoading(false);
    }
  };

  // Complete Order Dispatch Checks
  const handleCheckoutSubmit = async () => {
    if (!selectedAddressId) {
      showToast("Delivery address validation is required.", "error");
      return;
    }
    setCheckoutLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          items: cart.filter(c => !c.savedForLater),
          addressId: selectedAddressId,
          paymentMethod: selectedPaymentMethod,
          couponCode: appliedCoupon?.code,
          giftWrap,
          useWallet: useWalletBalance
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGeneratedOrderId(data.orderId);
        setCheckpointStep("invoice");
        showToast("Sells ledger reconciled seamlessly! Opening invoice sheet.");
        fetchClientData(userToken!);
      } else {
        showToast(data.error || "Order dispatch rejected by VendiCart clearance.", "error");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Timeline Logistic Map simulation notes
  const getSimulatedMilestonesIndex = (status: string) => {
    const arr = ["Placed", "Confirmed", "Packed", "Shipped", "Delivered"];
    return arr.indexOf(status);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-neutral-800 flex flex-col font-sans selection:bg-neutral-900 selection:text-white antialiased">
      
      {/* Dynamic Flash Toaster Banners */}
      <div className="fixed top-5 right-5 z-55 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto ${
              t.type === "error" ? "bg-rose-500 border-rose-600 text-white" :
              t.type === "info" ? "bg-indigo-600 border-indigo-700 text-white" :
              "bg-neutral-950 border-neutral-900 text-white"
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* GLOBAL NAVBAR COMPONENT */}
      <nav id="vendicart-global-navbar" className="bg-white/85 backdrop-blur-md sticky top-0 border-b border-neutral-200 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div 
            onClick={() => { setCurrentView("store"); setSelectedProduct(null); }}
            className="flex items-center gap-2 cursor-pointer transition select-none"
          >
            <div className="bg-neutral-950 text-white p-2 rounded-xl">
              <ShoppingBag className="w-5 h-5 animate-spin-slow text-emerald-400" />
            </div>
            <span className="text-xl font-bold font-display tracking-tight text-neutral-950">VENDICART</span>
          </div>

          {/* Quick Nav elements */}
          <div className="flex items-center gap-4 text-neutral-700">
            {currentUser ? (
              <div className="flex items-center gap-4">
                
                {/* Role badges to slide into dashboards */}
                {currentUser.role === "SELLER" && (
                  <button 
                    onClick={() => setCurrentView("store")} 
                    className="hidden md:block text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                  >
                    Merchant Central
                  </button>
                )}
                
                {currentUser.role === "ADMIN" && (
                  <button 
                    onClick={() => setCurrentView("store")} 
                    className="hidden md:block text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    System Control
                  </button>
                )}

                {/* Direct Dashboard switch triggers */}
                {currentUser.role === "SELLER" && (
                  <button 
                    onClick={() => { setCurrentView("store"); setSelectedProduct(null); setTimeout(() => showToast("Seller session isolated. Controls loaded."), 100); }}
                    className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase font-mono tracking-wider cursor-pointer"
                  >
                    Seller Console
                  </button>
                )}

                {currentUser.role === "ADMIN" && (
                  <button 
                    onClick={() => { setCurrentView("store"); setSelectedProduct(null); setTimeout(() => showToast("Admin secure mode."), 100); }}
                    className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase font-mono tracking-wider cursor-pointer"
                  >
                    Admin Console
                  </button>
                )}

                {/* Notifications Bell */}
                <div className="relative">
                  <button 
                    onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                    className="p-2 rounded-full hover:bg-neutral-100 transition relative cursor-pointer text-neutral-600"
                  >
                    <Bell className="w-4 h-4" />
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white"></span>
                    )}
                  </button>

                  {/* Dropdown panel */}
                  {showNotificationsDropdown && (
                    <div className="absolute right-0 mt-3 w-80 bg-white border border-neutral-200 rounded-2xl shadow-xl p-4 space-y-3 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                        <span className="font-bold text-neutral-900 font-display">Simulated Notifications</span>
                        <button 
                          onClick={async () => {
                            await fetch("/api/notifications/mark-read", { method: "POST", headers: { "Authorization": `Bearer ${userToken}` } });
                            fetchClientData(userToken!);
                            setShowNotificationsDropdown(false);
                          }}
                          className="text-[10px] text-emerald-600 font-semibold hover:underline"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2.5">
                        {notifications.map(n => (
                          <div key={n.id} className={`p-2 rounded-xl transition ${n.isRead ? "bg-white" : "bg-neutral-50 border border-neutral-100"}`}>
                            <p className="text-[11px] leading-relaxed text-neutral-700">{n.message}</p>
                            <span className="text-[9px] text-neutral-400 mt-1 block">{new Date(n.createdAt).toLocaleTimeString()}</span>
                          </div>
                        ))}
                        {notifications.length === 0 && (
                          <div className="text-center py-6 text-neutral-400 text-[10.5px]">No notification alerts reported.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Cart icons */}
                <button 
                  onClick={() => { setCurrentView("cart-checkout"); setCheckpointStep("cart"); }}
                  className="bg-neutral-900 py-1.5 px-3.5 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold font-mono tracking-tight flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <ShoppingCart className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cart ({cart.filter(item => !item.savedForLater).reduce((acc, c) => acc + c.quantity, 0)})</span>
                </button>

                {/* Active user Profile link */}
                <div 
                  onClick={() => setShowProfileDrawer(true)}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    className="w-8 h-8 rounded-full border border-neutral-200 shadow-sm group-hover:border-neutral-900 transition shrink-0" 
                  />
                  <div className="hidden md:block text-left text-[11px]">
                    <span className="block font-bold text-neutral-900 group-hover:underline">{currentUser.name.split(" ")[0]}</span>
                    <span className="text-neutral-400 block tracking-tight uppercase font-mono font-bold text-[9px]">{currentUser.role}</span>
                  </div>
                </div>

              </div>
            ) : (
              <button
                onClick={() => { setIsRegister(false); setShowAuthModal(true); }}
                className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold px-4 py-2 hover:shadow transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-emerald-400" /> Member Sign-in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* SELLER & ADMIN ROUTE REDIRECTOR GATE */}
      {currentUser && currentView === "store" && currentUser.role === "SELLER" && (
        <div className="bg-neutral-900/5 py-1">
          <SellerDashboard onBackToStore={() => setCurrentView("store")} />
        </div>
      )}

      {currentUser && currentView === "store" && currentUser.role === "ADMIN" && (
        <div className="bg-neutral-900/5 py-1">
          <AdminDashboard onBackToStore={() => setCurrentView("store")} />
        </div>
      )}

      {/* CORE FRAMEWORK VIEWS ROUTER */}
      <div className="flex-1">
        
        {/* STOREFRONT BASE */}
        {currentView === "store" && (!currentUser || (currentUser.role !== "SELLER" && currentUser.role !== "ADMIN")) && (
          <div className="pb-16 bg-neutral-50/20">
            <Storefront 
              onViewProduct={(p) => { setSelectedProduct(p); setCurrentView("product-detail"); }}
              onAddToCart={handleAddToCart}
              userWishlist={wishlist}
              onToggleWishlist={handleToggleWishlist}
            />
          </div>
        )}

        {/* VIEW 2: PRODUCT DETAIL POPOVER VIEW */}
        {currentView === "product-detail" && selectedProduct && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button
              onClick={() => { setCurrentView("store"); setSelectedProduct(null); setAiReviewSummary(""); }}
              className="flex items-center gap-1.5 hover:text-neutral-900 text-neutral-500 pl-1.5 text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 pb-0.5" /> Back to listings catalog
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm">
              
              {/* Product Visual Studio with Real Simulator 360 Rotation Rotation! */}
              <div className="space-y-6">
                <div className="relative bg-neutral-50 border border-neutral-200 rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
                  <img 
                    src={selectedProduct.images[0]} 
                    alt={selectedProduct.title} 
                    style={{ transform: `rotate(${detailRotateAngle}deg)` }}
                    className="w-full h-full object-cover transition-transform duration-300 shadow-sm" 
                  />
                  
                  {/* Angle slider controller simulated 360 viewer */}
                  <div className="absolute bottom-4 inset-x-4 bg-white/80 backdrop-blur-md rounded-2xl p-3 border border-neutral-100 flex items-center justify-between text-xs font-mono">
                    <span className="font-bold flex items-center gap-1.5 text-neutral-900">
                      <RotateCw className="w-4 h-4 animate-spin-slow text-emerald-500" /> Simulate 360° Rotate View
                    </span>
                    <input 
                      type="range"
                      min="0"
                      max="360"
                      value={detailRotateAngle}
                      onChange={e => setDetailRotateAngle(Number(e.target.value))}
                      className="w-1/2 h-1 bg-neutral-200 rounded-lg cursor-pointer accent-neutral-900"
                    />
                  </div>
                </div>

                {/* Sub galleries thumbnails */}
                <div className="grid grid-cols-3 gap-3">
                  {selectedProduct.images.map((img, i) => (
                    <div key={i} className="border border-neutral-200 rounded-xl overflow-hidden aspect-video bg-neutral-100 flex items-center justify-center">
                      <img src={img} className="object-cover w-full h-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Specification and Buy matrix */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#10B981]">{selectedProduct.brand} Premium</span>
                  <h3 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-neutral-950">{selectedProduct.title}</h3>
                  
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-0.5 text-amber-500">⭐ {selectedProduct.avgRating} ({selectedProduct.reviewCount} customer reviews)</span>
                    <span className="text-neutral-300">|</span>
                    <span className="text-neutral-500">Listed by merchant: <b>{selectedProduct.sellerName || "Official VendiCart Partner"}</b></span>
                  </div>
                </div>

                <div className="border-y border-neutral-200 py-4 font-mono flex items-center gap-3">
                  <span className="text-rose-500 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded text-[11px] h-fit">-{selectedProduct.discountPct}% Voucher applied</span>
                  <div>
                    <span className="block text-xs text-neutral-400 line-through">₹{selectedProduct.basePrice?.toLocaleString()}</span>
                    <span className="text-xl font-bold text-neutral-950">₹{(Math.round(selectedProduct.basePrice * (1 - selectedProduct.discountPct / 100)))?.toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-neutral-600 text-xs leading-relaxed font-light">{selectedProduct.description}</p>

                {/* Logistics alerts info */}
                <div className="grid grid-cols-2 gap-4 text-[11px] bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-neutral-500 font-medium">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Est. Delivery: <b>{selectedProduct.meta.deliveryTimeDays} Days</b></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Warranty: <b>{selectedProduct.meta.warrantyInfo}</b></span>
                  </div>
                </div>

                {/* Real-time stock status */}
                <div>
                  {selectedProduct.stock > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                        <span>Stock Availability State</span>
                        <span className="text-emerald-500">[ {selectedProduct.stock} units remaining ]</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddToCart(selectedProduct, 1)}
                          className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white font-bold p-3 rounded-xl uppercase tracking-wider text-xs transition duration-200 hover:shadow-lg active:scale-99 cursor-pointer"
                        >
                          Confirm Add to Cart
                        </button>
                        <button
                          onClick={() => handleToggleWishlist(selectedProduct)}
                          className="border border-neutral-200 text-rose-500 hover:bg-rose-50 p-3 rounded-xl cursor-pointer"
                        >
                          <Heart className={`w-5 h-5 ${wishlist.includes(selectedProduct.id) ? "fill-rose-500" : ""}`} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="block text-center p-3 text-rose-800 bg-rose-100 border border-rose-200 rounded-xl font-bold text-xs">SOLDOUT AT VENDOR INVENTORY</span>
                  )}
                </div>

              </div>

            </div>

            {/* AI Review consensus summarization Card! */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 font-display">Customer Consensus synthesis</h4>
                  <p className="text-[11px] text-neutral-400">Invoke Gemini reasoning engine to aggregate and summarize Pros and Cons instantly.</p>
                </div>
                <button
                  onClick={handleAIReviewsSummaryRequest}
                  disabled={isSummarizingReviews || selectedProduct.reviewCount === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 hover:shadow disabled:opacity-40 text-white rounded-xl text-xs font-bold font-display cursor-pointer"
                >
                  {isSummarizingReviews ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Ask Gemini Summary
                </button>
              </div>

              {aiReviewSummary && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-[12px] leading-relaxed text-indigo-900 flex gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-bold uppercase text-[10.5px] block mb-1 text-indigo-700">Gemini Consensus Output:</span>
                    {aiReviewSummary}
                  </div>
                </div>
              )}

              {selectedProduct.reviewCount === 0 && (
                <p className="text-xs text-neutral-400 text-center py-4">No reviews available yet on this platform vendor listing.</p>
              )}
            </div>

            {/* Reviews list panel & user review submissions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-neutral-700">
              
              {/* Review submit forms */}
              <div className="lg:col-span-1 bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm h-fit space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-600 border-b border-neutral-200 pb-2">Verified Purchase Review</h4>
                <form onSubmit={handleSubmitReview} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[11px] text-neutral-400 font-medium">Star Rating (1-5)</label>
                    <select 
                      value={reviewRating}
                      onChange={e => setReviewRating(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-200 p-2 text-xs rounded-xl"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                      <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                      <option value="3">⭐⭐⭐ 3 Stars</option>
                      <option value="2">⭐⭐ 2 Stars</option>
                      <option value="1">⭐ 1 Star</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] text-neutral-400 font-medium">Remarks</label>
                    <textarea
                      rows={3}
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      placeholder="Write your honest customer thoughts..."
                      className="w-full bg-neutral-50 border border-neutral-200 p-3 text-xs rounded-xl"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitReviewLoading || !reviewText.trim()}
                    className="w-full bg-neutral-900 border hover:bg-neutral-800 disabled:opacity-40 text-white font-bold p-2 rounded-xl text-xs flex justify-center cursor-pointer"
                  >
                    {submitReviewLoading ? "Publishing..." : "Publish Review"}
                  </button>
                </form>
              </div>

              {/* Feed lists */}
              <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-600 border-b border-neutral-200 pb-2">Active customer reviews</h4>
                
                {/* Seed list */}
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                  <div className="border-b border-neutral-200 pb-4 space-y-1.5 last:border-b-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-900">Vikram Sharma <span className="bg-emerald-50 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ml-1">Verified Buyer</span></span>
                      <span className="font-mono text-amber-500">⭐⭐⭐⭐⭐ 5/5</span>
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-neutral-500 font-light">"Absolute acoustic wonder. Noise separation is stellar and links into multiple Bluetooth modules cleanly. I'll buy more!"</p>
                  </div>
                  <div className="border-b border-neutral-200 pb-4 space-y-1.5 last:border-b-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-900">Deepika Patel</span>
                      <span className="font-mono text-amber-500">⭐⭐⭐⭐ 4/5</span>
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-neutral-500 font-light">"Excellent high end matte finish. Battery runtime easily passes 40 hours of continuous operations."</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* VIEW 3: CART + MULTI-STEP CHECKOUT ROUTE */}
        {currentView === "cart-checkout" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8 animate-in fade-in duration-200 text-xs">
            
            {/* Step status bar indicator line */}
            <div className="flex items-center justify-between max-w-xl mx-auto border-b border-neutral-200 pb-4">
              {["cart", "address", "payment", "invoice"].map((step, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono ${
                    checkpointStep === step ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-500"
                  }`}>
                    {i + 1}
                  </span>
                  <span className={`font-display font-semibold tracking-wide uppercase text-[10.5px] ${
                    checkpointStep === step ? "text-neutral-900" : "text-neutral-400"
                  }`}>
                    {step}
                  </span>
                  {i < 3 && <ChevronRight className="w-3 h-3 text-neutral-300" />}
                </div>
              ))}
            </div>

            {/* CART MODULE PANEL */}
            {checkpointStep === "cart" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* List items */}
                <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <h4 className="font-bold text-sm font-display tracking-wide text-neutral-900">Active shopping cart checklist</h4>
                  
                  <div className="divide-y divide-neutral-200 space-y-4">
                    {cart.filter(c => !c.savedForLater).map(item => {
                      if (!item.product) return null;
                      const sellPrice = Math.round(item.product.basePrice * (1 - item.product.discountPct/100));
                      return (
                        <div key={item.id} className="flex gap-4 pt-4 first:pt-0 items-start md:items-center">
                          <img src={item.product.images[0]} className="w-16 h-16 object-cover rounded-xl border" />
                          <div className="flex-1 space-y-1">
                            <h5 className="font-bold text-neutral-900 font-display">{item.product.title}</h5>
                            <span className="text-[10px] text-neutral-400 font-mono">Listed by: {item.product.brand} • SKU {item.product.sku}</span>
                          </div>
                          
                          {/* Qty counters */}
                          <div className="flex items-center gap-2 border border-neutral-200 rounded-xl px-2 py-1 bg-neutral-50">
                            <button 
                              onClick={() => handleUpdateCartQty(item.id, item.quantity - 1)}
                              className="text-neutral-500 hover:text-neutral-900 font-bold px-1"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold font-mono px-1">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateCartQty(item.id, item.quantity + 1)}
                              className="text-neutral-500 hover:text-neutral-900 font-bold px-1"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right font-mono pr-2">
                            <span className="block text-xs font-bold">₹{(sellPrice * item.quantity)?.toLocaleString()}</span>
                          </div>

                          <button 
                            onClick={() => handleRemoveCartItem(item.id)}
                            className="text-neutral-400 hover:text-rose-500 p-1.5 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}

                    {cart.filter(c => !c.savedForLater).length === 0 && (
                      <div className="text-center py-12 text-neutral-400">
                        <span>Cart is currently empty. Explore our verified products!</span>
                        <button 
                          onClick={() => setCurrentView("store")}
                          className="block mx-auto mt-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl px-4 py-2 font-bold hover:shadow cursor-pointer"
                        >
                          Explore listings
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtotals & Coupons */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* Coupon card input */}
                  <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm space-y-3">
                    <label className="block text-[10.5px] font-bold uppercase text-neutral-500 font-display">Festive Coupon Code</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={couponCode}
                        onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                        placeholder="WELCOME100, FESTIVE20"
                        className="w-full bg-neutral-50 border border-neutral-200 text-xs px-3 py-2 rounded-xl outline-none" 
                      />
                      <button 
                        onClick={handleApplyCoupon}
                        className="bg-neutral-900 text-white text-xs px-4 py-2 rounded-xl hover:bg-neutral-800 cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {couponError && <p className="text-[10px] text-rose-500 font-medium font-mono">{couponError}</p>}
                    {appliedCoupon && (
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded p-2 text-[10px] font-bold font-mono">
                        ✔ Promo Applied: -₹{appliedCoupon.value}
                      </div>
                    )}
                  </div>

                  {/* Summary bill calculations card */}
                  <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm space-y-4">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-neutral-500 font-display">VendiCart checkout parameters</h5>
                    
                    <div className="divide-y divide-neutral-200 space-y-3 text-[11.5px] leading-relaxed">
                      <div className="flex justify-between font-mono">
                        <span className="text-neutral-500">Items Gross sum:</span>
                        <span>₹{getCartTotal()?.toLocaleString()}</span>
                      </div>
                      {appliedCoupon && (
                        <div className="flex justify-between text-emerald-600 font-mono">
                          <span>Applied Voucher:</span>
                          <span>-₹{appliedCoupon.value?.toLocaleString()}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-neutral-500 py-1 border-t-0 select-none">
                        <span className="flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> Gift-Wrapping option(+₹50):</span>
                        <input 
                          type="checkbox" 
                          checked={giftWrap}
                          onChange={e => setGiftWrap(e.target.checked)}
                          className="h-4 w-4 accent-neutral-900 rounded outline-none" 
                        />
                      </div>

                      <div className="flex justify-between font-bold text-neutral-900 text-sm border-t pt-3">
                        <span>Checkout Subtotal:</span>
                        <span>₹{getSubtotalWithOffers()?.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setCheckpointStep("address")}
                      disabled={cart.filter(c => !c.savedForLater).length === 0}
                      className="w-full bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 text-white font-bold p-3 rounded-xl tracking-wider text-xs uppercase cursor-pointer"
                    >
                      Allocate Shipping Address
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* STEP 2: ADDRESS CHOICE */}
            {checkpointStep === "address" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* List saved addresses */}
                <div className="lg:col-span-2 bg-white border border-neutral-200 p-6 rounded-3xl space-y-4">
                  <h4 className="font-bold text-sm text-neutral-950 font-display">Select Destination Delivery Address</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map(addr => (
                      <div 
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`border p-4 rounded-2xl cursor-pointer transition relative space-y-2 select-none ${
                          selectedAddressId === addr.id ? "bg-neutral-900 text-white border-neutral-900 shadow-md" : "bg-neutral-50 hover:bg-white border-neutral-200"
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold uppercase tracking-wider text-[10px]">{addr.label} PIN</span>
                          {addr.isDefault && <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-bold">DEFAULT</span>}
                        </div>
                        <p className="text-[11.5px] leading-relaxed font-light">{addr.line1}, {addr.city}, {addr.state} - {addr.pincode}</p>
                      </div>
                    ))}
                  </div>

                  <hr className="border-neutral-200" />

                  {/* Add New addresses pins */}
                  <form onSubmit={handleAddAddress} className="space-y-4 pt-2">
                    <span className="font-bold uppercase text-[10.5px] text-neutral-500 block font-display">Map New Destination Pincode</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input 
                        type="text" 
                        placeholder="Label (e.g. Home, Office)" 
                        value={newAddressForm.label}
                        onChange={e => setNewAddressForm(prev => ({ ...prev, label: e.target.value }))}
                        className="bg-neutral-50 border p-2 rounded-xl text-xs outline-none focus:bg-white" 
                        required
                      />
                      <input 
                        type="text" 
                        placeholder="Flat / Building Address line" 
                        value={newAddressForm.line1}
                        onChange={e => setNewAddressForm(prev => ({ ...prev, line1: e.target.value }))}
                        className="bg-neutral-50 border p-2 rounded-xl text-xs outline-none focus:bg-white md:col-span-2" 
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input 
                        type="text" 
                        placeholder="City" 
                        value={newAddressForm.city}
                        onChange={e => setNewAddressForm(prev => ({ ...prev, city: e.target.value }))}
                        className="bg-neutral-50 border p-2 rounded-xl text-xs outline-none focus:bg-white" 
                        required
                      />
                      <input 
                        type="text" 
                        placeholder="State" 
                        value={newAddressForm.state}
                        onChange={e => setNewAddressForm(prev => ({ ...prev, state: e.target.value }))}
                        className="bg-neutral-50 border p-2 rounded-xl text-xs outline-none focus:bg-white" 
                        required
                      />
                      <input 
                        type="text" 
                        placeholder="Postal Pin Code (6 digits)" 
                        value={newAddressForm.pincode}
                        onChange={e => setNewAddressForm(prev => ({ ...prev, pincode: e.target.value }))}
                        className="bg-neutral-50 border p-2 rounded-xl text-xs outline-none focus:bg-white font-mono" 
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 text-xs rounded-xl font-bold cursor-pointer"
                    >
                      Register New Pin Address
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-1 bg-white border border-neutral-200 p-5 rounded-2xl h-fit space-y-4">
                  <h5 className="font-bold text-xs uppercase text-neutral-500 border-b pb-2">Allocated delivery summary</h5>
                  <div className="space-y-3 font-mono font-bold text-neutral-900">
                    <div className="flex justify-between">
                      <span className="font-sans text-neutral-400 font-medium">Subtotal sum:</span>
                      <span>₹{getSubtotalWithOffers()?.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 font-sans font-light leading-relaxed">Delivery schedules will dispatch safely matching selected destination pin parameters.</p>
                  </div>
                  <button
                    onClick={() => setCheckpointStep("payment")}
                    disabled={!selectedAddressId}
                    className="w-full bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 text-white font-bold p-3 rounded-xl uppercase text-xs cursor-pointer animate-pulse"
                  >
                    Confirm & Proceed Checkout
                  </button>
                </div>

              </div>
            )}

            {/* STEP 3: PAYMENT TYPE CHANNEL OPTIONS */}
            {checkpointStep === "payment" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-2 bg-white border border-neutral-200 p-6 rounded-3xl space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm text-neutral-900 font-display">Secure Payment Gateways</h4>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">SSL Encrypted</span>
                  </div>

                  {/* Wallet Check downs balance offset panel */}
                  <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 flex justify-between items-center select-none font-mono">
                    <div className="space-y-1">
                      <span className="block text-xs font-bold text-neutral-900 font-sans">Apply Stored VendiCart Wallet Balance (₹{wallet.balance?.toLocaleString()})</span>
                      <span className="text-[10px] text-neutral-400 block font-sans">Instant offsets available from welcome referral credits!</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={useWalletBalance}
                      onChange={e => setUseWalletBalance(e.target.checked)}
                      className="h-5 w-5 accent-neutral-950 rounded cursor-pointer outline-none" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* COD, Gateway choices */}
                    <div 
                      onClick={() => setSelectedPaymentMethod("COD")}
                      className={`border p-4 rounded-xl cursor-pointer text-center space-y-2 ${
                        selectedPaymentMethod === "COD" ? "border-neutral-950 bg-neutral-50" : "border-neutral-200 hover:border-neutral-800"
                      }`}
                    >
                      <span className="block text-xl">💵</span>
                      <span className="block font-bold">UPI / Cash on Delivery</span>
                    </div>
                    <div 
                      onClick={() => setSelectedPaymentMethod("STRIPE")}
                      className={`border p-4 rounded-xl cursor-pointer text-center space-y-2 ${
                        selectedPaymentMethod === "STRIPE" ? "border-neutral-950 bg-neutral-50" : "border-neutral-200 hover:border-neutral-800"
                      }`}
                    >
                      <span className="block text-xl">💳</span>
                      <span className="block font-bold">Stripe Cards portal</span>
                    </div>
                    <div 
                      onClick={() => setSelectedPaymentMethod("RAZORPAY")}
                      className={`border p-4 rounded-xl cursor-pointer text-center space-y-2 ${
                        selectedPaymentMethod === "RAZORPAY" ? "border-neutral-950 bg-neutral-50" : "border-neutral-200 hover:border-neutral-800"
                      }`}
                    >
                      <span className="block text-xl">⚡</span>
                      <span className="block font-bold">Razorpay NetBanking</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1 bg-white border border-neutral-200 p-5 rounded-2xl h-fit space-y-4">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-neutral-500 border-b pb-2">Checkout reconciliation parameters</h5>
                  
                  <div className="space-y-2.5 font-mono">
                    <div className="flex justify-between text-neutral-500">
                      <span>Voucher total:</span>
                      <span>₹{getSubtotalWithOffers()?.toLocaleString()}</span>
                    </div>
                    {useWalletBalance && (
                      <div className="flex justify-between text-indigo-600">
                        <span>Wallet applied:</span>
                        <span>-₹{Math.min(getSubtotalWithOffers(), wallet.balance)?.toLocaleString()}</span>
                      </div>
                    )}
                    <hr className="border-neutral-200" />
                    <div className="flex justify-between text-sm font-bold text-neutral-900 border-t-0 pt-2">
                      <span>Total Net checkout:</span>
                      <span>₹{Math.max(0, getSubtotalWithOffers() - (useWalletBalance ? Math.min(getSubtotalWithOffers(), wallet.balance) : 0))?.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckoutSubmit}
                    disabled={checkoutLoading}
                    className="w-full bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 text-white font-bold p-3 rounded-xl uppercase text-xs cursor-pointer flex justify-center items-center gap-1.5"
                  >
                    {checkoutLoading && <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />}
                    Reconcile Ledger & Complete Order
                  </button>
                </div>

              </div>
            )}

            {/* STEP 4: LEGAL INVOICE SUMMARY SCREEN SHEET COMPONENT */}
            {checkpointStep === "invoice" && (
              <div className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-3xl p-8 shadow-xl space-y-6">
                
                {/* Visual complete banner */}
                <div className="text-center space-y-2.5 pb-4 border-b border-neutral-200">
                  <div className="inline-flex h-12 w-12 bg-emerald-100 text-emerald-800 rounded-full items-center justify-center mx-auto text-xl font-bold">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-bold font-display tracking-tight text-neutral-950">VendiCart Order Authenticated</h4>
                  <p className="text-xs text-neutral-400">Ledger successfully reconciled. Legal QR invoice page processed.</p>
                </div>

                {/* Simulated QR Code & digital parameters block */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-neutral-50 border border-neutral-200 rounded-2xl p-5">
                  <div className="space-y-2 bg-transparent">
                    <span className="block text-[11px] font-mono tracking-wider font-bold uppercase text-neutral-500">Invoice Credentials</span>
                    <h5 className="text-[13px] font-bold font-display text-neutral-900">VendiCart Registry: <b>#{generatedOrderId}</b></h5>
                    <div className="text-[10px] space-y-1 text-neutral-500 font-mono">
                      <p>🗓 Order timestamp: {new Date().toLocaleDateString()}</p>
                      <p>🔐 Clearance check: SSL Encrypted Node</p>
                      <p>📍 Shipped tracking status: Placed milestone active</p>
                    </div>
                  </div>
                  
                  {/* Real Dynamic QR code vectors */}
                  <div className="p-3 bg-white border border-neutral-200 rounded-2xl text-center space-y-1 shrink-0 select-none shadow">
                    <QrCode className="w-20 h-20 text-neutral-900 mx-auto" />
                    <span className="block text-[8px] font-bold font-mono tracking-widest text-neutral-400 uppercase">Validate VendiCart Tax</span>
                  </div>
                </div>

                {/* Back to catalog links */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => { setCurrentView("store"); setSelectedProduct(null); setAppliedCoupon(null); }}
                    className="bg-neutral-900 hover:bg-neutral-800 p-3 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Return Storefront
                  </button>
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/orders");
                      if (res.ok) {
                        setOrders(await res.json());
                        setCurrentView("my-orders");
                      }
                    }}
                    className="bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 p-3 rounded-xl text-xs font-bold font-mono cursor-pointer"
                  >
                    View Shipment Map
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

        {/* VIEW 4: MY ORDERS TIMELINE & MAP SIMULATION WORKFLOWS */}
        {currentView === "my-orders" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8 animate-in fade-in duration-200 text-xs">
            
            <div className="border-b border-neutral-200 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold font-display tracking-tight text-neutral-950">Shipments Timeline Logs</h3>
                <p className="text-neutral-400 text-[11px]">Review physical carrier milestones, cancel, or refund active multi-vendor orders.</p>
              </div>
              <button 
                onClick={() => setCurrentView("store")}
                className="bg-white border border-neutral-200 px-4 py-2 hover:border-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Explore listings Catalogue
              </button>
            </div>

            <div className="space-y-6">
              {orders.map(ord => {
                const stepIdx = getSimulatedMilestonesIndex(ord.status);
                return (
                  <div key={ord.id} className="bg-white border border-neutral-200 p-6 rounded-3xl shadow-sm space-y-6">
                    
                    {/* Header info */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-neutral-200 pb-4">
                      <div>
                        <span className="block text-[10px] font-mono font-bold text-neutral-400">ORDER LOG REF</span>
                        <h4 className="font-bold text-sm text-neutral-900 font-display">#{ord.id}</h4>
                      </div>
                      <div className="space-y-1 text-right font-mono">
                        <span className="text-xs font-bold text-neutral-950">₹{ord.totalAmount?.toLocaleString()}</span>
                        <p className="text-[9px] text-neutral-400 font-sans">Payment channel: {ord.paymentMethod} ({ord.paymentStatus})</p>
                      </div>
                    </div>

                    {/* Timeline visualization */}
                    <div className="relative py-4 select-none">
                      <div className="absolute inset-y-1/2 left-3 right-3 h-0.5 bg-neutral-200 -translate-y-1/2 z-0 hidden md:block"></div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
                        {["Placed", "Confirmed", "Packed", "Shipped", "Delivered"].map((st, i) => {
                          const isPast = stepIdx >= i;
                          const isCur = stepIdx === i;
                          return (
                            <div key={i} className="text-center space-y-2">
                              <div className={`h-6 w-6 rounded-full mx-auto flex items-center justify-center font-mono font-bold text-[10px] border ${
                                isCur ? "bg-indigo-600 text-white border-indigo-600 animate-pulse" :
                                isPast ? "bg-neutral-900 text-white border-neutral-900" :
                                "bg-white text-neutral-300 border-neutral-200"
                              }`}>
                                {isPast ? "✔" : i+1}
                              </div>
                              <span className={`block text-[10.5px] font-semibold uppercase tracking-wide font-display ${
                                isPast ? "text-neutral-900" : "text-neutral-300"
                              }`}>{st}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Timeline logistic map simulator stage */}
                    {ord.status === "Shipped" && (
                      <div className="bg-neutral-900 text-white rounded-2xl p-5 border border-neutral-800 space-y-3 relative overflow-hidden h-40 flex flex-col justify-between">
                        <div className="absolute inset-0 bg-transparent opacity-10">
                          {/* Map grids backgrounds */}
                          <div className="absolute inset-x-0 h-0.5 bg-white top-5"></div>
                          <div className="absolute inset-x-0 h-0.5 bg-white top-20"></div>
                          <div className="absolute inset-y-0 w-0.5 bg-white left-20"></div>
                          <div className="absolute inset-y-0 w-0.5 bg-white left-60"></div>
                        </div>

                        <div className="flex justify-between items-start z-10 bg-transparent">
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] uppercase tracking-wider font-bold">
                              <Truck className="w-3.5 h-3.5 animate-bounce" /> Live Driver dispatch Simulation
                            </span>
                            <span className="block text-[11.5px] mt-1 text-neutral-300 leading-tight">Carrier heading toward destination pincode vector <b>[{ord.address.pincode}]</b></span>
                          </div>
                          
                          <span className="bg-indigo-600 text-white font-bold text-[10px] px-2.5 py-1 rounded font-mono">2 Hour Est.</span>
                        </div>

                        <div className="flex items-center gap-2 z-10 text-[10.5px]">
                          <MapIcon className="w-4 h-4 text-emerald-400" />
                          <span className="text-neutral-400 tracking-tight">Driver logs: Reconciled blue-wing freight ledger at Dwight Hub. Handshake secured.</span>
                        </div>
                      </div>
                    )}

                    {/* Item lines listing & checkout cancel buttons */}
                    <div className="flex justify-between items-center border-t border-neutral-200 pt-4">
                      <span className="text-[11px] text-neutral-500 font-medium">Destination: <b>{ord.address.line1}, {ord.address.city} - {ord.address.pincode}</b></span>
                      
                      <div className="space-x-2">
                        {(ord.status === "Placed" || ord.status === "Confirmed") && (
                          <button
                            onClick={async () => {
                              if(confirm("Confirm cancellation? Paid/Wallet amounts are immediately refunded!")) {
                                await fetch(`/api/orders/${ord.id}/cancel`, {
                                  method: "POST",
                                  headers: { "Authorization": `Bearer ${userToken}` }
                                });
                                fetchClientData(userToken!);
                                showToast(`Order ${ord.id} cancelled successfully! Refund credited.`);
                              }
                            }}
                            className="text-rose-500 hover:bg-rose-50 px-3 py-1.5 border border-rose-200/50 rounded-xl font-bold font-mono transition text-[10.5px] cursor-pointer"
                          >
                            Cancel shipment
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}

              {orders.length === 0 && (
                <div className="text-center py-12 bg-white border border-neutral-200 rounded-2xl shadow-sm text-neutral-400">
                  <span>No physical shipping orders logged on VendiCart Applet portal.</span>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* FLOAT SLIDEOUT PROFILE DRAWER & WALLET BALANCES AUTOLOADS */}
      {showProfileDrawer && currentUser && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-96 bg-white shrink-0 p-6 shadow-2xl flex flex-col h-full overflow-y-auto space-y-6 font-sans border-l border-neutral-200 text-xs">
            <div className="border-b pb-4 flex justify-between items-center">
              <div>
                <h4 className="font-bold font-display tracking-tight text-neutral-950 text-sm">VendiCart Customer Ledger</h4>
                <p className="text-[10px] text-neutral-400">Directly manage balances, deposit parameters, and credential links.</p>
              </div>
              <button 
                onClick={() => setShowProfileDrawer(false)}
                className="text-neutral-500 hover:text-neutral-900 border p-1 rounded-lg cursor-pointer"
              >
                Close Drawer
              </button>
            </div>

            {/* User credentials */}
            <div className="bg-neutral-50 border p-4 rounded-2xl flex items-center gap-3">
              <img src={currentUser.avatar} className="w-12 h-12 rounded-full border border-neutral-200" />
              <div>
                <span className="block font-bold text-neutral-900 text-sm">{currentUser.name}</span>
                <span className="text-neutral-500 block text-[10px] font-mono">{currentUser.email}</span>
              </div>
            </div>

            <hr className="border-neutral-200" />

            {/* Wallet autodeposit ledger */}
            <div className="bg-emerald-500/5 border border-emerald-500/15 p-4 rounded-2xl space-y-4">
              <span className="font-bold text-[10px] uppercase text-emerald-800 tracking-wider font-display block">Stored Wallet Ledger balance</span>
              
              <div className="flex justify-between items-end">
                <span className="text-[13px] text-neutral-500 font-medium">Available Cash credit:</span>
                <span className="text-2xl font-bold font-mono text-emerald-600">₹{wallet.balance?.toLocaleString()}</span>
              </div>

              {/* deposit form */}
              <form onSubmit={handleAutoloadWallet} className="space-y-2">
                <label className="block text-[10px] font-bold text-neutral-500">Autoload balance (INR ₹)</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={walletAutoloadAmt}
                    onChange={e => setWalletAutoloadAmt(e.target.value)}
                    placeholder="e.g. ₹2000" 
                    className="w-full bg-white border border-neutral-200 p-2 text-xs rounded-xl outline-none font-mono" 
                  />
                  <button
                    type="submit"
                    disabled={walletLoading || !walletAutoloadAmt}
                    className="bg-neutral-900 text-white font-bold px-3 py-1 rounded-xl hover:bg-neutral-800 cursor-pointer text-xs"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>

            {/* Historic wallet ledger transaction logs */}
            <div className="space-y-2">
              <span className="font-bold text-[10px] text-neutral-400 block uppercase tracking-wider font-mono">Wallet Transactions logs</span>
              <div className="max-h-40 overflow-y-auto space-y-2 border border-neutral-200 rounded-2xl p-3 bg-neutral-50 text-[10.5px]">
                {wallet.transactions?.map(t => (
                  <div key={t.id} className="flex justify-between items-center bg-white p-1.5 rounded-lg shadow-sm font-mono border border-neutral-200">
                    <div>
                      <span className="block text-neutral-900 text-[10px] font-bold">{t.description}</span>
                      <span className="text-[8px] text-neutral-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className={`font-bold ${t.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {t.amount < 0 ? "-" : "+"}₹{Math.abs(t.amount)}
                    </span>
                  </div>
                ))}
                {(!wallet.transactions || wallet.transactions.length === 0) && (
                  <p className="text-center py-6 text-neutral-400 text-[10px]">No wallet ledger entries mapped.</p>
                )}
              </div>
            </div>

            <hr className="border-neutral-200" />

            <div className="space-y-2 select-none">
              <button
                onClick={() => { setShowProfileDrawer(false); setCurrentView("my-orders"); }}
                className="w-full p-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl font-bold font-mono text-[10px] uppercase text-center cursor-pointer block"
              >
                Track shipments logs
              </button>
              <button
                onClick={handleLogout}
                className="w-full p-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl font-bold tracking-wider text-[10px] uppercase text-center cursor-pointer block"
              >
                Secure disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOAT MEMBERS REGISTER/SIGN-IN PORTAL WINDOW */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 font-sans text-xs flex flex-col space-y-4">
            
            <button 
              onClick={() => { setShowAuthModal(false); setAuthName(""); setAuthEmail(""); setAuthPassword(""); }}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition cursor-pointer"
            >
              Close
            </button>

            <div className="text-center space-y-1 pb-2">
              <h4 className="text-lg font-bold font-display tracking-tight text-neutral-950">VendiCart Core Account</h4>
              <p className="text-[11px] text-neutral-400">Secure member access for multi-vendor checkout validation.</p>
            </div>

            {/* Quick Demo Access Buttons Card */}
            <div className="bg-neutral-50/80 border border-neutral-200 rounded-2xl p-4 space-y-3">
              <span className="block text-[10px] uppercase tracking-wider text-neutral-400 font-bold text-center">Fast-Track Demo Access Profile Toggles</span>
              
              <div className="grid grid-cols-3 gap-2 text-[10.5px]">
                <button
                  onClick={() => handleDemoLogin("CUSTOMER")}
                  className="bg-white border rounded-xl p-2 font-display font-semibold hover:border-neutral-900 transition-colors hover:shadow-xs cursor-pointer flex flex-col items-center gap-1.5"
                >
                  👤 Customer
                  <span className="text-[8.5px] block font-mono text-neutral-400">(Vikram)</span>
                </button>
                <button
                  onClick={() => handleDemoLogin("SELLER")}
                  className="bg-white border rounded-xl p-2 font-display font-semibold hover:border-neutral-900 transition-colors hover:shadow-xs cursor-pointer flex flex-col items-center gap-1.5"
                >
                  🚀 Seller
                  <span className="text-[8.5px] block font-mono text-neutral-400">(Cosmic)</span>
                </button>
                <button
                  onClick={() => handleDemoLogin("ADMIN")}
                  className="bg-white border rounded-xl p-2 font-display font-semibold hover:border-neutral-900 transition-colors hover:shadow-xs cursor-pointer flex flex-col items-center gap-1.5"
                >
                  ⚡ Admin
                  <span className="text-[8.5px] block font-mono text-neutral-400">(Deepika)</span>
                </button>
              </div>

              <span className="block text-[10px] text-neutral-400 text-center font-mono">Credentials: <b>Demo@1234</b></span>
            </div>

            <hr className="border-neutral-200" />

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {isRegister && (
                <div className="space-y-1 text-left">
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-400 font-bold leading-none">Full name</label>
                  <input 
                    type="text" 
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    placeholder="e.g. Vikram Sharma" 
                    className="bg-neutral-50 border p-2.5 rounded-xl w-full text-xs outline-none focus:bg-white" 
                    required
                  />
                </div>
              )}
              <div className="space-y-1 text-left">
                <label className="block text-[10px] uppercase tracking-wider text-neutral-400 font-bold leading-none">VendiCart Register Email</label>
                <input 
                  type="email" 
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="e.g. customer@demo.com" 
                  className="bg-neutral-50 border p-2.5 rounded-xl w-full text-xs outline-none focus:bg-white" 
                  required
                />
              </div>
              <div className="space-y-1 text-left">
                <label className="block text-[10px] uppercase tracking-wider text-neutral-400 font-bold leading-none">Password code</label>
                <input 
                  type="password" 
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="******" 
                  className="bg-neutral-50 border p-2.5 rounded-xl w-full text-xs outline-none focus:bg-white" 
                  required
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-neutral-950 text-white font-bold p-3 rounded-xl uppercase tracking-wider shadow-md hover:bg-neutral-800 flex justify-center cursor-pointer"
              >
                {authLoading ? "Initializing security checks..." : (isRegister ? "Join VendiCart Marketplace" : "Verify and Login")}
              </button>

              <p className="text-center text-[10px] text-neutral-400 select-none">
                {isRegister ? "Already registered on platform?" : "No credentials logged?"}
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-neutral-900 border-none font-bold underline ml-1 cursor-pointer"
                >
                  {isRegister ? "Authenticate instead" : "Register now"}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER CANVAS */}
      <footer className="bg-white border-t border-neutral-200 py-8 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-neutral-400 font-mono space-y-1.5">
          <p className="font-sans font-semibold text-neutral-900">VENDICART MULTI-VENDOR PLATFORM</p>
          <p>Clearance standard compliance check OK • Encrypted Ledger</p>
          <p className="text-[9.5px]">© 2026 VendiCart Inc. All rights reserve operations</p>
        </div>
      </footer>

      {/* FLOAT SHOPPING CO-PILOT ASSISTANT */}
      <AIChatWidget />

    </div>
  );
}
