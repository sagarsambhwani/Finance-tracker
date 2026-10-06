# Finance Tracker 💰

A modern, self-hosted personal and household finance tracker designed for complete privacy and control over your financial data.

---

## ✨ Features

- **🌐 Multi-Currency Support:** Track assets and expenses across multiple fiat currencies and crypto with automatic exchange rate conversion.
- **📄 Smart Bank Statement Import:** Import bank statements via CSV with automated delimiter, date, and currency format detection (supports Deutsche Bank, HDFC, and international banks).
- **📊 Rich Analytics & Visualizations:** Visual dashboards featuring cash flow diagrams, net worth tracking, category breakdowns, and monthly expense pacing.
- **🎯 Budgets & Automation:** Set flexible category budgets, recurring bills, and smart automation rules to organize transactions.
- **👥 Multi-User Ready:** Role-based access (Admin, Read-Write, Read-Only) designed for personal use or shared household finances.
- **🔐 Privacy & Security First:** End-to-end data ownership, built-in Two-Factor Authentication (2FA via TOTP), and WebAuthn / Passkey support.
- **💾 Automated Backups:** Full database backup and restore capabilities to keep your financial records permanently safe.

---

## 🛠 Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Shadcn UI, Vite, Lucide Icons
- **Backend / Engine:** PHP 8.4, Laravel, Supervisor, Nginx
- **Database:** SQLite (WAL mode for reliability)
- **Deployment:** Docker & Docker Compose (Serverless TypeScript / Vercel cloud deployment in progress)

---

## 🚀 Quick Start (Local Docker)

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose

### Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sagarsambhwani/Finance-tracker.git
   cd Finance-tracker
   ```

2. **Start the application:**
   ```bash
   docker compose up -d
   ```

3. **Open the App:**
   Navigate to [http://localhost:8081](http://localhost:8081) in your browser and complete the initial administrator setup.

---

## 📥 Importing Bank Statements

1. Navigate to **Settings → Import Transactions**.
2. Upload your bank's `.csv` statement (exported from Deutsche Bank, HDFC, or any online banking portal).
3. The built-in format detector will automatically recognize:
   - Delimiters (`,` or `;`)
   - Date formats (`DD.MM.YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD`)
   - Number formats (European `1.234,56` or US/Indian `1,234.56`)
4. Confirm column mappings and execute import. Duplicate transactions are automatically detected and skipped.

---

## 🔒 Backups & Data Ownership

All data is stored inside the local SQLite database.
- **Manual Backups:** Download your database snapshot directly from **Settings → Backups** in the UI.
- **Command-line Backup:**
  ```bash
  docker cp finance_tracker-app-1:/data/database.sqlite ./backup-$(date +%Y%m%d).sqlite
  ```

---

## 👤 Author

Developed by **[Sagar Sambhwani](https://github.com/sagarsambhwani)**

## 📄 License

This project is licensed under the [MIT License](LICENSE).
