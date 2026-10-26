/**
 * Banking Services SPA - Express REST API Backend
 * Educational Demonstration Server using JSON File Storage (db.json)
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-user-id']
}));
app.use(express.json());

// Helper: Read database from db.json
function getDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initial = { users: [], accounts: [], transactions: [] };
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading db.json:', err.message);
    return { users: [], accounts: [], transactions: [] };
  }
}

// Helper: Write updated data to db.json
function saveDb(data) {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to db.json:', err.message);
  }
}

// Helper: Extract authenticated user ID from Bearer token, header or query
function getAuthenticatedUserId(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token.startsWith('usr_')) return token;
    if (token.includes('demo-token-')) return token.replace('demo-token-', '');
    return token;
  }
  if (req.headers['x-user-id']) return req.headers['x-user-id'];
  if (req.query.userId) return req.query.userId;
  return null;
}

// Helper: Mask account number to show only last 4 digits (e.g. •••• 9104)
function maskAccountNumber(accountNumber) {
  if (!accountNumber || accountNumber.length < 4) return '•••• 0000';
  return `•••• ${accountNumber.slice(-4)}`;
}

// ==========================================
// API ROUTES
// ==========================================

/**
 * GET /api/health
 * Check backend server and database health status
 */
app.get('/api/health', (req, res) => {
  const db = getDb();
  res.json({
    status: 'ok',
    service: 'Banking Services REST API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    collections: {
      users: db.users ? db.users.length : 0,
      accounts: db.accounts ? db.accounts.length : 0,
      transactions: db.transactions ? db.transactions.length : 0
    }
  });
});

/**
 * POST /api/auth/register
 * Register a new user with full name, email, and password
 */
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required (minimum 2 characters).' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const db = getDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const newUserId = `usr_${Date.now().toString().slice(-6)}`;
    const newUser = {
      id: newUserId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password, // Note: educational simulation
      createdAt: new Date().toISOString()
    };

    // Automatically create a default Checking account with initial opening balance
    const newAccountId = `acc_${Date.now().toString().slice(-6)}`;
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const accountNumber = `100${randomSuffix}`;
    const initialDeposit = 2500.00;

    const newAccount = {
      id: newAccountId,
      userId: newUserId,
      accountNumber,
      accountType: 'Checking',
      balance: initialDeposit,
      currency: 'USD',
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    const welcomeTransaction = {
      id: `tx_${Date.now().toString().slice(-6)}`,
      userId: newUserId,
      accountId: newAccountId,
      type: 'credit',
      description: 'New Account Welcome Opening Deposit',
      amount: initialDeposit,
      date: new Date().toISOString(),
      status: 'Completed',
      referenceId: `REF-${Math.floor(1000000 + Math.random() * 9000000)}`,
      sourceAccount: 'Apex Bank Promotional Bonus',
      destinationAccount: accountNumber
    };

    db.users.push(newUser);
    db.accounts.push(newAccount);
    db.transactions.unshift(welcomeTransaction);
    saveDb(db);

    const token = `demo-token-${newUser.id}`;
    return res.status(201).json({
      success: true,
      message: 'Registration successful! Your checking account is active.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      },
      token
    });
  } catch (err) {
    console.error('Registration failed:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user credentials and return demo session token
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const db = getDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
    }

    const token = `demo-token-${user.id}`;
    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * GET /api/dashboard
 * Retrieve dashboard overview including total balance, account count, and recent transactions
 */
app.get('/api/dashboard', (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
    }

    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found in system.' });
    }

    const accounts = db.accounts
      .filter(a => a.userId === userId)
      .map(a => ({
        ...a,
        maskedNumber: maskAccountNumber(a.accountNumber)
      }));

    const totalBalance = accounts.reduce((sum, a) => sum + (a.status === 'Active' ? a.balance : 0), 0);
    const accountsCount = accounts.length;

    const userTransactions = db.transactions
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const recentTransactions = userTransactions.slice(0, 5);

    const totalIncome = userTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = userTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      totalBalance,
      accountsCount,
      accounts,
      recentTransactions,
      stats: {
        totalIncome,
        totalExpenses
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ error: 'Internal server error fetching dashboard.' });
  }
});

