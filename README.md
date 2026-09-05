# Revenue Pilot AI

> **AI-Native Commerce Platform that turns Customer Intent into Merchant Revenue.**  
> Built for the **Razorpay AI Commerce Innovation Challenge**.

---

## 🌟 Overview & Problem Statement

Traditional e-commerce search is rigid and transactional:
$$\text{Keyword Search} \longrightarrow \text{Static Product Grid} \longrightarrow \text{Single-Item Cart} \longrightarrow \text{Low AOV}$$

Customers think in **goals, occasions, and visual references** (*"I need a birthday cake for 10 people under ₹1,500"* or uploading a sneaker photo asking *"Do you have something like this under ₹3,000?"*), while merchants struggle with low basket sizes, cart abandonment, and margin erosion from untargeted discounting.

**Revenue Pilot AI** transforms this experience into a modern, **ChatGPT-style multimodal conversational commerce agent**:
$$\text{Customer Goal} \longrightarrow \text{AI Intent \& Vision} \longrightarrow \text{Live Catalog Grounding} \longrightarrow \text{Budget-Bounded Basket} \longrightarrow \text{Razorpay Checkout}$$

---

## 🏗️ System Architecture

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           CUSTOMER MULTIMODAL INTERFACE                           │
│     [ 🎤 Web Speech API ]       [ 🖼️ Vision Image Upload ]       [ 💬 Text Chat ]  │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                         AI INTENT & VISION PIPELINE                               │
│  • Stage 1 Vision AI: Structured Visual Extraction (Category, Color, Style)       │
│  • Speech-to-Text: Native Web Speech API with Live Dictation & Indian English     │
│  • Positional Memory Resolver ("Add the 2nd one" → Index 1)                       │
│  • Budget Constraint & Occasion Extractor ("under ₹1,000")                        │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                     MERCHANT CATALOG GROUNDING (SQLite)                           │
│  • Multi-Tenant Isolation (Celebration Cakes, StepWalk Shoes, TechStore Pro)      │
│  • Strict Exact Product IDs (Zero random fallbacks / Zero fake products)          │
│  • Basket Builder: Primary Item + Complementary Add-ons (Bounded by Budget)      │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        CART & REAL-WORLD CHECKOUT FLOW                            │
│  • 1-Click "Add Complete Bundle" or "Add That One"                                │
│  • Delivery Address Management & Validation (Pin code, Area, City, State)         │
│  • Order Summary & Server-Authoritative Price Calculation                         │
│  • Payment Methods: Cash on Delivery (COD) & Razorpay Test Gateway                │
│  • Cryptographic Razorpay Signature Verification & Stock Management              │
│  • Failure Recovery (Preserves cart if payment cancelled or timed out)            │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                      MERCHANT INNOVATION LAB & ANALYTICS                          │
│  • Intent → Revenue Signals (Searches that convert to multi-item baskets)         │
│  • Smart Discount & Margin-Safe Campaign Engine                                   │
│  • What-If Revenue Simulator (Conversion vs. Discount Curve)                      │
│  • Real-Time Audit Trail Logging (Actor, Action, Reason, Modality)                │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Features

