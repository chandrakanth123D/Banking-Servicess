import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Interface definitions
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  accountType: 'Checking' | 'Savings' | 'Investment' | 'Business';
  balance: number;
  currency: string;
  status: 'Active' | 'Frozen' | 'Closed';
  createdAt: string;
}

interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: 'credit' | 'debit';
  description: string;
  amount: number;
  date: string;
  status: 'Completed' | 'Pending' | 'Failed';
  referenceId: string;
  sourceAccount?: string;
  destinationAccount?: string;
}

interface DatabaseSchema {
  users: User[];
  accounts: Account[];
  transactions: Transaction[];
}

// Database helper functions
function getDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initial: DatabaseSchema = { users: [], accounts: [], transactions: [] };
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch (error) {
    console.error('Error reading db.json:', error);
    return { users: [], accounts: [], transactions: [] };
  }
}

function saveDb(data: DatabaseSchema): void {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    // Also mirror to banking-services-spa/backend/data/db.json if folder exists
    const mirrorPath = path.join(__dirname, 'banking-services-spa', 'backend', 'data', 'db.json');
    if (fs.existsSync(path.dirname(mirrorPath))) {
      fs.writeFileSync(mirrorPath, JSON.stringify(data, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Error writing to db.json:', error);
  }
}

// Helper: extract authenticated userId from Authorization header or query
function getAuthenticatedUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // In our educational demo, token is either a simulated JWT or format "usr_..."
    if (token.startsWith('usr_')) {
      return token;
    }
    // Check if token contains userId encoded
    if (token.includes('demo-token-')) {
      return token.replace('demo-token-', '');
    }
    return token;
  }

  // Fallback to query parameter or custom header for flexibility
  if (typeof req.query.userId === 'string') {
    return req.query.userId;
  }
  const customUserId = req.headers['x-user-id'];
  if (typeof customUserId === 'string') {
    return customUserId;
  }

  return null;
}

function maskAccountNumber(accNo: string): string {
  if (!accNo || accNo.length < 4) return '•••• 0000';
  return `•••• ${accNo.slice(-4)}`;
}