/**
 * GET /api/accounts
 * Retrieve all accounts for the authenticated user
 */
app.get('/api/accounts', (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
    }

    const db = getDb();
    const accounts = db.accounts
      .filter(a => a.userId === userId)
      .map(a => ({
        ...a,
        maskedNumber: maskAccountNumber(a.accountNumber)
      }));

    return res.json(accounts);
  } catch (err) {
    console.error('Accounts error:', err);
    return res.status(500).json({ error: 'Internal server error fetching accounts.' });
  }
});

/**
 * POST /api/accounts
 * Create a new demo account (Checking, Savings, Investment, Business)
 */
app.post('/api/accounts', (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
    }

    const { accountType, initialDeposit } = req.body;
    const validTypes = ['Checking', 'Savings', 'Investment', 'Business'];

    if (!validTypes.includes(accountType)) {
      return res.status(400).json({ error: `Invalid account type. Allowed: ${validTypes.join(', ')}` });
    }

    const depositAmount = Number(initialDeposit) || 0;
    if (depositAmount < 0) {
      return res.status(400).json({ error: 'Initial deposit cannot be negative.' });
    }

    const db = getDb();
    const prefix = accountType === 'Checking' ? '100' : accountType === 'Savings' ? '200' : accountType === 'Investment' ? '300' : '400';
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const accountNumber = `${prefix}${randomSuffix}`;

    const newAccountId = `acc_${Date.now().toString().slice(-6)}`;
    const newAccount = {
      id: newAccountId,
      userId,
      accountNumber,
      accountType,
      balance: depositAmount,
      currency: 'USD',
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    db.accounts.push(newAccount);

    if (depositAmount > 0) {
      const depositTx = {
        id: `tx_${Date.now().toString().slice(-6)}`,
        userId,
        accountId: newAccountId,
        type: 'credit',
        description: `Initial Opening Deposit - ${accountType}`,
        amount: depositAmount,
        date: new Date().toISOString(),
        status: 'Completed',
        referenceId: `REF-${Math.floor(1000000 + Math.random() * 9000000)}`,
        sourceAccount: 'Cash Deposit',
        destinationAccount: accountNumber
      };
      db.transactions.unshift(depositTx);
    }

    saveDb(db);

    return res.status(201).json({
      success: true,
      message: `${accountType} account created successfully!`,
      account: {
        ...newAccount,
        maskedNumber: maskAccountNumber(newAccount.accountNumber)
      }
    });
  } catch (err) {
    console.error('Account creation error:', err);
    return res.status(500).json({ error: 'Internal server error creating account.' });
  }
});

/**
 * GET /api/transactions
 * Retrieve transaction history with optional filters (accountId, type, search, limit)
 */
app.get('/api/transactions', (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
    }

    const { accountId, type, search, limit } = req.query;
    const db = getDb();

    let results = db.transactions.filter(t => t.userId === userId);

    if (accountId) {
      results = results.filter(t => t.accountId === accountId);
    }

    if (type && (type === 'credit' || type === 'debit')) {
      results = results.filter(t => t.type === type);
    }

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.referenceId.toLowerCase().includes(q) ||
        (t.sourceAccount && t.sourceAccount.toLowerCase().includes(q)) ||
        (t.destinationAccount && t.destinationAccount.toLowerCase().includes(q))
      );
    }

    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (limit && !isNaN(Number(limit))) {
      results = results.slice(0, Number(limit));
    }

    return res.json(results);
  } catch (err) {
    console.error('Transactions error:', err);
    return res.status(500).json({ error: 'Internal server error fetching transactions.' });
  }
});

/**
 * POST /api/transfers
 * Transfer money between eligible accounts with balance checks and atomic consistency
 */
