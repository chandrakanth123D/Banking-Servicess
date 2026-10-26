# Banking Services SPA (Single Page Application)

A full-stack, responsive banking web application built with **Angular** standalone components, **Node.js** with **Express.js**, and lightweight persistent **JSON file storage** (`db.json`).

---

## Architecture Overview

```text
banking-services-spa/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   └── navbar/             # Responsive banking navbar with auth state
│   │   │   ├── pages/
│   │   │   │   ├── login/              # Email/password authentication & 1-click demo fill
│   │   │   │   ├── register/           # Registration with opening deposit bonus
│   │   │   │   ├── dashboard/          # Total balance, KPI metrics & recent transactions
│   │   │   │   ├── accounts/           # Masked account cards & new account opening modal
│   │   │   │   ├── transfer/           # Money transfer with real-time balance validation
│   │   │   │   └── transactions/       # Filterable credit/debit transaction ledger
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts     # Session token & user state management
│   │   │   │   └── banking.service.ts  # Angular HttpClient wrapper for REST API
│   │   │   ├── models/
│   │   │   │   ├── user.model.ts       # User & Auth DTOs
│   │   │   │   ├── account.model.ts    # Account definitions
│   │   │   │   └── transaction.model.ts# Transaction & Transfer contracts
│   │   │   ├── app.config.ts           # Standalone provider bootstrap (HttpClient, Router)
│   │   │   ├── app.routes.ts           # Angular route definitions & AuthGuard
│   │   │   └── app.component.ts        # App shell container
│   │   ├── index.html                  # HTML entry point with Bootstrap & Fonts
│   │   ├── main.ts                     # Angular bootstrapping entry
│   │   └── styles.css                  # Navy & white banking design system
│   ├── package.json
│   ├── angular.json
│   └── tsconfig.json
│
├── backend/
│   ├── data/
│   │   └── db.json                     # JSON storage for users, accounts, transactions
│   ├── server.js                       # Express REST API server
│   └── package.json
│
└── README.md
```

---

## Technologies Used

- **Frontend:** Angular 18 (Standalone Components, Signals/RxJS, Reactive Forms, HttpClient, Router)
- **Backend:** Node.js, Express.js, CORS
- **Storage:** JSON File (`data/db.json`) with atomic reads and synchronous persistence
- **Styling:** Bootstrap 5, Custom CSS, Plus Jakarta Sans, JetBrains Mono

---

## REST API Specifications

The Express backend runs on `http://localhost:5000` (or `http://localhost:3000` in integrated preview mode) and implements the following endpoints:

| Method | Endpoint | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service uptime and collection counters | None |
| `POST` | `/api/auth/register` | Register new user + initial checking account | None |
| `POST` | `/api/auth/login` | Authenticate user credentials & return token | None |
| `GET` | `/api/dashboard` | Aggregated balances, accounts, and recent tx | Bearer Token |
| `GET` | `/api/accounts` | List accounts belonging to authenticated user | Bearer Token |
| `POST` | `/api/accounts` | Open a new demo account (Checking/Savings/etc.) | Bearer Token |
| `GET` | `/api/transactions` | Query transaction history with filters | Bearer Token |
| `POST` | `/api/transfers` | Transfer money with balance check & audit log | Bearer Token |

---

## Pre-Seeded Test Credentials

The database comes pre-populated in `backend/data/db.json` with two demo accounts for immediate testing:

### Account 1: Sarah Jenkins (Primary Demo)
- **Email:** `sarah.jenkins@example.com`
- **Password:** `Password123!`
- **Initial Checking Balance:** `$8,450.75`
- **Savings Balance:** `$24,800.00`
- **Investment Balance:** `$55,200.50`

### Account 2: David Chen (Peer Account)
- **Email:** `david.chen@example.com`
- **Password:** `Password123!`
- **Checking Account Number:** `2009384711`
- **Initial Balance:** `$4,120.00`

---

## Setup and Execution Guide