async function startServer() {
  const app = express();

  // CORS middleware for standard Angular HttpClient compatibility
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // 1. Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    const db = getDb();
    res.json({
      status: 'ok',
      service: 'Apex Banking Services REST API',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      collections: {
        users: db.users.length,
        accounts: db.accounts.length,
        transactions: db.transactions.length
      }
    });
  });

  // 2. User registration
  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ error: 'Full name is required (at least 2 characters).' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      const db = getDb();
      const existingUser = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email address already exists.' });
      }

      const newUserId = `usr_${Date.now().toString().slice(-6)}`;
      const newUser: User = {
        id: newUserId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password, // Note: Stored in plaintext solely for this educational demo per project instructions
        createdAt: new Date().toISOString()
      };

      // Create initial primary checking account with $2,500.00 initial deposit bonus
      const newAccountId = `acc_${Date.now().toString().slice(-6)}`;
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const accountNumber = `100${randomSuffix}`;
      const initialBalance = 2500.00;

      const newAccount: Account = {
        id: newAccountId,
        userId: newUserId,
        accountNumber,
        accountType: 'Checking',
        balance: initialBalance,
        currency: 'USD',
        status: 'Active',
        createdAt: new Date().toISOString()
      };

      const welcomeTx: Transaction = {
        id: `tx_${Date.now().toString().slice(-6)}`,
        userId: newUserId,
        accountId: newAccountId,
        type: 'credit',
        description: 'New Account Welcome Deposit Bonus',
        amount: initialBalance,
        date: new Date().toISOString(),
        status: 'Completed',
        referenceId: `REF-${Math.floor(1000000 + Math.random() * 9000000)}`,
        sourceAccount: 'Apex Bank Promotional Bonus',
        destinationAccount: accountNumber
      };

      db.users.push(newUser);
      db.accounts.push(newAccount);
      db.transactions.unshift(welcomeTx);
      saveDb(db);

      const token = `demo-token-${newUser.id}`;
      return res.status(201).json({
        success: true,
        message: 'Account registered successfully with $2,500.00 opening balance!',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email
        },
        token
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Internal server error during registration.' });
    }
  });

  // 3. User login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const db = getDb();
      const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

      if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
      }

      const token = `demo-token-${user.id}`;
      return res.json({
        success: true,
        message: 'Authentication successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        token
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error during login.' });
    }
  });

  // 4. Dashboard aggregate information
  app.get('/api/dashboard', (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication.' });
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

      const totalCredits = userTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalDebits = userTransactions
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
          totalIncome: totalCredits,
          totalExpenses: totalDebits
        }
      });
    } catch (err: any) {
      console.error('Dashboard error:', err);
      return res.status(500).json({ error: 'Internal server error fetching dashboard.' });
    }
  });

  // 5. Account retrieval
  app.get('/api/accounts', (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication.' });
      }

      const db = getDb();
      const accounts = db.accounts
        .filter(a => a.userId === userId)
        .map(a => ({
          ...a,
          maskedNumber: maskAccountNumber(a.accountNumber)
        }));

      return res.json(accounts);
    } catch (err: any) {
      console.error('Accounts fetch error:', err);
      return res.status(500).json({ error: 'Internal server error fetching accounts.' });
    }
  });

  // 6. Create demo account
  app.post('/api/accounts', (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication.' });
      }

      const { accountType, initialDeposit } = req.body;
      const validTypes = ['Checking', 'Savings', 'Investment', 'Business'];
      if (!validTypes.includes(accountType)) {
        return res.status(400).json({ error: `Invalid account type. Choose from: ${validTypes.join(', ')}` });
      }

      const depositAmount = Number(initialDeposit) || 0;
      if (depositAmount < 0) {
        return res.status(400).json({ error: 'Initial deposit cannot be negative.' });
      }

      const db = getDb();
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const accountNumber = `${accountType === 'Checking' ? '100' : accountType === 'Savings' ? '200' : accountType === 'Investment' ? '300' : '400'}${randomSuffix}`;
      
      const newAccountId = `acc_${Date.now().toString().slice(-6)}`;
      const newAccount: Account = {
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
        const depositTx: Transaction = {
          id: `tx_${Date.now().toString().slice(-6)}`,
          userId,
          accountId: newAccountId,
          type: 'credit',
          description: `Initial Deposit - ${accountType} Account Opening`,
          amount: depositAmount,
          date: new Date().toISOString(),
          status: 'Completed',
          referenceId: `REF-${Math.floor(1000000 + Math.random() * 9000000)}`,
          sourceAccount: 'Opening Cash Deposit',
          destinationAccount: accountNumber
        };
        db.transactions.unshift(depositTx);
      }

      saveDb(db);

      return res.status(201).json({
        success: true,
        message: `${accountType} account opened successfully!`,
        account: {
          ...newAccount,
          maskedNumber: maskAccountNumber(newAccount.accountNumber)
        }
      });
    } catch (err: any) {
      console.error('Account creation error:', err);
      return res.status(500).json({ error: 'Internal server error creating account.' });
    }
  });

  // 7. Transaction history
  app.get('/api/transactions', (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication.' });
      }

      const { accountId, type, search, limit } = req.query;
      const db = getDb();

      let results = db.transactions.filter(t => t.userId === userId);

      if (accountId && typeof accountId === 'string') {
        results = results.filter(t => t.accountId === accountId);
      }

      if (type && (type === 'credit' || type === 'debit')) {
        results = results.filter(t => t.type === type);
      }

      if (search && typeof search === 'string') {
        const query = search.toLowerCase();
        results = results.filter(t => 
          t.description.toLowerCase().includes(query) ||
          t.referenceId.toLowerCase().includes(query) ||
          (t.sourceAccount && t.sourceAccount.toLowerCase().includes(query)) ||
          (t.destinationAccount && t.destinationAccount.toLowerCase().includes(query))
        );
      }

      results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (limit && !isNaN(Number(limit))) {
        results = results.slice(0, Number(limit));
      }

      return res.json(results);
    } catch (err: any) {
      console.error('Transactions fetch error:', err);
      return res.status(500).json({ error: 'Internal server error fetching transactions.' });
    }
  });

  // 8. Money transfer between eligible accounts
  app.post('/api/transfers', (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication.' });
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
        return res.status(400).json({ error: 'Transfer amount must be a positive number greater than 0.' });
      }

      if (!sourceAccountId) {
        return res.status(400).json({ error: 'Please select a valid source account.' });
      }

      const db = getDb();
      const sourceAccount = db.accounts.find(a => a.id === sourceAccountId && a.userId === userId);

      if (!sourceAccount) {
        return res.status(404).json({ error: 'Source account not found or unauthorized for this user.' });
      }

      if (sourceAccount.status !== 'Active') {
        return res.status(400).json({ error: `Source account is currently ${sourceAccount.status}. Transfers are disabled.` });
      }

      // Validate sufficient funds
      if (sourceAccount.balance < transferAmount) {
        return res.status(400).json({
          error: `Insufficient funds. Available balance: $${sourceAccount.balance.toFixed(2)}, Requested transfer: $${transferAmount.toFixed(2)}.`
        });
      }

      const transferRef = `TRF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const transferDesc = (description && description.trim().length > 0)
        ? description.trim()
        : 'Funds Transfer';

      let destinationAccount: Account | undefined;

      // Handle destination by ID or Account Number
      if (destinationAccountId) {
        if (destinationAccountId === sourceAccountId) {
          return res.status(400).json({ error: 'Source and destination accounts cannot be identical.' });
        }
        destinationAccount = db.accounts.find(a => a.id === destinationAccountId);
      } else if (destinationAccountNumber) {
        if (destinationAccountNumber === sourceAccount.accountNumber) {
          return res.status(400).json({ error: 'Source and destination accounts cannot be identical.' });
        }
        destinationAccount = db.accounts.find(a => a.accountNumber === destinationAccountNumber.trim());
      }

      // Deduct from source account
      sourceAccount.balance = Number((sourceAccount.balance - transferAmount).toFixed(2));

      const sourceTx: Transaction = {
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
        destinationAccount: destinationAccount ? destinationAccount.accountNumber : (destinationAccountNumber || 'External Recipient')
      };
      db.transactions.unshift(sourceTx);

      // If destination account exists in db.json (internal or peer user), credit it
      if (destinationAccount) {
        destinationAccount.balance = Number((destinationAccount.balance + transferAmount).toFixed(2));

        const destTx: Transaction = {
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
        message: `Successfully transferred $${transferAmount.toFixed(2)} to ${destinationAccount ? `${destinationAccount.accountType} (${maskAccountNumber(destinationAccount.accountNumber)})` : `Account ${destinationAccountNumber}`}.`,
        referenceId: transferRef,
        newSourceBalance: sourceAccount.balance,
        sourceAccount: {
          id: sourceAccount.id,
          accountNumber: sourceAccount.accountNumber,
          maskedNumber: maskAccountNumber(sourceAccount.accountNumber),
          balance: sourceAccount.balance
        }
      });
    } catch (err: any) {
      console.error('Transfer error:', err);
      return res.status(500).json({ error: 'Internal server error processing transfer.' });
    }
  });

  // 9. Reset database to seeded demo state (useful for test reviews)
  app.post('/api/admin/reset-db', (req: Request, res: Response) => {
    try {
      const seeded: DatabaseSchema = {
        users: [
          {
            id: 'usr_001',
            name: 'Sarah Jenkins',
            email: 'sarah.jenkins@example.com',
            password: 'Password123!',
            createdAt: '2026-01-15T08:30:00.000Z'
          },
          {
            id: 'usr_002',
            name: 'David Chen',
            email: 'david.chen@example.com',
            password: 'Password123!',
            createdAt: '2026-02-10T14:20:00.000Z'
          }
        ],
        accounts: [
          {
            id: 'acc_001',
            userId: 'usr_001',
            accountNumber: '1004829104',
            accountType: 'Checking',
            balance: 8450.75,
            currency: 'USD',
            status: 'Active',
            createdAt: '2026-01-15T08:35:00.000Z'
          },
          {
            id: 'acc_002',
            userId: 'usr_001',
            accountNumber: '1004829105',
            accountType: 'Savings',
            balance: 24800.00,
            currency: 'USD',
            status: 'Active',
            createdAt: '2026-01-15T08:36:00.000Z'
          },
          {
            id: 'acc_003',
            userId: 'usr_001',
            accountNumber: '1004829106',
            accountType: 'Investment',
            balance: 55200.50,
            currency: 'USD',
            status: 'Active',
            createdAt: '2026-02-01T11:15:00.000Z'
          },
          {
            id: 'acc_004',
            userId: 'usr_002',
            accountNumber: '2009384711',
            accountType: 'Checking',
            balance: 4120.00,
            currency: 'USD',
            status: 'Active',
            createdAt: '2026-02-10T14:25:00.000Z'
          }
        ],
        transactions: [
          {
            id: 'tx_001',
            userId: 'usr_001',
            accountId: 'acc_001',
            type: 'credit',
            description: 'Apex Corp - Monthly Salary Deposit',
            amount: 4250.00,
            date: '2026-10-24T09:00:00.000Z',
            status: 'Completed',
            referenceId: 'REF-8849201',
            sourceAccount: 'Payroll Direct Deposit',
            destinationAccount: '1004829104'
          },
          {
            id: 'tx_002',
            userId: 'usr_001',
            accountId: 'acc_001',
            type: 'debit',
            description: 'Downtown Electric Utility Bill',
            amount: 142.80,
            date: '2026-10-22T14:15:00.000Z',
            status: 'Completed',
            referenceId: 'REF-3928174',
            sourceAccount: '1004829104',
            destinationAccount: 'Utility Service Provider'
          },
          {
            id: 'tx_003',
            userId: 'usr_001',
            accountId: 'acc_001',
            type: 'debit',
            description: 'Internal Transfer to High-Yield Savings',
            amount: 1000.00,
            date: '2026-10-20T10:30:00.000Z',
            status: 'Completed',
            referenceId: 'REF-7192843',
            sourceAccount: '1004829104',
            destinationAccount: '1004829105'
          },
          {
            id: 'tx_004',
            userId: 'usr_001',
            accountId: 'acc_002',
            type: 'credit',
            description: 'Internal Transfer from Primary Checking',
            amount: 1000.00,
            date: '2026-10-20T10:30:00.000Z',
            status: 'Completed',
            referenceId: 'REF-7192843',
            sourceAccount: '1004829104',
            destinationAccount: '1004829105'
          },
          {
            id: 'tx_005',
            userId: 'usr_001',
            accountId: 'acc_001',
            type: 'credit',
            description: 'Client Strategy Consulting Retainer',
            amount: 1850.00,
            date: '2026-10-18T16:45:00.000Z',
            status: 'Completed',
            referenceId: 'REF-6291048',
            sourceAccount: 'Apex Client Wire',
            destinationAccount: '1004829104'
          },
          {
            id: 'tx_006',
            userId: 'usr_001',
            accountId: 'acc_001',
            type: 'debit',
            description: 'Whole Foods Market Grocery',
            amount: 88.42,
            date: '2026-10-16T18:20:00.000Z',
            status: 'Completed',
            referenceId: 'REF-5102947',
            sourceAccount: '1004829104',
            destinationAccount: 'Point of Sale Merchant'
          },
          {
            id: 'tx_007',
            userId: 'usr_001',
            accountId: 'acc_001',
            type: 'debit',
            description: 'Home Mortgage Monthly Amortization',
            amount: 2100.00,
            date: '2026-10-15T08:00:00.000Z',
            status: 'Completed',
            referenceId: 'REF-4091823',
            sourceAccount: '1004829104',
            destinationAccount: 'Summit Mortgage Group'
          },
          {
            id: 'tx_008',
            userId: 'usr_001',
            accountId: 'acc_002',
            type: 'credit',
            description: 'High-Yield Monthly APY Interest Credit',
            amount: 82.15,
            date: '2026-10-01T00:05:00.000Z',
            status: 'Completed',
            referenceId: 'REF-3091824',
            sourceAccount: 'Apex Bank Interest Disbursal',
            destinationAccount: '1004829105'
          }
        ]
      };
      saveDb(seeded);
      return res.json({ success: true, message: 'Database reset to default seed data.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to reset database.' });
    }
  });

  // Mount Vite middleware for dev or serve static files in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Apex Bank Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