app.post('/api/transfers', (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
    }

    const {
      sourceAccountId,
      destinationAccountId,
      destinationAccountNumber,
      amount,
      description
    } = req.body;

    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ error: 'Transfer amount must be greater than 0.' });
    }

    if (!sourceAccountId) {
      return res.status(400).json({ error: 'Please choose a source account.' });
    }

    const db = getDb();
    const sourceAccount = db.accounts.find(a => a.id === sourceAccountId && a.userId === userId);

    if (!sourceAccount) {
      return res.status(404).json({ error: 'Source account not found or access denied.' });
    }

    if (sourceAccount.status !== 'Active') {
      return res.status(400).json({ error: `Source account is ${sourceAccount.status}. Transfers not permitted.` });
    }

    // Insufficient funds validation
    if (sourceAccount.balance < transferAmount) {
      return res.status(400).json({
        error: `Insufficient balance. Available: $${sourceAccount.balance.toFixed(2)}, Requested: $${transferAmount.toFixed(2)}.`
      });
    }

    const transferRef = `TRF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const transferDesc = (description && description.trim().length > 0) ? description.trim() : 'Funds Transfer';

    let destinationAccount = null;

    if (destinationAccountId) {
      if (destinationAccountId === sourceAccountId) {
        return res.status(400).json({ error: 'Source and destination accounts cannot be the same.' });
      }
      destinationAccount = db.accounts.find(a => a.id === destinationAccountId);
    } else if (destinationAccountNumber) {
      if (destinationAccountNumber === sourceAccount.accountNumber) {
        return res.status(400).json({ error: 'Source and destination accounts cannot be the same.' });
      }
      destinationAccount = db.accounts.find(a => a.accountNumber === destinationAccountNumber.trim());
    }

    // Deduct source account
    sourceAccount.balance = Number((sourceAccount.balance - transferAmount).toFixed(2));

    const sourceTx = {
      id: `tx_${Date.now().toString().slice(-6)}_d`,
      userId: sourceAccount.userId,
      accountId: sourceAccount.id,
      type: 'debit',
      description: `Transfer to ${destinationAccount ? `${destinationAccount.accountType} (${maskAccountNumber(destinationAccount.accountNumber)})` : `Acc ${destinationAccountNumber || 'External'}`}: ${transferDesc}`,
      amount: transferAmount,
      date: new Date().toISOString(),
      status: 'Completed',
      referenceId: transferRef,
      sourceAccount: sourceAccount.accountNumber,
      destinationAccount: destinationAccount ? destinationAccount.accountNumber : (destinationAccountNumber || 'External')
    };
    db.transactions.unshift(sourceTx);

    // Credit destination account if present in bank database
    if (destinationAccount) {
      destinationAccount.balance = Number((destinationAccount.balance + transferAmount).toFixed(2));

      const destTx = {
        id: `tx_${Date.now().toString().slice(-6)}_c`,
        userId: destinationAccount.userId,
        accountId: destinationAccount.id,
        type: 'credit',
        description: `Transfer from ${sourceAccount.accountType} (${maskAccountNumber(sourceAccount.accountNumber)}): ${transferDesc}`,
        amount: transferAmount,
        date: new Date().toISOString(),
        status: 'Completed',
        referenceId: transferRef,
        sourceAccount: sourceAccount.accountNumber,
        destinationAccount: destinationAccount.accountNumber
      };
      db.transactions.unshift(destTx);
    }

    saveDb(db);

    return res.json({
      success: true,
      message: `Successfully transferred $${transferAmount.toFixed(2)}.`,
      referenceId: transferRef,
      newSourceBalance: sourceAccount.balance,
      sourceAccount: {
        id: sourceAccount.id,
        accountNumber: sourceAccount.accountNumber,
        maskedNumber: maskAccountNumber(sourceAccount.accountNumber),
        balance: sourceAccount.balance
      }
    });
  } catch (err) {
    console.error('Transfer processing error:', err);
    return res.status(500).json({ error: 'Internal server error processing transfer.' });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`Banking Services Backend API listening on port ${PORT}`);
  console.log(`Ready for Angular HttpClient requests at http://localhost:${PORT}/api`);
});