### 1. Multimodal Conversational Shopping
- **ChatGPT-Style Voice Input**: Speak directly via your microphone using browser-native Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`). Progressive interim dictation streams into the input box and normalizes spoken numbers (e.g., *"under one thousand rupees"* $\rightarrow$ `₹1,000`).
- **Decoupled Vision Image Search**: Upload a product photo or screenshot. Stage 1 extracts structured visual attributes (`object`, `category`, `colors`, `style`, `visual_features`), and Stage 2 searches the real merchant catalog.
- **Strict Grounding Fallback**: If an image contains out-of-catalog items (e.g., police vehicle, watch, nail polish), the AI clearly informs the user without fabricating fake products.
- **Multimodal Combinations**: Upload an image + speak or type budget constraints (e.g., photo of sneakers + *"Find something like this under ₹3,000"*).

### 2. Contextual Memory & Positional Grounding
- Seamlessly resolves conversational references:
  - *"Show chocolate ones"* $\rightarrow$ Filters previous search results.
  - *"Which one is best?"* $\rightarrow$ Generates comparison matrix of currently displayed options.
  - *"Add the second one"* $\rightarrow$ Maps ordinal `2nd` to index `1` in active search results and adds exact `product_id` to cart.
  - *"Add that one to my cart"* $\rightarrow$ Adds primary displayed product with exact ID.

### 3. Complete Real-World Checkout Flow
- **Product Discovery** $\rightarrow$ **Product Details** $\rightarrow$ **Add to Cart** $\rightarrow$ **Delivery Address** $\rightarrow$ **Order Summary** $\rightarrow$ **Payment Selection** $\rightarrow$ **Payment Verification** $\rightarrow$ **Order Confirmation**.
- **Payment Options**:
  - **Razorpay Test Gateway**: Encrypted card/UPI/net-banking checkout with server-side HMAC-SHA256 signature verification.
  - **Cash on Delivery (COD)**: Places order in `PENDING` payment state without charging or marking paid prematurely.
- **Cart Safety & Inventory Protection**: Preserves cart if payment fails or is aborted. Deducts stock atomically on verified completion.

### 4. Merchant Innovation Lab & Multi-Tenant Isolation
- **Strict Multi-Tenant Isolation**: Merchants can only access and manage their own products, orders, customers, and revenue.
- **Smart Discount Engine**: Evaluates cart abandonment and inventory velocity to recommend margin-safe discounts.
- **What-If Revenue Simulator**: Models projected orders, customer savings, and merchant basket uplift.
- **1-Click Campaign Approval**: Merchants can review, approve, or reject AI discount strategies.

---

## 💻 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Lucide React, Vanilla CSS | Fast, minimal ChatGPT-style conversational UI |
| **Backend** | Node.js, Express | RESTful APIs, Session resolution, Multimodal orchestration |
| **Database** | SQLite (`node:sqlite` / `DatabaseSync`) | Relational persistence for products, carts, orders, and audits |
| **Payments** | Razorpay SDK (Test Mode) | Order creation, webhook/signature verification |
| **Auth** | JWT (`jsonwebtoken`), PBKDF2 / SHA-256 | Refresh-persistent session management & password hashing |
| **Voice / Vision** | Web Speech API & Visual Attribute Extraction | Speech-to-text transcription & image attribute parsing |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` (v9.0.0 or higher)

---

### Step 1: Clone Repository & Setup Environment

```bash
# Clone the repository
git clone https://github.com/aishwarya382/revenuepilot.git
cd revenuepilot

# Copy environment variables template
cp .env.example .env
```

---

### Step 2: Start the Backend Server

```bash
cd backend
npm install
npm start
```
*Backend runs on `http://localhost:8000` and automatically seeds starter merchants, products, and users in `shopmind.db`.*

To run the automated verification test suite:
```bash
npm test
```

---

### Step 3: Start the Frontend Application

```bash
# In a new terminal window:
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🔑 Demo Credentials

The database automatically seeds safe starter accounts on startup:

| Account Type | Store / Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Merchant 1** | Celebration Cakes | `merchant@revenuepilot.ai` | `Demo@12345` |
| **Merchant 2** | StepWalk Shoes | `owner@stepwalk.in` | `Demo@12345` |
| **Merchant 3** | TechStore Pro | `admin@techstore.in` | `Demo@12345` |
| **Customer 1** | Demo Customer | `customer@revenuepilot.ai` | `Demo@12345` |
| **Customer 2** | Aarav Sharma | `aarav@college.edu` | `Demo@12345` |

*You can also click **"Sign Up"** on the login screen to register new merchant or customer accounts in real-time.*

---

## 📡 API Reference

### 🔐 Authentication
- `POST /api/auth/login` — Authenticate user and receive Bearer JWT access token.
- `POST /api/auth/signup` — Register customer or merchant account with automatic tenant assignment.
- `GET /api/auth/me` — Verify and restore authenticated user session from JWT.
- `POST /api/auth/logout` — Invalidate session.

### 🤖 Multimodal AI Chat & Discovery
- `POST /api/chat` — Submit text query, speech transcript, or base64 image reference. Returns visual attributes, grounded products, and budget-bounded bundle recommendations.

### 🛒 Cart & Checkout
- `GET /api/cart/:customerId` — Retrieve active cart items and totals.
- `POST /api/cart/items` — Add specific product by exact `product_id`.
- `POST /api/cart/add-bundle` — Add entire bundle of product IDs in one atomic call.
- `DELETE /api/cart/:customerId/items/:itemId` — Remove item from cart.
- `GET /api/checkout/address/:customerId` — Retrieve saved delivery address.
- `POST /api/checkout/address` — Save delivery address.
- `POST /api/checkout/calculate-total` — Authoritative server-side price calculation.
- `POST /api/checkout/place-order` — Place Cash on Delivery (COD) order.

### 💳 Razorpay Payments
- `POST /api/razorpay/create-order` — Create Razorpay order with server-verified amounts.
- `POST /api/razorpay/verify-payment` — Cryptographically verify payment signature and deduct inventory.
- `POST /api/razorpay/simulate-failure` — Record failed payment audit and preserve cart state.

### 🏪 Merchant Portal & Innovation Lab
- `GET /api/merchant/products` — Retrieve merchant-owned catalog.
- `POST /api/merchant/products` — Add product with server-enforced `merchant_id`.
- `GET /api/merchant/orders` — View merchant-specific orders and buyer details.
- `GET /api/merchant/insights` — Real revenue insights and paid order statistics.
- `GET /api/merchant/smart-discounts` — AI discount recommendations and conversion simulation curves.
- `POST /api/merchant/campaigns/approve` — Approve and activate recommended discount campaign.

---

## 🧪 Automated Verification Suite

Run `node test.js` inside `backend/` to execute the end-to-end system test suite:

```text
=== RUNNING REVENUE PILOT AI COMPLETE VERIFICATION SUITE ===

