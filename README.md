# PW Materials — Neo-Brutalist Materials & Invoice Management System

A production-grade materials management and procurement application featuring **server-side OpenAI Vision recognition**, a normalized **Supabase PostgreSQL** database, **Supabase Storage** for document preservation, and bank-style multi-format exports.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)
![Vite](https://img.shields.io/badge/Vite-6.2-646cff?logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20Storage-3ECF8E?logo=supabase)
![OpenAI](https://img.shields.io/badge/OpenAI-Vision%20(GPT--4o--mini)-412991?logo=openai)

---

## 🎨 Design System

PW Materials uses a **Clean Pastel Ice Aqua / Warm Cream Neo-Brutalist** aesthetic:
- **Primary Typeface:** Google Fonts Merriweather (Serif)
- **Palette:**
  - Background: `#FFF4E8` (Light Yellow / Warm Cream)
  - Content Cards: `#EAF8FA` (Light Aqua) & `#FFFFFF` (Surface)
  - Primary Action / Buttons: `#C9A3F5` (Purple) & Hover `#B98AEF`
  - Selected States: `#D8C2F5` (Purple selected controls)
  - Brand & Highlights: `#FFF0BC` (Light Yellow) & `#FFE9A3` (Butter Yellow)
  - Status Accents: `#BFE8D0` (Mint / Success) & `#FFD3D3` (Pastel Error)
- **Hard Offset Shadows:** Zero blur `4px 4px 0 #202020` on cards and buttons.
- **Crisp Outlines:** `2–3px solid #202020` on cards, inputs, buttons, and tables.

---

## 🚀 Architecture & Core Features

### 1. Secure Server-Side OpenAI Vision Recognition
- **Model:** `gpt-4o-mini` (Configurable via `OPENAI_MODEL` environment variable).
- **Security:** `OPENAI_API_KEY` is **never exposed in client bundles**. Calls route through the secure server-side endpoint (`/api/recognize`).
- **Processing Engine:**
  - **Invoices & Bills:** Extracts supplier name, invoice number, invoice date, currency, subtotal, tax amount, total, and individual line items (item name, quantity, unit, unit price, tax, and confidence scores).
  - **Physical Material Photos:** Identifies material type, brand, and characteristics (e.g. TMT rebar, cement grade, copper pipes) without fabricating supplier names or invoice numbers.
  - **Multi-Item Support:** Automatically splits multi-item invoices into discrete, editable draft items.
- **Local Dev Server:** Built-in Vite plugin (`vite-plugin-ai-recognition.ts`) handles `/api/recognize` locally.
- **Production Serverless:** `api/recognize.ts` handles `/api/recognize` on Vercel; `supabase/functions/recognize/index.ts` is available for Supabase Edge Functions.

### 2. Normalized Supabase PostgreSQL Database & Storage
- **Schema Migration:** [`supabase/migrations/20261021_init_materials_schema.sql`](supabase/migrations/20261021_init_materials_schema.sql)
  - `public.invoices`: Invoice-level metadata, dates, monetary totals, and storage links.
  - `public.materials`: Reusable material catalog with SKUs and standard rates.
  - `public.invoice_items`: Granular purchase line items referencing parent invoices.
  - `public.purchases`: Backward-compatible ledger ensuring continuous operation with legacy views.
- **Storage Bucket:** Private `invoices` bucket for securely storing invoice images.
- **Row-Level Security (RLS):** Strict multi-user ownership policies and data validation constraints.
- **Offline Resilience:** Seamless fallback to persistent browser storage when offline or unconfigured.

### 3. Review-Before-Save Workflow
- Extracted details are displayed in an interactive review screen.
- Users verify and edit material names, vendors, prices, tax rates, and quantities before finalizing.
- Saving commits verified records directly to Supabase and purchase history.

### 4. Statement Exports
- Multi-format download: **XLSX** (Excel), **PDF** (bank-style statement), and **CSV**.
- Presets: `Today`, `Last 7 days`, `Last 30 days`, or custom date range.

---

## 🛠️ Environment Configuration

Copy `.env.example` to `.env` (or `.env.local`):

```bash
cp .env.example .env
```

Set your configuration values:

```env
# 1. Supabase (Frontend Safe)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# 2. OpenAI Vision (Server-Side ONLY - Never prefix with VITE_)
OPENAI_API_KEY=sk-proj-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

---

## 💾 Applying Database Migrations in Supabase

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Open [`supabase/migrations/20261021_init_materials_schema.sql`](supabase/migrations/20261021_init_materials_schema.sql) (or click **Copy SQL** in the application's **Settings -> SQL Schema** modal).
3. Paste the SQL script and click **Run**.
4. The tables (`invoices`, `materials`, `invoice_items`, `purchases`), indexes, RLS policies, and `invoices` storage bucket will be set up automatically.

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 📦 Production Build & Testing

```bash
# Type-check and build bundle
npm run build

# Preview build locally
npm run preview
```

---

## 🌐 Production Deployment

### Vercel
1. Connect repository to Vercel.
2. In **Project Settings** -> **Environment Variables**, add:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (`gpt-4o-mini`)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vercel automatically deploys the frontend and serverless vision API at `/api/recognize`.

### Supabase Edge Functions (Alternative Backend)
```bash
supabase functions deploy recognize --no-verify-jwt
supabase secrets set OPENAI_API_KEY=your-key OPENAI_MODEL=gpt-4o-mini
```
