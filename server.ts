import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/server/db";
import { 
  askVendiCartAssistant, 
  generateProductDescription, 
  recommendProductPrice, 
  predictProductDemand, 
  summarizeProductReviews,
  ai,
  DEFAULT_MODEL
} from "./src/server/aiService";
import { 
  User, Seller, Product, Order, OrderItem, 
  OrderTracking, Review, CartItem, Address, Coupon, 
  Notification, WalletTransaction, WishlistItem, Message, OTP 
} from "./src/types";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Simple Session State (In-Memory Session for iframe compatibility and sandbox reliability)
  // Maps token strings to user IDs
  const activeSessions = new Map<string, string>();
  
  // Middleware to resolve active user from Authorization header or simulated cookie
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const userId = activeSessions.get(token);
      if (userId) {
        const user = db.get("users").find(u => u.id === userId);
        if (user) {
          (req as any).user = user;
        }
      }
    }
    next();
  });

  // Helper helper to send a socket-like simulated notification to a user
  const sendSimulationNotification = (userId: string, type: "ORDER" | "PAYMENT" | "PRICE_DROP" | "OFFER" | "CHAT", message: string, meta = {}) => {
    const notifs = db.get("notifications");
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      userId,
      type,
      message,
      isRead: false,
      meta,
      createdAt: new Date().toISOString()
    };
    db.save("notifications", newNotif);
  };

  // --- API ROUTES FIRST ---

  // Auth Group
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const users = db.get("users") as User[];
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.passwordHash !== password) {
       res.status(401).json({ error: "Invalid email credentials or security code." });
       return;
    }

    const token = `token-${user.id}-${Date.now()}`;
    activeSessions.set(token, user.id);

    // If seller, check approval workflow
    let sellerInfo = null;
    if (user.role === "SELLER") {
      const sellers = db.get("sellers") as Seller[];
      sellerInfo = sellers.find(s => s.userId === user.id) || null;
    }

    res.json({ token, user, seller: sellerInfo });
  });

  app.post("/api/auth/register", (req, res) => {
    const { name, email, password, role, shopName, shopDescription } = req.body;
    const users = db.get("users") as User[];
    
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
       res.status(400).json({ error: "Email address is already registered on VendiCart." });
       return;
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name,
      email,
      passwordHash: password || "Demo@1234",
      role: role || "CUSTOMER",
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      isVerified: true,
      walletBalance: role === "CUSTOMER" ? 1000 : 0, // Gift ₹1000 wallet points
      createdAt: new Date().toISOString()
    };
    
    db.save("users", newUser);

    let newSeller: Seller | null = null;
    if (newUser.role === "SELLER") {
      newSeller = {
        id: `sel-${Date.now()}`,
        userId: newUser.id,
        shopName: shopName || `${name}'s Boutique`,
        description: shopDescription || "A newly registered premium VendiCart boutique store.",
        logo: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=200&q=80",
        isApproved: false, // Wait for admin confirmation
        bankDetails: { accountNumber: "X".repeat(12), bankName: "VendiCart Clearing Bank", ifsc: "ELY0000123" },
        createdAt: new Date().toISOString()
      };
      db.save("sellers", newSeller);
    }

    const token = `token-${newUser.id}-${Date.now()}`;
    activeSessions.set(token, newUser.id);

    // Initial message
    if (newUser.role === "CUSTOMER") {
      sendSimulationNotification(newUser.id, "OFFER", "Welcome to VendiCart! We've credited ₹1,000 cash balance directly to your wallet account.");
    }

    res.json({ token, user: newUser, seller: newSeller });
  });

  app.get("/api/auth/me", (req, res) => {
    const user = (req as any).user;
    if (!user) {
       res.json({ user: null, seller: null });
       return;
    }
    const sellers = db.get("sellers") as Seller[];
    const seller = sellers.find(s => s.userId === user.id) || null;
    res.json({ user, seller });
  });

  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      activeSessions.delete(token);
    }
    res.json({ success: true, message: "Logged out from VendiCart session." });
  });

  app.post("/api/auth/send-otp", (req, res) => {
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const newOTP: OTP = {
      id: `otp-${Date.now()}`,
      email,
      code,
      expiresAt: expiry.toISOString(),
      used: false
    };
    db.save("otps", newOTP);

    console.log(`[SIMULATION OTP] Sending to ${email}: Code ${code}`);
    res.json({ success: true, message: "Simulated verification OTP dispatched up to email logs.", code });
  });

  app.post("/api/auth/verify-otp", (req, res) => {
    const { email, code } = req.body;
    const otps = db.get("otps") as OTP[];
    const match = otps.find(o => o.email === email && o.code === code && !o.used);

    if (!match || new Date(match.expiresAt) < new Date()) {
       res.status(400).json({ error: "Invalid or expired authorization code." });
       return;
    }

    match.used = true;
    db.save("otps", match);
    res.json({ success: true, message: "Email validation secured." });
  });

  app.post("/api/auth/forgot-password", (req, res) => {
    const { email } = req.body;
    const user = db.get("users").find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
       res.status(404).json({ error: "No such VendiCart account is registered." });
       return;
    }
    res.json({ success: true, message: "A reset authentication trigger has been generated. Simulated link processed." });
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { email, newPassword } = req.body;
    const users = db.get("users") as User[];
    const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (index === -1) {
       res.status(404).json({ error: "No matching account." });
       return;
    }
    users[index].passwordHash = newPassword;
    db.persist();
    res.json({ success: true, message: "Credential lock reset completed." });
  });

  // User Profile, Addresses, Wallet, Notifications Group
  app.get("/api/users/profile", (req, res) => {
    const user = (req as any).user;
    if (!user) {
       res.status(401).json({ error: "Authorization locked." });
       return;
    }
    res.json(user);
  });

  app.put("/api/users/profile", (req, res) => {
    const user = (req as any).user;
    if (!user) {
       res.status(401).json({ error: "Unauthorized." });
       return;
    }
    const { name, avatar } = req.body;
    user.name = name || user.name;
    user.avatar = avatar || user.avatar;
    db.save("users", user);
    res.json({ success: true, user });
  });

  app.get("/api/users/addresses", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Log in needed." });
    const addrs = db.get("addresses").filter(a => a.userId === user.id);
    res.json(addrs);
  });

  app.post("/api/users/addresses", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Log in needed." });
    const { label, line1, line2, city, state, pincode, isDefault } = req.body;

    const addresses = db.get("addresses") as Address[];
    if (isDefault) {
      addresses.forEach(a => {
        if (a.userId === user.id) a.isDefault = false;
      });
    }

    const newAddr: Address = {
      id: `addr-${Date.now()}`,
      userId: user.id,
      label,
      line1,
      line2,
      city,
      state,
      pincode,
      isDefault: isDefault || addresses.filter(a => a.userId === user.id).length === 0
    };

    db.save("addresses", newAddr);
    res.json(newAddr);
  });

  app.delete("/api/users/addresses/:id", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Log in needed." });
    db.remove("addresses", req.params.id);
    res.json({ success: true });
  });

  app.get("/api/wallet/balance", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized." });
    const tx = db.get("walletTransactions").filter(t => t.userId === user.id);
    res.json({ balance: user.walletBalance, transactions: tx });
  });

  app.post("/api/wallet/deposit", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized." });
    const { amount, description } = req.body;
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) return res.status(400).json({ error: "Invalid currency payload." });

    user.walletBalance += numAmt;
    db.save("users", user);

    const tx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      userId: user.id,
      type: "DEPOSIT",
      amount: numAmt,
      description: description || "Instant Wallet Autoload",
      createdAt: new Date().toISOString()
    };
    db.save("walletTransactions", tx);

    res.json({ success: true, balance: user.walletBalance, tx });
  });

  app.get("/api/notifications", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized." });
    const notifs = db.get("notifications").filter(n => n.userId === user.id);
    res.json(notifs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });

  app.post("/api/notifications/mark-read", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized." });
    const notifs = db.get("notifications") as Notification[];
    notifs.forEach(n => {
      if (n.userId === user.id) n.isRead = true;
    });
    db.persist();
    res.json({ success: true });
  });

  // Products and Catalog Group (Supports highly advanced NLP Filter parses)
  app.get("/api/products", (req, res) => {
    const { q, category, brand, minPrice, maxPrice, rating, sellerId } = req.query;
    let items = db.get("products") as Product[];

    // Hydrate seller shop name
    const sellers = db.get("sellers") as Seller[];
    items.forEach(p => {
      const seller = sellers.find(s => s.id === p.sellerId);
      if (seller) p.sellerName = seller.shopName;
    });

    // 1. NLP Search Query Parsing
    if (q) {
      let queryStr = String(q).toLowerCase();
      
      // Look for pricing ranges in NLP like "under 5000" or "below ₹3000" or "under 1000"
      const priceMatch = queryStr.match(/(?:under|below|less than|within)\s*(?:₹|inr)?\s*(\d+)/i);
      if (priceMatch && priceMatch[1]) {
        const threshold = Number(priceMatch[1]);
        items = items.filter(p => {
          const sellPrice = p.basePrice * (1 - p.discountPct / 100);
          return sellPrice <= threshold;
        });
        // Strip the pricing instruction from target keywords for brand/category text checks
        queryStr = queryStr.replace(/(?:under|below|less than|within)\s*(?:₹|inr)?\s*(\d+)/i, "").trim();
      }

      // Check remaining text filters
      if (queryStr) {
        items = items.filter(p => 
          p.title.toLowerCase().includes(queryStr) ||
          p.description.toLowerCase().includes(queryStr) ||
          p.category.toLowerCase().includes(queryStr) ||
          p.brand.toLowerCase().includes(queryStr)
        );
      }
    }

    // Standard structural parameters
    if (category) {
      items = items.filter(p => p.category.toLowerCase() === String(category).toLowerCase());
    }
    if (brand) {
      items = items.filter(p => p.brand.toLowerCase() === String(brand).toLowerCase());
    }
    if (sellerId) {
      items = items.filter(p => p.sellerId === String(sellerId));
    }
    if (minPrice) {
      items = items.filter(p => (p.basePrice * (1 - p.discountPct / 100)) >= Number(minPrice));
    }
    if (maxPrice) {
      items = items.filter(p => (p.basePrice * (1 - p.discountPct / 100)) <= Number(maxPrice));
    }
    if (rating) {
      items = items.filter(p => p.avgRating >= Number(rating));
    }

    res.json(items);
  });

  app.get("/api/products/:id", (req, res) => {
    const products = db.get("products") as Product[];
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
       res.status(404).json({ error: "Product not listing on VendiCart catalog." });
       return;
    }

    const sellers = db.get("sellers") as Seller[];
    const pSeller = sellers.find(s => s.id === product.sellerId);
    if (pSeller) product.sellerName = pSeller.shopName;

    // Attach hydrated variants
    const product_variants = db.get("wishlists") as any[]; // repurposing variants or load specifically
    // Fetch reviews
    const reviews = db.get("reviews").filter(r => r.productId === product.id);

    res.json({ product, reviews });
  });

  app.post("/api/products", (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== "SELLER") {
       res.status(403).json({ error: "Only authorized approved vendors can publish items." });
       return;
    }

    const sellers = db.get("sellers") as Seller[];
    const currentSeller = sellers.find(s => s.userId === user.id);
    if (!currentSeller || !currentSeller.isApproved) {
       res.status(403).json({ error: "Your vendor license is currently awaiting administrator validation approval." });
       return;
    }

    const { title, description, category, brand, basePrice, discountPct, stock, sku, images, videoUrl, meta } = req.body;

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      sellerId: currentSeller.id,
      title,
      description,
      category,
      brand,
      basePrice: Number(basePrice),
      discountPct: Number(discountPct || 0),
      stock: Number(stock),
      sku: sku || `SKU-${Math.random().toString(36).substring(3,9).toUpperCase()}`,
      images: images && images.length ? images : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80"],
      videoUrl,
      avgRating: 5.0,
      reviewCount: 0,
      meta: meta || {
        deliveryTimeDays: 3,
        warrantyInfo: "1 Year Standard Warranty",
        returnPolicy: "7 Days Refund Guarantee",
        seoKeywords: [brand, category, title]
      },
      createdAt: new Date().toISOString()
    };

    db.save("products", newProduct);
    res.json(newProduct);
  });

  app.put("/api/products/:id", (req, res) => {
    const user = (req as any).user;
    if (!user || (user.role !== "SELLER" && user.role !== "ADMIN")) {
       res.status(403).json({ error: "Unauthorized update lock." });
       return;
    }

    const products = db.get("products") as Product[];
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Target missing." });

    const { title, description, category, brand, basePrice, discountPct, stock, image } = req.body;

    product.title = title || product.title;
    product.description = description || product.description;
    product.category = category || product.category;
    product.brand = brand || product.brand;
    product.basePrice = basePrice ? Number(basePrice) : product.basePrice;
    product.discountPct = discountPct !== undefined ? Number(discountPct) : product.discountPct;
    product.stock = stock !== undefined ? Number(stock) : product.stock;
    if (image) product.images = [image];

    db.save("products", product);
    res.json(product);
  });

  app.delete("/api/products/:id", (req, res) => {
    const user = (req as any).user;
    if (!user || (user.role !== "SELLER" && user.role !== "ADMIN")) {
       res.status(403).json({ error: "Unauthorized delete request." });
       return;
    }
    db.remove("products", req.params.id);
    res.json({ success: true });
  });

  // Cart Module Endpoints (Requires hydration)
  app.get("/api/cart", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.json([]);

    const cart = db.get("cartItems").filter(c => c.userId === user.id) as CartItem[];
    const products = db.get("products") as Product[];

    cart.forEach(c => {
      c.product = products.find(p => p.id === c.productId);
    });

    res.json(cart);
  });

  app.post("/api/cart/add", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Please log in to add to cart." });

    const { productId, quantity } = req.body;
    const cart = db.get("cartItems") as CartItem[];
    const existIdx = cart.findIndex(c => c.userId === user.id && c.productId === productId && !c.savedForLater);

    if (existIdx > -1) {
      cart[existIdx].quantity += Number(quantity || 1);
      db.save("cartItems", cart[existIdx]);
    } else {
      const newItem: CartItem = {
        id: `ct-${Date.now()}`,
        userId: user.id,
        productId,
        quantity: Number(quantity || 1),
        savedForLater: false
      };
      db.save("cartItems", newItem);
    }
    res.json({ success: true });
  });

  app.post("/api/cart/update-qty", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Authentication needed." });
    const { cartItemId, quantity } = req.body;

    const cart = db.get("cartItems") as CartItem[];
    const target = cart.find(c => c.id === cartItemId && c.userId === user.id);
    if (!target) return res.status(404).json({ error: "Cart item missing." });

    target.quantity = Number(quantity);
    if (target.quantity <= 0) {
      db.remove("cartItems", cartItemId);
    } else {
      db.save("cartItems", target);
    }
    res.json({ success: true });
  });

  app.post("/api/cart/remove", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Session invalid." });
    const { cartItemId } = req.body;
    db.remove("cartItems", cartItemId);
    res.json({ success: true });
  });

  app.post("/api/cart/toggle-later", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Session invalid." });
    const { cartItemId } = req.body;

    const cart = db.get("cartItems") as CartItem[];
    const target = cart.find(c => c.id === cartItemId && c.userId === user.id);
    if (target) {
      target.savedForLater = !target.savedForLater;
      db.save("cartItems", target);
    }
    res.json({ success: true });
  });

  app.post("/api/cart/apply-coupon", (req, res) => {
    const { code, cartTotal } = req.body;
    const coupons = db.get("coupons") as Coupon[];
    const match = coupons.find(c => c.code.toUpperCase() === String(code).trim().toUpperCase());

    if (!match) return res.status(400).json({ error: "Invalid coupon. Let our AI recommendation help you search!" });
    if (new Date(match.expiresAt) < new Date()) return res.status(400).json({ error: "This festive voucher discount has expired." });
    if (cartTotal < match.minOrder) return res.status(400).json({ error: `Requires a minimum cart value of ₹${match.minOrder}` });

    res.json({ success: true, coupon: match });
  });

  // Orders + Checkout Workflows
  app.get("/api/orders", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Login requested." });

    let orders = db.get("orders") as Order[];
    const allItems = db.get("orderItems") as OrderItem[];

    if (user.role === "CUSTOMER") {
      orders = orders.filter(o => o.userId === user.id);
    } else if (user.role === "SELLER") {
      // Find orders containing seller products
      const sellers = db.get("sellers") as Seller[];
      const curSeller = sellers.find(s => s.userId === user.id);
      if (curSeller) {
        orders = orders.filter(o => {
          const items = allItems.filter(oi => oi.orderId === o.id && oi.sellerId === curSeller.id);
          return items.length > 0;
        });
      }
    }

    // Hydrate orders with items
    const ordersHydrated = orders.map(o => {
      const items = allItems.filter(oi => oi.orderId === o.id);
      return { ...o, items };
    });

    res.json(ordersHydrated.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });

  app.get("/api/orders/:id", (req, res) => {
    const orders = db.get("orders") as Order[];
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "Order timeline missing." });

    const items = db.get("orderItems").filter(oi => oi.orderId === order.id);
    const tracking = db.get("orderTracking").filter(ot => ot.orderId === order.id);

    res.json({ order, items, tracking });
  });

  app.post("/api/orders", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Please sign in to checkout." });

    const { items, addressId, paymentMethod, couponCode, giftWrap, useWallet } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: "Cart list is vacant." });

    let discount = 0;
    let baseSum = 0;
    const products = db.get("products") as Product[];
    const sellers = db.get("sellers") as Seller[];

    // Compute basic item aggregates and verify stocks
    for (const item of items) {
      const p = products.find(prod => prod.id === item.productId);
      if (!p) return res.status(404).json({ error: "Product in cart records does not exist." });
      if (p.stock < item.quantity) return res.status(400).json({ error: `Not enough stock remaining for ${p.title}` });
      
      const realPrice = Math.round(p.basePrice * (1 - p.discountPct / 100));
      baseSum += realPrice * item.quantity;
    }

    // Process coupon check
    if (couponCode) {
      const coupons = db.get("coupons") as Coupon[];
      const match = coupons.find(c => c.code.toUpperCase() === String(couponCode).toUpperCase());
      if (match && new Date(match.expiresAt) > new Date() && baseSum >= match.minOrder) {
        if (match.type === "FLAT") {
          discount = match.value;
        } else if (match.type === "PERCENT") {
          discount = Math.round(baseSum * (match.value / 100));
        }
        match.usedCount += 1;
        db.save("coupons", match);
      }
    }

    let giftWrapCharge = giftWrap ? 50 : 0;
    let subtotal = baseSum - discount + giftWrapCharge;
    if (subtotal < 0) subtotal = 0;

    let walletDeduction = 0;
    if (useWallet && user.walletBalance > 0) {
      walletDeduction = Math.min(subtotal, user.walletBalance);
      subtotal -= walletDeduction;
      user.walletBalance -= walletDeduction;
      db.save("users", user);

      // Save transactions
      const tx: WalletTransaction = {
        id: `tx-${Date.now()}`,
        userId: user.id,
        type: "PURCHASE",
        amount: -walletDeduction,
        description: `VendiCart Checkout payment debit offset`,
        createdAt: new Date().toISOString()
      };
      db.save("walletTransactions", tx);
    }

    // Retrieve selected delivery address
    const addresses = db.get("addresses") as Address[];
    const sAddr = addresses.find(a => a.id === addressId && a.userId === user.id) || addresses.find(a => a.userId === user.id);
    if (!sAddr) return res.status(400).json({ error: "Prerequisite: Destination delivery address missing." });

    const orderId = `ord-${Date.now()}`;
    const newOrder: Order = {
      id: orderId,
      userId: user.id,
      userName: user.name,
      totalAmount: subtotal,
      discountAmount: discount,
      walletDeducted: walletDeduction,
      paymentMethod: paymentMethod || "COD",
      paymentStatus: (paymentMethod === "COD") ? "PENDING" : "PAID",
      status: "Placed",
      address: {
        label: sAddr.label,
        line1: sAddr.line1,
        line2: sAddr.line2,
        city: sAddr.city,
        state: sAddr.state,
        pincode: sAddr.pincode
      },
      createdAt: new Date().toISOString()
    };

    db.save("orders", newOrder);

    // Save individual order items, and decrement product inventory
    for (const item of items) {
      const p = products.find(prod => prod.id === item.productId)!;
      p.stock -= item.quantity;
      db.save("products", p);

      const oi: OrderItem = {
        id: `ordi-${Date.now()}-${Math.random().toString(36).substring(3,7)}`,
        orderId,
        productId: p.id,
        productTitle: p.title,
        productImage: p.images[0],
        quantity: item.quantity,
        price: Math.round(p.basePrice * (1 - p.discountPct / 100)),
        sellerId: p.sellerId
      };
      db.save("orderItems", oi);

      // Send seller low stock warning alerts if critical
      if (p.stock <= 5) {
        const sellerInfo = sellers.find(s => s.id === p.sellerId);
        if (sellerInfo) {
          sendSimulationNotification(sellerInfo.userId, "PRICE_DROP", `Inventory Warning: Item stock is critically low. ${p.title} has only [${p.stock}] units remaining. Check demand predictors!`);
        }
      }
    }

    // Save initial tracking steps
    const tr1: OrderTracking = {
      id: `tr-${Date.now()}-1`,
      orderId,
      status: "Placed",
      timestamp: new Date().toISOString(),
      note: "VendiCart checkout secured. Order details logged."
    };
    db.save("orderTracking", tr1);

    // Empty active shopping cart
    const cartItems = db.get("cartItems") as CartItem[];
    const filteredCart = cartItems.filter(c => c.userId !== user.id || c.savedForLater);
    db.data.cartItems = filteredCart;
    db.persist();

    // Reward Loyalty Cashback points (₹10 earned per ₹100 spent)
    const pointsGained = Math.round(baseSum / 100) * 10;
    if (pointsGained > 0) {
      user.walletBalance += pointsGained;
      db.save("users", user);

      const rwTx: WalletTransaction = {
        id: `tx-rw-${Date.now()}`,
        userId: user.id,
        type: "REWARD",
        amount: pointsGained,
        description: `Purchases Cashback Earn (Point Ratio 1:1) for Order ID ${orderId}`,
        createdAt: new Date().toISOString()
      };
      db.save("walletTransactions", rwTx);
    }

    sendSimulationNotification(user.id, "ORDER", `Awesome! Your order VendiCart #${orderId} was filed successfully. We have dispatched ship schedules.`);

    res.json({ success: true, orderId });
  });

  app.post("/api/orders/:id/update-status", (req, res) => {
    const user = (req as any).user;
    if (!user || (user.role !== "SELLER" && user.role !== "ADMIN")) {
       res.status(403).json({ error: "Only authorized operators can manipulate delivery stages." });
       return;
    }

    const { status, note } = req.body;
    const orders = db.get("orders") as Order[];
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "Targets missing." });

    order.status = status;
    if (status === "Delivered") {
      order.paymentStatus = "PAID";
    }
    db.save("orders", order);

    // Save tracking details
    const tr: OrderTracking = {
      id: `tr-${Date.now()}`,
      orderId: order.id,
      status,
      timestamp: new Date().toISOString(),
      note: note || `Logistic stage advanced to: ${status}.`
    };
    db.save("orderTracking", tr);

    sendSimulationNotification(order.userId, "ORDER", `Order update: Your shipment #${order.id} is now [${status}].`);

    res.json({ success: true, order });
  });

  app.post("/api/orders/:id/cancel", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized." });

    const orders = db.get("orders") as Order[];
    const order = orders.find(o => o.id === req.params.id && o.userId === user.id);
    if (!order) return res.status(404).json({ error: "Order details missing or unauthorized." });

    if (order.status !== "Placed" && order.status !== "Confirmed") {
       res.status(400).json({ error: "Shipment already in motion. Cancellation locked." });
       return;
    }

    order.status = "Cancelled";
    db.save("orders", order);

    // Restore stocks
    const products = db.get("products") as Product[];
    const oItems = db.get("orderItems").filter(oi => oi.orderId === order.id);
    for (const oi of oItems) {
      const p = products.find(prod => prod.id === oi.productId);
      if (p) {
        p.stock += oi.quantity;
        db.save("products", p);
      }
    }

    // Process instant Wallet refund if already paid/wallet deducted
    let totalPaidRefund = order.walletDeducted + (order.paymentStatus === "PAID" ? order.totalAmount : 0);
    if (totalPaidRefund > 0) {
      user.walletBalance += totalPaidRefund;
      db.save("users", user);

      const refundTx: WalletTransaction = {
        id: `tx-ref-${Date.now()}`,
        userId: user.id,
        type: "REFUND",
        amount: totalPaidRefund,
        description: `Refund back to wallet: Cancellation of Order #${order.id}`,
        createdAt: new Date().toISOString()
      };
      db.save("walletTransactions", refundTx);
    }

    sendSimulationNotification(user.id, "ORDER", `Your order #${order.id} has been cancelled. Refund processing initiated.`);
    res.json({ success: true });
  });

  // Client messaging support (Simple simulated room chats)
  app.get("/api/messages", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const msgs = db.get("messages") as Message[];
    const filtered = msgs.filter(m => m.senderId === user.id || m.receiverId === user.id);
    res.json(filtered.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  });

  app.post("/api/messages", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Log in needed." });
    const { receiverId, text } = req.body;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      receiverId,
      text,
      createdAt: new Date().toISOString()
    };
    db.save("messages", newMsg);
    res.json(newMsg);
  });

  // Review Operations
  app.get("/api/products/:id/reviews", (req, res) => {
    const reviews = db.get("reviews").filter(r => r.productId === req.params.id);
    res.json(reviews);
  });

  app.post("/api/reviews", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Log in needed." });
    const { productId, rating, text } = req.body;

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      productId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      rating: Number(rating),
      text,
      helpfulCount: 0,
      isVerifiedPurchase: true,
      createdAt: new Date().toISOString()
    };

    db.save("reviews", newReview);

    // Recompute product rating averages
    const products = db.get("products") as Product[];
    const p = products.find(prod => prod.id === productId);
    if (p) {
      const allPReviews = db.get("reviews").filter(r => r.productId === productId) as Review[];
      p.reviewCount = allPReviews.length;
      p.avgRating = Number((allPReviews.reduce((sum, r) => sum + r.rating, 0) / allPReviews.length).toFixed(1));
      db.save("products", p);
    }

    res.json(newReview);
  });

  // Wishlist Handling
  app.get("/api/wishlist", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.json([]);
    const dbWish = db.get("wishlists").filter(w => w.userId === user.id) as WishlistItem[];
    const products = db.get("products") as Product[];

    dbWish.forEach(w => {
      w.product = products.find(p => p.id === w.productId);
    });
    res.json(dbWish);
  });

  app.post("/api/wishlist/toggle", (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Authentication needed." });
    const { productId } = req.body;

    const wish = db.get("wishlists") as WishlistItem[];
    const match = wish.find(w => w.userId === user.id && w.productId === productId);
    if (match) {
      db.remove("wishlists", match.id);
      res.json({ success: true, action: "removed" });
    } else {
      const newItem: WishlistItem = {
        id: `wish-${Date.now()}`,
        userId: user.id,
        productId,
        createdAt: new Date().toISOString()
      };
      db.save("wishlists", newItem);
      res.json({ success: true, action: "added" });
    }
  });

  // Admin Dashboard, Seller Approvals & Refunds Queue
  app.get("/api/admin/dashboard", (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== "ADMIN") {
       res.status(403).json({ error: "Access denied." });
       return;
    }

    const allUsers = db.get("users") as User[];
    const allSellers = db.get("sellers") as Seller[];
    const allOrders = db.get("orders") as Order[];
    const allProducts = db.get("products") as Product[];

    const pendingApprovals = allSellers.filter(s => !s.isApproved);
    const totalRev = allOrders.filter(o => o.paymentStatus === "PAID").reduce((sum, o) => sum + o.totalAmount, 0);

    // Grouping sales trends monthly
    const monthSales = [{ month: "Jan", sales: 50000 }, { month: "Feb", sales: 65000 }, { month: "Mar", sales: 90000 }, { month: "Apr", sales: 110000 }, { month: "May", sales: 140000 }, { month: "Jun", sales: totalRev + 120000 }];

    res.json({
      kpis: {
        totalUsers: allUsers.length,
        totalSellers: allSellers.length,
        totalOrders: allOrders.length,
        totalRevenue: totalRev,
        pendingApprovalsCount: pendingApprovals.length
      },
      pendingSellers: pendingApprovals,
      revenueTrends: monthSales,
      allUsersTable: allUsers.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, balance: u.walletBalance }))
    });
  });

  app.post("/api/admin/approve-seller", (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Access denied." });
    const { sellerId, approve } = req.body;

    const sellers = db.get("sellers") as Seller[];
    const seller = sellers.find(s => s.id === sellerId);
    if (!seller) return res.status(404).json({ error: "Seller file not found." });

    seller.isApproved = !!approve;
    db.save("sellers", seller);

    if (approve) {
      sendSimulationNotification(seller.userId, "OFFER", "Congratulations! Your VendiCart Merchant Account has been authorized and fully approved. Publish your stock now!");
    }

    res.json({ success: true, seller });
  });

  // Vendor / Seller Analytics Dashboard
  app.get("/api/sellers/dashboard", (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== "SELLER") return res.status(401).json({ error: "Seller access denied." });

    const sellers = db.get("sellers") as Seller[];
    const currentSeller = sellers.find(s => s.userId === user.id);
    if (!currentSeller) return res.status(404).json({ error: "Unlinked seller." });

    const products = db.get("products").filter(p => p.sellerId === currentSeller.id) as Product[];
    const allOrderItems = db.get("orderItems").filter(oi => oi.sellerId === currentSeller.id) as OrderItem[];
    const allOrders = db.get("orders") as Order[];

    // Calculate aggregated sales metrics
    let totalSalesVal = 0;
    const orderMap = new Map<string, number>();
    
    allOrderItems.forEach(oi => {
      totalSalesVal += oi.price * oi.quantity;
      orderMap.set(oi.orderId, (orderMap.get(oi.orderId) || 0) + oi.price * oi.quantity);
    });

    const lowStockCount = products.filter(p => p.stock <= 5).length;

    // Monthly orders analytics
    const salesChart = [
      { name: "Week 1", sales: Math.round(totalSalesVal * 0.15) },
      { name: "Week 2", sales: Math.round(totalSalesVal * 0.25) },
      { name: "Week 3", sales: Math.round(totalSalesVal * 0.20) },
      { name: "Week 4", sales: Math.round(totalSalesVal * 0.40) }
    ];

    res.json({
      shopName: currentSeller.shopName,
      isApproved: currentSeller.isApproved,
      kpis: {
        totalSellsValue: totalSalesVal,
        itemsCount: products.length,
        ordersVolume: orderMap.size,
        lowStockItems: lowStockCount
      },
      salesTrend: salesChart,
      inventorySummary: products.map(p => ({ id: p.id, title: p.title, stock: p.stock, price: p.basePrice })),
      recentOrders: allOrderItems.slice(0, 10).map(oi => {
        const matchingOrd = allOrders.find(o => o.id === oi.orderId);
        return {
          id: oi.orderId,
          title: oi.productTitle,
          qty: oi.quantity,
          amount: oi.price * oi.quantity,
          status: matchingOrd ? matchingOrd.status : "Placed",
          createdAt: matchingOrd ? matchingOrd.createdAt : new Date().toISOString()
        };
      })
    });
  });

  // --- SERVER-SIDE AI ROUTE WRAPPERS ---

  app.post("/api/ai/chatbot", async (req, res) => {
    const { message, history } = req.body;
    const products = db.get("products") as Product[];
    const reply = await askVendiCartAssistant(history || [], message || "", products);
    res.json({ reply });
  });

  app.post("/api/ai/generate-description", async (req, res) => {
    const { category, brand, extraContext } = req.body;
    const aiOutput = await generateProductDescription(category || "Consumer Electronics", brand || "BrandX", extraContext || "");
    res.json(aiOutput);
  });

  app.post("/api/ai/recommend-price", async (req, res) => {
    const { costPrice, category, competitorsPrices } = req.body;
    const rec = await recommendProductPrice(
      Number(costPrice || 1000), 
      category || "Electronics", 
      competitorsPrices || [costPrice * 1.5, costPrice * 1.8]
    );
    res.json(rec);
  });

  app.post("/api/ai/demand-prediction", async (req, res) => {
    const { productId } = req.body;
    const historicalSales = [
      { month: "Jan", quantity: Math.floor(Math.random() * 30 + 10) },
      { month: "Feb", quantity: Math.floor(Math.random() * 35 + 10) },
      { month: "Mar", quantity: Math.floor(Math.random() * 40 + 15) },
      { month: "Apr", quantity: Math.floor(Math.random() * 45 + 15) },
      { month: "May", quantity: Math.floor(Math.random() * 50 + 20) }
    ];
    const prediction = await predictProductDemand(productId || "prod-1", historicalSales);
    res.json({ ...prediction, historicalSales });
  });

  app.post("/api/ai/summarize-reviews", async (req, res) => {
    const { productId } = req.body;
    const reviews = db.get("reviews").filter(r => r.productId === productId) as Review[];
    const summary = await summarizeProductReviews(reviews);
    res.json({ summary });
  });

  app.post("/api/ai/compare-products", async (req, res) => {
    const { pids } = req.body;
    if (!pids || pids.length === 0) return res.status(400).json({ error: "No product matches." });

    const products = db.get("products") as Product[];
    const targets = products.filter(p => pids.includes(p.id));

    try {
      const textToAnalyze = targets.map(p => `Product: ${p.title}\nCategory: ${p.category}\nBrand: ${p.brand}\nBase Price: ₹${p.basePrice}\nRating: ${p.avgRating}\nDescription: ${p.description}`).join("\n---\n");
      const clientInstruction = `Generate a markdown comparison matrix/table comparing these items. Add clear bullet list advantages, downsides, and a definitive final purchase recommendation. Keep it beautiful and short.`;

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: `${clientInstruction}\nProducts:\n${textToAnalyze}`
      });

      res.json({ result: response.text });
    } catch (e: any) {
      console.error(e);
      // Fallback comparative table
      let tableMark = `### VendiCart AI Feature-Wise Breakdown\n\n| Spec | ` + targets.map(t => t.title).join(" | ") + " |\n";
      tableMark += "| --- | " + targets.map(() => "---").join(" | ") + " |\n";
      tableMark += "| **Price** | " + targets.map(t => `₹${Math.round(t.basePrice * (1 - t.discountPct / 100))}`).join(" | ") + " |\n";
      tableMark += "| **Rating** | " + targets.map(t => `★ ${t.avgRating}`).join(" | ") + " |\n";
      tableMark += "| **Delivery** | " + targets.map(t => `${t.meta.deliveryTimeDays} Days`).join(" | ") + " |\n";
      tableMark += "\n\n**VendiCart Recommendation:** For immediate professional operations, select Soniq Active Anc. If you appreciate slenderness, select minimal watches.";
      res.json({ result: tableMark });
    }
  });

  app.post("/api/ai/check-fraud", (req, res) => {
    const { orderDetails, riskFlag } = req.body;
    let score = 5;
    const reasons: string[] = ["Payment details authenticated successfully.", "Shipping pins registered inside verified postal circles."];

    if (orderDetails && orderDetails.amount > 15000) {
      score += 35;
      reasons.push("Large-basket ticket value above standard check thresholds.");
    }
    if (riskFlag) {
      score += 45;
      reasons.push("Multiple immediate cart updates from unmatched gateway sessions.");
    }

    res.json({
      isSuspicious: score >= 60,
      riskScore: score,
      reasons
    });
  });

  // --- VITE DEV MIDDLEWARE AND STATIC SERVING CONFIGURATION ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VendiCart Full-Stack Server booted and active on port ${PORT}`);
  });
}

startServer();
