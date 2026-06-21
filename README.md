# LalaKirana 🛒

A modern, vertical-slice, local-first inventory management system designed for local retail and general stores (Kirana shops). LalaKirana is built with a sleek, high-contrast user interface styled after the **Minted Ledger** design system (Ice Latte + Mint palette).

---

## 🏗️ Architecture

LalaKirana follows a **Feature-Based (Vertical Slice) Architecture** on both the frontend and backend. Rather than organizing code by horizontal technical layers (like controllers, routes, or components), files are grouped by domain features to maximize modularity and maintainability:

*   **`auth`**: Login, session management, security checks, and OTP recovery.
*   **`dashboard`**: Business metrics, low-stock notifications, and price alerts.
*   **`products` & `inventory`**: Item catalog, stock logging, and adjustments.
*   **`pricing`**: Bulk item price management.
*   **`eod`**: End-of-Day cash and stock audit journal.
*   **`settings`**: User accounts, category structures, and active session control.

---

## 🛠️ Technology Stack

### Frontend
*   **Core**: React 19 + TypeScript + Vite
*   **Routing**: React Router v7
*   **State Management**: Zustand (client state) + TanStack React Query v5 (server-cache state)
*   **Styling**: Vanilla CSS Modules (Strictly no utility classes, optimized for performance and control)
*   **Aesthetics**: Google Fonts (Playfair Display for headers, DM Sans for body, DM Mono for tabular numbers/prices)

### Backend
*   **Core**: Express + TypeScript + `tsx` (development runner)
*   **Database**: PostgreSQL hosted on Supabase (service-role client)
*   **Validation**: Zod (strict compile-time/runtime validation)
*   **Security**: Express Rate Limit + JWT Session tracking + Bcrypt hashing

---

## ⚙️ Environment Variables

### 1. Backend (`backend/.env`)
Create a `.env` file in the `backend/` folder based on `backend/.env.example`:

```env
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_at_least_64_characters
JWT_EXPIRY=8h
FRONTEND_URL=http://localhost:5173

# Email/OTP Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

### 2. Frontend (`frontend/.env`)
Create a `.env` file in the `frontend/` folder:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 🚀 How to Run Locally

### Prerequisites
*   **Node.js**: `v20.x` or later
*   **npm**: `v10.x` or later
*   **Supabase**: A Supabase project instance (for PostgreSQL migrations)

---

### Step 1: Database Migrations
LalaKirana uses PostgreSQL migrations to define schemas and seed initial data.

1. Navigate to the `migrations/` directory:
   ```bash
   cd migrations
   ```
2. Copy `.env.example` to `.env` and fill in your Supabase connection strings.
3. Run the migrations helper:
   ```bash
   node run-migrations.js
   ```
   *This will run all migrations from `001_create_users.sql` through `016_seed_admin_user.sql`.*

---

### Step 2: Start the Backend Server
1. Navigate to the `backend/` directory:
   ```bash
   cd ../backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:5000/api/v1`.

---

### Step 3: Start the Frontend App
1. Navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🔑 Seeded Owner Credentials

To log in for the first time, use the seeded owner account:

*   **Email**: `*******************`
*   **Password**: `***********`

> [!WARNING]
> Change this password immediately in the **Settings** menu after your first login.
