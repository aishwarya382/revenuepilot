# Revenue Pilot AI

> AI-native commerce platform that turns customer intent into merchant revenue.

---

## What it does

**Revenue Pilot AI** bridges customer intent and merchant inventory. Instead of traditional keyword search and static product listings, customers can discover products naturally using **natural language text, voice microphone input, or reference images**. 

The AI agent analyzes the customer's intent and budget constraints, matches against the merchant's real SQLite database catalog, and proactively proposes **contextual baskets, budget-bounded bundles, and smart discount incentives**. Once the customer approves, the exact items are added to the cart and securely checked out via **Razorpay Test Mode**.

---

## Core Flow

```
Customer Intent (Text / Voice / Image)
       ↓
AI Multimodal Understanding & Attribute Extraction
       ↓
Real Merchant Catalog Grounding (SQLite)
       ↓
Personalized Recommendation & Budget-Bounded Bundle
       ↓
Customer Approval ("Add complete bundle" / "Add the second one")
       ↓
Cart API (Exact product_ids)
       ↓
Razorpay Test Payment Checkout
       ↓
Server-Side Payment Verification & Atomic Inventory Deduction
       ↓
Real Order Created & Merchant Intelligence Updated
```

---

## Key Features

- **Multimodal Conversational Shopping**: Chat naturally using text, spoken voice via the browser's Web Speech API, or uploaded reference photos/screenshots.
- **Visual Attribute Analysis**: Analyzes product photos to identify product type, style, color, and features to search the real store inventory.
- **Strict Catalog Grounding**: Every recommended product is grounded in verified SQLite database inventory with exact `product_id`, price, and stock. No fabricated items or broken external links.
- **AI Basket Builder**: Builds occasion-bounded bundles (e.g. Birthday Cake + Candles + Balloons within a ₹1,000 budget) to lift merchant Average Order Value (AOV).
- **Positional Conversational Memory**: Understands contextual ordinal references like *"Add the second one"* or *"Add the cake and candles"*.
- **Merchant Innovation Lab & Intelligence**:
  - Intent $\rightarrow$ Revenue signals extracted from customer search patterns.
  - Smart Discount & Campaign Decision Engine with margin protection.
  - What-If Revenue Simulator modeling conversion vs. discount curves.
  - 1-Click Campaign Approval for merchants.
- **Razorpay Payment Integration**:
  - Secure Test Mode checkout flow.
  - Server-side cryptographic signature verification.
  - Atomic inventory deduction upon successful payment.
  - Failure recovery preserving the customer's cart if payment is cancelled or fails.
- **Multi-Tenant Data Isolation**: Merchants can strictly view and manage only their own products, customers, and orders.
- **Refresh-Proof JWT Authentication**: Cryptographically signed tokens that maintain user identity across page reloads without account switching.

---

## Tech Stack

- **Frontend**: React 19, Vite, Lucide React, Vanilla CSS
- **Backend**: Node.js, Express, SQLite (`node:sqlite` / `DatabaseSync`), JSON Web Tokens (JWT), Bcrypt, Razorpay SDK
- **Voice & Vision**: Web Speech API (`SpeechRecognition`) & Multimodal Visual Attribute Analyzer
- **Database**: SQLite (`shopmind.db`)
- **Payments**: Razorpay Test Gateway

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` (v9.0.0 or higher)

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start backend server (runs on http://localhost:8000)
npm start
```

To run the automated verification test suite:

```bash
npm test
```

---

### 2. Frontend Setup

```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server (runs on http://localhost:5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to start using Revenue Pilot AI.

---

## Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `8000` |
| `SECRET_KEY` | JWT signing secret key | `ShopMindSuperSecretKey2026` |
| `ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session token validity duration | `1440` (24 hours) |
| `DATABASE_URL` | SQLite database connection path | `sqlite:///./shopmind.db` |
| `RAZORPAY_KEY_ID` | Razorpay Test Key ID | `rzp_test_AiCommerce2026` |
| `RAZORPAY_KEY_SECRET` | Razorpay Test Secret Key | `SecretKeyRazorpayTest2026` |

---

## Project Structure

```
ai-ecommerce/
├── .env.example                # Root environment template
├── .gitignore                  # Git ignore rules
├── README.md                   # Project documentation
├── backend/
│   ├── .env.example            # Backend environment template
│   ├── server.js               # Express server & API routes
│   ├── db.js                   # SQLite database schema & seed data
│   ├── agentTools.js           # Catalog search & basket builder tools
│   ├── auth_node.js            # JWT & password hashing utilities
│   ├── test.js                 # Consolidated system verification test
│   └── package.json            # Backend dependencies & scripts
└── frontend/
    ├── index.html              # HTML entry point
    ├── vite.config.js          # Vite configuration
    ├── package.json            # Frontend dependencies & scripts
    └── src/
        ├── App.jsx             # Main application component
        ├── main.jsx            # React root mount
        ├── index.css           # Global design system
        ├── context/
        │   └── AuthContext.jsx # Authentication state & session recovery
        └── components/
            ├── CustomerPortal.jsx    # Multimodal AI Shopping Assistant
            ├── MerchantPortal.jsx    # Merchant Dashboard & Innovation Lab
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

## Demo Accounts

The database automatically seeds safe demo accounts on initial startup:

### Merchant Account
- **Email**: `merchant@revenuepilot.ai`
- **Password**: `Demo@12345`
- **Store**: Celebration Cakes

### Customer Account
- **Email**: `customer@revenuepilot.ai`
- **Password**: `Demo@12345`
- **Role**: Customer Shopper

*You can also click "Sign Up" on the login screen to register a new merchant or customer account.*

---

## License

MIT License. Built for conversational AI commerce innovation.
