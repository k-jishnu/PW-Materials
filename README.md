# PW Materials — Neo-Brutalist Materials & Invoice Management System

A production-ready materials management and procurement application featuring AI invoice recognition, bank-statement exports, persistent local/cloud storage, and a distinctive Neo-Brutalist design system.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)
![Vite](https://img.shields.io/badge/Vite-6.2-646cff?logo=vite)

---

## 🎨 Design System

PW Materials uses a **Professional Neo-Brutalist** aesthetic:
- **Primary Typeface:** Google Fonts Merriweather (Serif)
- **Palette:**
  - Background: `#FFF4E8` (Warm Cream)
  - Card Surface: `#FFFFFF` (Crisp White)
  - Primary Border & Text: `#202020` (Rich Charcoal Black)
  - Primary Action: `#FF6B6B` (Coral)
  - Success / Affirmative: `#43C9B8` (Teal)
  - Selected / Highlight: `#FFE66D` (Yellow)
  - Accents: `#B79CED` (Lavender), `#FFAB78` (Peach)
- **Hard Offset Shadows:** Zero blur `4px 4px 0 #202020` with interactive active press states (`2px 2px 0 #202020`).
- **Crisp Outlines:** `2–3px solid #202020` on cards, inputs, buttons, and tables.

---

## 🚀 Key Features

1. **Invoice & Photo Capture:**
   - Multi-device camera capture with high-resolution photo snapping.
   - Invoice file upload (JPEG, PNG, WebP) with drag-and-drop support.
   - Built-in multi-stage AI extraction with confidence ratings for vendor, item, unit price, quantity, and GST.

2. **Materials Management:**
   - Interactive data table with inline editing for item names, quantities, units, and prices.
   - Automatic SKU generation and GST tax calculation.
   - Duplicate, delete, and single/batch commit to purchase history.

3. **Statement Exports:**
   - Synchronized date presets (`Today`, `Last 7 Days`, `Last 30 Days`, or custom date range).
   - Multi-format download: **XLSX** (Excel spreadsheet), **PDF** (bank-style statement), and **CSV**.

4. **Dual Storage Architecture:**
   - Offline-first resilience: Automatic fallback to persistent LocalStorage.
   - Cloud synchronization: Optional Supabase connection for PostgreSQL storage.

---

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/k-jishnu/PW-Materials.git
cd PW-Materials

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 📦 Production Build

```bash
npm run build
```

The production assets will be generated in the `dist/` directory with relative asset paths enabled for compatibility with GitHub Pages, Vercel, Netlify, and custom subdirectories.

---

## 🌐 Deployment

### GitHub Pages (Automated via GitHub Actions)
1. Go to repository **Settings** -> **Pages**.
2. Under **Build and deployment** -> **Source**, select **GitHub Actions**.
3. Push to `main`. The included `.github/workflows/deploy.yml` workflow will automatically build and deploy the application.

### Vercel / Netlify
- Build command: `npm run build`
- Output directory: `dist`
- The repository includes `vercel.json` for single-page application routing.