### Prerequisites
1. Install **Node.js (version 18.x or 20.x or higher)** from [nodejs.org](https://nodejs.org/).
2. Confirm installation in your terminal:
   ```bash
   node -v
   npm -v
   ```

---

### Step 1: Start the Express Backend Server

Open your terminal or Windows PowerShell:

```bash
# Navigate to the backend directory
cd banking-services-spa/backend

# Install backend dependencies
npm install

# Start the Express server
npm start
```

You should see:
```text
Banking Services Backend API listening on port 5000
Ready for Angular HttpClient requests at http://localhost:5000/api
```

---

### Step 2: Start the Angular Frontend (in a New Terminal)

Open a **second terminal window**:

```bash
# Navigate to the frontend directory
cd banking-services-spa/frontend

# Install Angular dependencies
npm install

# Start Angular development server
npm start
# (or: npx ng serve --port 4200)
```

The frontend will compile and start at:
```text
✔ Browser application bundle generation complete.
Initial chunk files | Names         |  Raw size
main.js             | main          | 220.40 kB
...
Application bundle generation complete. [0.824 seconds]
➜  Local:   http://localhost:4200/
```

---

### Step 3: Open in Browser & Test Features

Navigate to **`http://localhost:4200`** in Google Chrome or any modern browser.

1. **Login Test:**
   - Use the 1-click **Sarah Jenkins** quick-fill button, or enter `sarah.jenkins@example.com` / `Password123!`.
   - Click **Sign In**; you will be routed to the Dashboard.

2. **Dashboard Overview:**
   - Verify that the total balance displays `$88,451.25`.
   - Review the 3 accounts and the 5 most recent transactions.

3. **Account Management:**
   - Click **Accounts** in the top navigation.
   - Click **Open New Demo Account**.
   - Select **Business**, enter an initial deposit of `$5,000.00`, and submit.
   - Note the newly opened account card with masked account number.

4. **Money Transfer:**
   - Click **Transfer Money** in the top navigation.
   - Select **Checking Account** as Source.
   - Choose **High-Yield Savings** as Destination.
   - Enter `$500.00` and description `"Monthly automated savings"`.
   - Click **Confirm & Send Funds**.
   - Notice that the Checking balance decreases by $500, Savings increases by $500, and a reference ID is generated.
   - Test validation: Try to transfer `$999,999.00` to verify that the app rejects the transaction due to insufficient funds!

5. **Peer Transfer:**
   - Select destination mode: **To Another Account Number**.
   - Enter David Chen's account number `2009384711` and send `$150.00`.
   - Sign in as `david.chen@example.com` to see the `$150.00` credited directly to his account!

6. **Transaction History:**
   - Click **Transaction History**.
   - Use the type dropdown to filter by **Credits** or **Debits**.
   - Search by keyword (e.g., `"Salary"` or reference number).

7. **Registration Test:**
   - Sign out, click **Open Account**, and register a brand new user.
   - The user will instantly receive an activated checking account with a `$2,500.00` welcome bonus deposit recorded in `db.json`!

---

## Windows PowerShell & Command Prompt Reference

For Windows users:

```powershell
# In Terminal 1 (Backend):
cd banking-services-spa\backend
npm install
npm start

# In Terminal 2 (Frontend):
cd banking-services-spa\frontend
npm install
npm start
```

---

## Troubleshooting & Common Errors

1. **`CORS Policy: No 'Access-Control-Allow-Origin' header`**
   - The backend `server.js` includes `cors()` middleware with `Access-Control-Allow-Origin: *`. Make sure your backend server is running on port 5000 before initiating frontend requests.

2. **`Address already in use :::5000`**
   - Another process is using port 5000. Either terminate that process, or pass `PORT=5001 npm start` in backend and update the API URL in `banking.service.ts`.

3. **`db.json` locked or reset**
   - The server creates `data/db.json` automatically if it is deleted or missing. You can restore the initial demo state anytime by restarting the backend or making a POST request to `/api/admin/reset-db`.

---

## Educational Disclaimer
*This project is an educational demonstration designed for computer science coursework. In production systems, passwords must be securely hashed with Argon2 or bcrypt, session tokens must be signed JWTs or HTTP-only cookies, and accounts must be governed by institutional ledger systems.*