[1] Health Check: ✓ PASS
[2] Merchant Login: ✓ PASS
[3] Customer Login: ✓ PASS
[4] Session Persistence (/api/auth/me): ✓ PASS
[5] Merchant Products Isolation: ✓ PASS
[6] Delivery Address Validation & Storage: ✓ PASS
[7] Authoritative Price Calculation: ✓ PASS
[8] Cash on Delivery Order Creation: ✓ PASS
[9] Razorpay Order Creation (UPI): ✓ PASS
[10] Razorpay Payment Verification & Paid Status: ✓ PASS
[11] Payment Failure Cart Safety: ✓ PASS
[12] Customer Order History: ✓ PASS
[13] Merchant Real Database Revenue Tracking: ✓ PASS
[14] Voice Shopping Assistant: ✓ PASS
[15A] Vision TEST 1 (Cake Image Analysis & Product Ranking): ✓ PASS
[15B] Vision TEST 2 (Shoe Image Analysis & Matching): ✓ PASS
[15C] Vision TEST 3 (Watch Out-Of-Catalog Grounded Fallback): ✓ PASS
[15D] Vision TEST 4 (Police Vehicle Strict Grounding Fallback): ✓ PASS
[15E] Vision TEST 5 (Image + Text Budget Bound): ✓ PASS
[15F] Multi-Turn Grounding ("Add that one" exact item addition): ✓ PASS
[16] Smart Discount Decision Engine: ✓ PASS
[17] AI Budget Constraint Safety: ✓ PASS

=== ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===
```

---

## 📁 Repository Structure

```
ai-ecommerce/
├── .env.example                # Root environment variables template
├── .gitignore                  # Git ignore rules for node_modules, caches, and dbs
├── README.md                   # Project documentation & architecture
├── backend/
│   ├── .env.example            # Backend environment template
│   ├── server.js               # Express API routes & multimodal chat handler
│   ├── db.js                   # SQLite schema, multi-tenant tables, & seed data
│   ├── agentTools.js           # Catalog search, basket builder, & cart helpers
│   ├── auth.js                 # JWT verification & password hashing
│   ├── test.js                 # Consolidated system verification test suite
│   └── package.json            # Backend dependencies & npm scripts
└── frontend/
    ├── index.html              # Single Page Application entry point
    ├── vite.config.js          # Vite configuration
    ├── package.json            # Frontend dependencies & npm scripts
    └── src/
        ├── App.jsx             # Main application container
        ├── main.jsx            # React root mount
        ├── index.css           # Global design system & animations
        ├── context/
        │   └── AuthContext.jsx # Authentication state & session recovery
        └── components/
            ├── CustomerPortal.jsx    # Multimodal AI Shopping Assistant (Voice/Vision)
            ├── MerchantPortal.jsx    # Merchant Dashboard & Innovation Lab
            ├── CheckoutModal.jsx     # Real-world Checkout & Delivery Address Modal
            ├── CustomerOrdersView.jsx# Customer order history & tracking
            ├── CartDrawer.jsx        # Shopping cart slide-out drawer
            ├── AuditTrailDrawer.jsx  # Live AI audit logs drawer
            ├── AuthScreen.jsx        # Login & Signup screens
            ├── RazorpayModal.jsx     # Razorpay payment checkout modal
            ├── Header.jsx            # Navigation header
            ├── Sidebar.jsx           # Merchant sidebar navigation
            └── RevenueLogo.jsx       # Brand SVG logo
```

---

## 📄 License

MIT License. Developed for the **Razorpay AI Commerce Innovation Challenge 2026**.

