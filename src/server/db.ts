import fs from "fs";
import path from "path";
import { 
  User, Seller, Product, Category, Order, OrderItem, 
  OrderTracking, Review, CartItem, Address, Coupon, 
  Notification, WalletTransaction, WishlistItem, Message, OTP 
} from "../types";

const DB_FILE = path.join(process.cwd(), "db.json");

export interface DatabaseSchema {
  users: User[];
  sellers: Seller[];
  products: Product[];
  categories: Category[];
  orders: Order[];
  orderItems: OrderItem[];
  orderTracking: OrderTracking[];
  reviews: Review[];
  cartItems: CartItem[];
  addresses: Address[];
  coupons: Coupon[];
  notifications: Notification[];
  walletTransactions: WalletTransaction[];
  wishlists: WishlistItem[];
  messages: Message[];
  otps: OTP[];
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Electronics", slug: "electronics", imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=300&q=80" },
  { id: "cat-2", name: "Fashion", slug: "fashion", imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=300&q=80" },
  { id: "cat-3", name: "Home & Living", slug: "home-living", imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80" },
  { id: "cat-4", name: "Grocery & Organic", slug: "grocery", imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80" },
  { id: "cat-5", name: "Sports & Outdoors", slug: "sports-outdoors", imageUrl: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=300&q=80" }
];

export class Database {
  public data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        return JSON.parse(fileContent);
      } catch (err) {
        console.error("Failed to parse db.json, resetting to default seed data", err);
      }
    }
    const seeded = this.getSeedData();
    this.saveData(seeded);
    return seeded;
  }

  private saveData(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to write to db.json", err);
    }
  }

  public persist() {
    this.saveData(this.data);
  }

  // Getters for collection access
  public get(collection: keyof DatabaseSchema): any[] {
    return this.data[collection] || [];
  }

  // Save/Upsert handlers
  public save(collection: keyof DatabaseSchema, item: any) {
    const list = this.data[collection] as any[];
    const idx = list.findIndex(i => i.id === item.id);
    if (idx > -1) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    this.persist();
  }

  public remove(collection: keyof DatabaseSchema, id: string) {
    const list = this.data[collection] as any[];
    this.data[collection] = list.filter(i => i.id !== id) as any;
    this.persist();
  }

  private getSeedData(): DatabaseSchema {
    const now = new Date().toISOString();

    // 1. Core Users with demo-credential matching passwords (hashed simply by string check here)
    const users: User[] = [
      {
        id: "usr-admin",
        name: "VendiCart System Admin",
        email: "admin@demo.com",
        passwordHash: "Demo@1234", // Simple comparison representation
        role: "ADMIN",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        isVerified: true,
        walletBalance: 25000,
        createdAt: now
      },
      {
        id: "usr-seller-1",
        name: "Cosmic Gadgets Inc.",
        email: "seller@demo.com",
        passwordHash: "Demo@1234",
        role: "SELLER",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        isVerified: true,
        walletBalance: 12000,
        createdAt: now
      },
      {
        id: "usr-seller-2",
        name: "Threads Velvet Shop",
        email: "seller2@demo.com",
        passwordHash: "Demo@1234",
        role: "SELLER",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
        isVerified: true,
        walletBalance: 4500,
        createdAt: now
      },
      {
        id: "usr-customer",
        name: "Vikram Sharma (Customer)",
        email: "customer@demo.com",
        passwordHash: "Demo@1234",
        role: "CUSTOMER",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
        isVerified: true,
        walletBalance: 5000,
        createdAt: now
      }
    ];

    // 2. Sellers Setup
    const sellers: Seller[] = [
      {
        id: "sel-cosmic",
        userId: "usr-seller-1",
        shopName: "Cosmic Gadgets",
        description: "Official flag-store for VendiCart tech gear, premium headphones, chargers, and mechanical hardware.",
        logo: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=200&q=80",
        isApproved: true,
        bankDetails: { accountNumber: "918273645012", bankName: "HDFC Bank", ifsc: "HDFC0001234" },
        createdAt: now
      },
      {
        id: "sel-threads",
        userId: "usr-seller-2",
        shopName: "Threads Velvet",
        description: "Artisanal modern streetwear, high contrast activewear, and handcrafted chronological accents.",
        logo: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=200&q=80",
        isApproved: true,
        bankDetails: { accountNumber: "102938475610", bankName: "ICICI Bank", ifsc: "ICIC0005678" },
        createdAt: now
      }
    ];

    // 3. Realistic Products Seeding (10 curated luxury/everyday multi-vendor products)
    const products: Product[] = [
      {
        id: "prod-1",
        sellerId: "sel-cosmic",
        title: "ProSound Max Hybrid ANC Headphones",
        description: "Unparalleled listening clarity. Engineered with 40mm customizable neodymium dynamic drivers, active hybrid noise cancellation (ANC), 45-hour playback runtime, and ultra-comfortable memory foam leather cushions.",
        category: "Electronics",
        brand: "Soniq",
        basePrice: 5999,
        discountPct: 15,
        stock: 45,
        sku: "SNQ-HP-001",
        images: [
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=600&q=80"
        ],
        avgRating: 4.8,
        reviewCount: 3,
        meta: {
          deliveryTimeDays: 2,
          warrantyInfo: "1 Year International Brand Warranty",
          returnPolicy: "7 Days Instant Return & Refund",
          seoKeywords: ["headphones", "anc", "wireless", "soniq", "bluetooth headphones"]
        },
        createdAt: now
      },
      {
        id: "prod-2",
        sellerId: "sel-threads",
        title: "VendiCart Minimalist Obsidian Chrono Watch",
        description: "Timeless luxury combined with structural minimalism. Featuring a Japanese Miyota quartz movement, scratch-resistant sapphire crystal glass, matte obsidian dark-steel link bracelet, and 50m water-proofing.",
        category: "Fashion",
        brand: "VendiCart",
        basePrice: 8999,
        discountPct: 20,
        stock: 12,
        sku: "ELY-WAT-102",
        images: [
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=600&q=80"
        ],
        avgRating: 4.5,
        reviewCount: 2,
        meta: {
          deliveryTimeDays: 3,
          warrantyInfo: "2 Years VendiCart Manufacture Warranty",
          returnPolicy: "10 Days Return Policy",
          seoKeywords: ["luxury watch", "minimalist watch", "mens watch", "obsidian watch"]
        },
        createdAt: now
      },
      {
        id: "prod-3",
        sellerId: "sel-threads",
        title: "AeroGrip Elite Carbon Running Shoes",
        description: "Engineered ultra-light knit running sneakers. Packed with custom responsive carbon plate geometry, Aerofoam responsive cushioning, and durable high-traction rubber waffle treads for high speed marathon racing.",
        category: "Sports & Outdoors",
        brand: "Aero",
        basePrice: 4299,
        discountPct: 10,
        stock: 30,
        sku: "AER-RN-99",
        images: [
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=600&q=80"
        ],
        avgRating: 4.2,
        reviewCount: 3,
        meta: {
          deliveryTimeDays: 4,
          warrantyInfo: "6 Months Athletic Performance Warranty",
          returnPolicy: "7 Days Free Size Replacement",
          seoKeywords: ["shoes", "running shoes", "marathon spikes", "sneakers"]
        },
        createdAt: now
      },
      {
        id: "prod-4",
        sellerId: "sel-cosmic",
        title: "VaporCharge 65W GaN Rapid Charger",
        description: "Power everything from laptops to smartphones. Uses advanced Gallium Nitride (GaN) microchips for cooler, 3x faster compact charging with 2x Type-C and 1x USB-A ports supporting PD 3.0 and QC 4.0.",
        category: "Electronics",
        brand: "Ankertech",
        basePrice: 2499,
        discountPct: 30,
        stock: 120,
        sku: "ANK-GAN-65",
        images: [
          "https://images.unsplash.com/photo-1622445262465-2481c4574875?auto=format&fit=crop&w=600&q=80"
        ],
        avgRating: 4.6,
        reviewCount: 25,
        meta: {
          deliveryTimeDays: 1,
          warrantyInfo: "18 Months Replacement Lock",
          returnPolicy: "7 Days Replacement Only",
          seoKeywords: ["fast charger", "65w charger", "gan charger", "type c adapter"]
        },
        createdAt: now
      },
      {
        id: "prod-5",
        sellerId: "sel-cosmic",
        title: "ChefCraft Smart High-Precision Air Fryer",
        description: "Delicious healthy cooking with 90% less oil. Built on 360-circulation rapid forced air heating, interactive precise touchscreen display, and a 5.5L non-stick dishwashable mesh basket.",
        category: "Home & Living",
        brand: "ChefCraft",
        basePrice: 7999,
        discountPct: 25,
        stock: 18,
        sku: "CC-AF-550",
        images: [
          "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&w=600&q=80"
        ],
        avgRating: 4.7,
        reviewCount: 15,
        meta: {
          deliveryTimeDays: 3,
          warrantyInfo: "2 Years Motor Warranty",
          returnPolicy: "7 Days Refundable Warranty",
          seoKeywords: ["air fryer", "smart cooking", "kitchen appliances"]
        },
        createdAt: now
      },
      {
        id: "prod-6",
        sellerId: "sel-threads",
        title: "Premium Ceremonial Matcha Green Tea",
        description: "100% stone-ground first harvest shade-grown Japanese Uji matcha. Incredible vibrant green color, sweet delicate umami flavor profile. Rich in natural L-theanine and antioxidants.",
        category: "Grocery & Organic",
        brand: "UjiZen",
        basePrice: 1599,
        discountPct: 5,
        stock: 80,
        sku: "ZEN-MCH-100",
        images: [
          "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80"
        ],
        avgRating: 4.9,
        reviewCount: 12,
        meta: {
          deliveryTimeDays: 2,
          warrantyInfo: "Freshness Guaranteed Expiry 2028",
          returnPolicy: "Returnable if sealed/unopened",
          seoKeywords: ["matcha", "organic green tea", "japanese matcha", "ceremonial powder"]
        },
        createdAt: now
      }
    ];

    // Seed product-variants
    const product_variants = [
      { id: "var-1a", productId: "prod-1", color: "Obsidian Black", size: "Standard", price: 5999, stock: 25, imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80" },
      { id: "var-1b", productId: "prod-1", color: "Crimson Red", size: "Standard", price: 6199, stock: 20, imageUrl: "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=600&q=80" },
      { id: "var-2a", productId: "prod-2", color: "Matte Black", size: "40mm", price: 8999, stock: 6 },
      { id: "var-2b", productId: "prod-2", color: "Gold Quartz", size: "40mm", price: 9499, stock: 6 },
      { id: "var-3a", productId: "prod-3", color: "Carbon Black", size: "UK 8", price: 4299, stock: 15 },
      { id: "var-3b", productId: "prod-3", color: "Carbon Black", size: "UK 10", price: 4299, stock: 15 }
    ];

    // Hydrate seeded variants inside products list purely for state consistency
    products.forEach(p => {
      p.variants = product_variants.filter(v => v.productId === p.id);
    });

    // 4. Initial Addresses
    const addresses: Address[] = [
      {
        id: "addr-1",
        userId: "usr-customer",
        label: "Home",
        line1: "Flat 402, Shiv-Shakti Apartments",
        line2: "Sector 19, Dwarka",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110075",
        isDefault: true
      },
      {
        id: "addr-2",
        userId: "usr-customer",
        label: "Office",
        line1: "Building 4, DLF Cyber City",
        line2: "DLF Phase III",
        city: "Gurugram",
        state: "Haryana",
        pincode: "122002",
        isDefault: false
      }
    ];

    // 5. Rich Verified Customer Reviews
    const reviews: Review[] = [
      {
        id: "rev-1",
        productId: "prod-1",
        userId: "usr-customer",
        userName: "Vikram Sharma",
        userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
        rating: 5,
        text: "Incredible sound signature! The Hybrid Active Noise Cancelling isolates nearly all street traffic and laptop fan hiss. Battery life easily pushes past 40 hours. Phenomenal high-frequency acoustic space.",
        helpfulCount: 15,
        isVerifiedPurchase: true,
        createdAt: now
      },
      {
        id: "rev-2",
        productId: "prod-1",
        userId: "usr-admin",
        userName: "Deepika Patel",
        rating: 4.6,
        text: "The audio separation is brilliant, extremely clear mids. Comfort on ear cups is pristine even after a long day of coding. Highly recommended value.",
        helpfulCount: 4,
        isVerifiedPurchase: true,
        createdAt: now
      },
      {
        id: "rev-3",
        productId: "prod-2",
        userId: "usr-customer",
        userName: "Vikram Sharma",
        rating: 5,
        text: "A beautiful minimalist dress watch. Extremely slender, obsidian look blends flawlessly into executive outfits. High construction grade.",
        helpfulCount: 8,
        isVerifiedPurchase: true,
        createdAt: now
      }
    ];

    // 6. Active Platform Coupons (FLAT, PERCENT, etc.)
    const coupons: Coupon[] = [
      {
        id: "coup-welcome",
        code: "WELCOME100",
        type: "FLAT",
        value: 100,
        minOrder: 500,
        maxUses: 1000,
        usedCount: 12,
        expiresAt: "2028-12-31T23:59:59.000Z",
        sellerId: null // Platform-wide
      },
      {
        id: "coup-festive20",
        code: "FESTIVE20",
        type: "PERCENT",
        value: 20,
        minOrder: 1500,
        maxUses: 500,
        usedCount: 22,
        expiresAt: "2028-12-31T23:59:59.000Z",
        sellerId: null
      },
      {
        id: "coup-cosmicfree",
        code: "COSMICSUPER",
        type: "FREE_SHIPPING",
        value: 50,
        minOrder: 1000,
        maxUses: 200,
        usedCount: 5,
        expiresAt: "2028-11-30T23:59:59.000Z",
        sellerId: "sel-cosmic" // Custom store coupon
      }
    ];

    // 7. Core Wallet Transaction Setup
    const walletTransactions: WalletTransaction[] = [
      {
        id: "trans-1",
        userId: "usr-customer",
        type: "DEPOSIT",
        amount: 4000,
        description: "UPI Autoload via PhonePe",
        createdAt: now
      },
      {
        id: "trans-2",
        userId: "usr-customer",
        type: "CASHBACK",
        amount: 1000,
        description: "Welcome Promo Sign-up Rewards Credit",
        createdAt: now
      }
    ];

    // 8. Notifications
    const notifications: Notification[] = [
      {
        id: "notif-1",
        userId: "usr-customer",
        type: "OFFER",
        message: "VendiCart Onboarding complete! We've credited ₹1,000 promo credit to your wallet balance.",
        isRead: false,
        createdAt: now
      }
    ];

    // 9. Simple baseline orders/order items to render historic charts out of the box
    const orders: Order[] = [
      {
        id: "ord-9901",
        userId: "usr-customer",
        userName: "Vikram Sharma",
        totalAmount: 5199,
        discountAmount: 100,
        walletDeducted: 0,
        paymentMethod: "STRIPE",
        paymentStatus: "PAID",
        status: "Delivered",
        address: {
          label: "Home",
          line1: "Flat 402, Shiv-Shakti Apartments",
          city: "New Delhi",
          state: "Delhi",
          pincode: "110075"
        },
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() // 30 days ago
      },
      {
        id: "ord-9902",
        userId: "usr-customer",
        userName: "Vikram Sharma",
        totalAmount: 1424,
        discountAmount: 175,
        walletDeducted: 400,
        paymentMethod: "COD",
        paymentStatus: "PENDING",
        status: "Shipped",
        address: {
          label: "Home",
          line1: "Flat 402, Shiv-Shakti Apartments",
          city: "New Delhi",
          state: "Delhi",
          pincode: "110075"
        },
        createdAt: new Date().toISOString()
      }
    ];

    const orderItems: OrderItem[] = [
      {
        id: "ordi-1",
        orderId: "ord-9901",
        productId: "prod-1",
        productTitle: "ProSound Max Hybrid ANC Headphones",
        productImage: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
        quantity: 1,
        price: 5099,
        sellerId: "sel-cosmic"
      },
      {
        id: "ordi-2",
        orderId: "ord-9902",
        productId: "prod-6",
        productTitle: "Premium Ceremonial Matcha Green Tea",
        productImage: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
        quantity: 1,
        price: 1519,
        sellerId: "sel-threads"
      }
    ];

    const orderTracking: OrderTracking[] = [
      { id: "tr-1", orderId: "ord-9901", status: "Placed", timestamp: now, note: "Order placed on VendiCart Applet portal successfully" },
      { id: "tr-2", orderId: "ord-9901", status: "Confirmed", timestamp: now, note: "Seller approved order specifications and packed details" },
      { id: "tr-3", orderId: "ord-9901", status: "Shipped", timestamp: now, note: "Handed over to blue-wing courier logs" },
      { id: "tr-4", orderId: "ord-9901", status: "Delivered", timestamp: now, note: "Handover signed by Vikram Sharma at Dwarka flat entry" },
      { id: "tr-5", orderId: "ord-9902", status: "Placed", timestamp: now, note: "Order placed successfully" },
      { id: "tr-6", orderId: "ord-9902", status: "Confirmed", timestamp: now, note: "Seller packed and generated barcode details" },
      { id: "tr-7", orderId: "ord-9902", status: "Shipped", timestamp: now, note: "Shipped in transit from national freight depot" }
    ];

    const messages: Message[] = [
      {
        id: "msg-1",
        senderId: "usr-customer",
        receiverId: "usr-seller-1",
        text: "Hello! Is the Obsidian color matte finish or glossy?",
        createdAt: now
      },
      {
        id: "msg-2",
        senderId: "usr-seller-1",
        receiverId: "usr-customer",
        text: "Hi Vikram! The obsidian black features a premium matte brushed-steel finish, highly scratch resistant. Let us know if you wish to customized linking bands!",
        createdAt: now
      }
    ];

    return {
      users,
      sellers,
      products,
      categories: DEFAULT_CATEGORIES,
      orders,
      orderItems,
      orderTracking,
      reviews,
      cartItems: [],
      addresses,
      coupons,
      notifications,
      walletTransactions,
      wishlists: [],
      messages,
      otps: []
    };
  }
}

export const db = new Database();
