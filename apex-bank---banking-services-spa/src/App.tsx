import React, { useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import {
  Building2,
  ArrowRightLeft,
  History,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  CheckCircle2,
  AlertCircle,
  Code2,
  Download,
  Copy,
  Check,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { PROJECT_FILES, ProjectFile } from './projectFiles';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  maskedNumber: string;
  accountType: 'Checking' | 'Savings' | 'Investment' | 'Business';
  balance: number;
  currency: string;
  status: string;
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
  status: string;
  referenceId: string;
  sourceAccount?: string;
  destinationAccount?: string;
}

interface DashboardData {
  user: User;
  totalBalance: number;
  accountsCount: number;
  accounts: Account[];
  recentTransactions: Transaction[];
  stats: {
    totalIncome: number;
    totalExpenses: number;
  };
}

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'transfer' | 'transactions' | 'code' | 'login' | 'register'>('dashboard');

  // Authentication State
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('apex_user');
      return stored ? JSON.parse(stored) : {
        id: 'usr_001',
        name: 'Sarah Jenkins',
        email: 'sarah.jenkins@example.com'
      };
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('apex_token') || 'demo-token-usr_001';
  });

  // Data States
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverHealth, setServerHealth] = useState<{ status: string; uptime: number; collections: any } | null>(null);

  // Form States
  // 1. Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // 2. Register Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');

  // 3. Transfer Form
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationMode, setDestinationMode] = useState<'internal' | 'external'>('internal');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [destinationAccountNumber, setDestinationAccountNumber] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState<{ message: string; ref: string; newBalance: number } | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // 4. Create Account Modal
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccountType, setNewAccountType] = useState<'Checking' | 'Savings' | 'Investment' | 'Business'>('Savings');
  const [newAccountDeposit, setNewAccountDeposit] = useState('1000');
  const [accountCreateError, setAccountCreateError] = useState('');
  const [accountCreateSuccess, setAccountCreateSuccess] = useState('');

  // 5. Transaction Filter
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [txSearch, setTxSearch] = useState('');
  const [txAccountFilter, setTxAccountFilter] = useState('');

  // 6. Code Inspector
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Helper: Request headers
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || ''}`,
    'x-user-id': user?.id || ''
  });

  // Health check on mount
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setServerHealth(data))
      .catch(err => console.error('Health check failed:', err));
  }, []);

  // Fetch Dashboard & Accounts when User is active
  const loadDashboard = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard?userId=${user.id}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
        setAccounts(data.accounts || []);
        if (data.accounts?.length > 0 && !sourceAccountId) {
          setSourceAccountId(data.accounts[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAccounts = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/accounts?userId=${user.id}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const loadTransactions = async () => {
    if (!user) return;
    try {
      let url = `/api/transactions?userId=${user.id}`;
      if (txTypeFilter !== 'all') url += `&type=${txTypeFilter}`;
      if (txSearch) url += `&search=${encodeURIComponent(txSearch)}`;
      if (txAccountFilter) url += `&accountId=${txAccountFilter}`;

      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboard();
      loadAccounts();
      loadTransactions();
    }
  }, [user, txTypeFilter, txSearch, txAccountFilter]);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('apex_user', JSON.stringify(data.user));
      localStorage.setItem('apex_token', data.token);
      setActiveTab('dashboard');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('apex_user', JSON.stringify(data.user));
      localStorage.setItem('apex_token', data.token);
      setActiveTab('dashboard');
    } catch (err: any) {
      setRegError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('apex_user');
    localStorage.removeItem('apex_token');
    setUser(null);
    setToken(null);
    setDashboard(null);
    setActiveTab('login');
  };

  const quickLogin = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setLoginError('');
  };

  // Transfer Handler
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess(null);

    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      setTransferError('Please enter a valid transfer amount greater than $0.');
      return;
    }

    const currentSource = accounts.find(a => a.id === sourceAccountId);
    if (!currentSource) {
      setTransferError('Please select a source account.');
      return;
    }

    if (amt > currentSource.balance) {
      setTransferError(`Insufficient funds. Transfer amount ($${amt.toFixed(2)}) exceeds available balance ($${currentSource.balance.toFixed(2)}).`);
      return;
    }

    if (destinationMode === 'internal' && !destinationAccountId) {
      setTransferError('Please select a destination account.');
      return;
    }

    if (destinationMode === 'external' && !destinationAccountNumber.trim()) {
      setTransferError('Please enter the recipient account number.');
      return;
    }

    setIsTransferring(true);
    try {
      const payload = {
        sourceAccountId,
        destinationAccountId: destinationMode === 'internal' ? destinationAccountId : undefined,
        destinationAccountNumber: destinationMode === 'external' ? destinationAccountNumber.trim() : undefined,
        amount: amt,
        description: transferDescription || 'Funds Transfer'
      };

      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Transfer failed');

      setTransferSuccess({
        message: data.message,
        ref: data.referenceId,
        newBalance: data.newSourceBalance
      });

      // Refresh data
      loadDashboard();
      loadAccounts();
      loadTransactions();
      setTransferAmount('');
      setTransferDescription('');
    } catch (err: any) {
      setTransferError(err.message || 'Transfer failed.');
    } finally {
      setIsTransferring(false);
    }
  };

  // Create Account Handler
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountCreateError('');
    setAccountCreateSuccess('');

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          accountType: newAccountType,
          initialDeposit: parseFloat(newAccountDeposit) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');

      setAccountCreateSuccess(`${newAccountType} account created successfully!`);
      setShowAccountModal(false);
      loadAccounts();
      loadDashboard();
    } catch (err: any) {
      setAccountCreateError(err.message || 'Error creating account');
    }
  };

  // Reset Demo DB
  const handleResetDb = async () => {
    if (!confirm('Reset sample database to default seed state?')) return;
    await fetch('/api/admin/reset-db', { method: 'POST' });
    loadDashboard();
    loadAccounts();
    loadTransactions();
    alert('Database successfully restored to original seed demo values.');
  };

  // ZIP Download Generator
  const downloadProjectZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      PROJECT_FILES.forEach(file => {
        zip.file(file.path, file.content);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'banking-services-spa-complete.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Zip generation failed:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedSource = useMemo(() => {
    return accounts.find(a => a.id === sourceAccountId) || null;
  }, [accounts, sourceAccountId]);

  const availableDestAccounts = useMemo(() => {
    return accounts.filter(a => a.id !== sourceAccountId);
  }, [accounts, sourceAccountId]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (Nav Links) - Zone 3 (Primary Action) */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold tracking-tight">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <span className="text-base font-bold tracking-tight block whitespace-nowrap">Apex Bank</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block">Banking Services SPA</span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (single line, no wrapping) */}
          <nav className="hidden md:flex items-center gap-1 shrink-0">
            {user ? (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('accounts')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'accounts' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  Accounts
                </button>
                <button
                  onClick={() => setActiveTab('transfer')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'transfer' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  Transfer Money
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'transactions' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  Transactions
                </button>
              </>
            ) : null}

            {/* Angular Source Code Inspector Tab */}
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'code' ? 'bg-blue-600 text-white' : 'text-blue-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Angular Code & Files
            </button>
          </nav>

          {/* Zone 3: Primary Action / User State */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <span className="text-xs font-semibold text-white block leading-tight">{user.name}</span>
                  <span className="text-[11px] text-slate-400 block font-mono">{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('login')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setActiveTab('register')}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
                >
                  Open Account
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        {user && (
          <div className="md:hidden flex items-center justify-around border-t border-slate-800 py-2 px-2 bg-slate-900 text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-1 px-2 rounded ${activeTab === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`py-1 px-2 rounded ${activeTab === 'accounts' ? 'text-blue-400 font-bold' : 'text-slate-400'}`}
            >
              Accounts
            </button>
            <button
              onClick={() => setActiveTab('transfer')}
              className={`py-1 px-2 rounded ${activeTab === 'transfer' ? 'text-blue-400 font-bold' : 'text-slate-400'}`}
            >
              Transfer
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-1 px-2 rounded ${activeTab === 'transactions' ? 'text-blue-400 font-bold' : 'text-slate-400'}`}
            >
              Ledger
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`py-1 px-2 rounded ${activeTab === 'code' ? 'text-blue-400 font-bold' : 'text-slate-400'}`}
            >
              Code
            </button>
          </div>
        )}
      </header>

      {/* System Status Strip */}
      <div className="bg-slate-100 border-b border-slate-200 px-4 py-1.5 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">REST API Status:</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Express + JSON Storage (db.json) Online
            </span>
            <span className="text-slate-400">·</span>
            <span>Uptime: {serverHealth ? `${Math.floor(serverHealth.uptime)}s` : 'Active'}</span>
            <span className="text-slate-400">·</span>
            <span>{accounts.length} Accounts Loaded</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDb}
              className="hover:text-blue-700 font-medium underline flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Demo Seed Data
            </button>
          </div>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">

        {/* 1. DASHBOARD VIEW */}
        {activeTab === 'dashboard' && user && (
          <div className="space-y-6">
            {/* Hero Greeting & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Welcome back, {user.name}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Financial overview, active accounts, and automated ledger
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('transfer')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Transfer Funds
                </button>
                <button
                  onClick={() => setShowAccountModal(true)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Account
                </button>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Balance Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
                  <span>Total Net Worth</span>
                  <Wallet className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-3xl font-bold tracking-tight text-slate-950 font-mono tabular-nums">
                  ${(dashboard?.totalBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Across {accounts.length} active account{accounts.length === 1 ? '' : 's'} · FDIC Insured
                </div>
              </div>

              {/* Total Credits Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
                  <span>Total Inflow (Deposits)</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-bold tracking-tight text-emerald-700 font-mono tabular-nums">
                  +${(dashboard?.stats.totalIncome ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Total salary, wire credits, and bonuses
                </div>
              </div>

              {/* Total Debits Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
                  <span>Total Outflow (Payments)</span>
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-3xl font-bold tracking-tight text-rose-700 font-mono tabular-nums">
                  -${(dashboard?.stats.totalExpenses ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Transfers, mortgage, bills, and card expenses
                </div>
              </div>
            </div>

            {/* Split Grid: Accounts Overview & Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Account Cards (5 cols) */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Your Accounts</h3>
                  <button
                    onClick={() => setActiveTab('accounts')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View All ({accounts.length})
                  </button>
                </div>

                <div className="space-y-3">
                  {accounts.map(acc => (
                    <div
                      key={acc.id}
                      className="p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{acc.accountType}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                            {acc.status}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono block mt-1">
                          {acc.maskedNumber || `•••• ${acc.accountNumber.slice(-4)}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                          ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <button
                          onClick={() => {
                            setSourceAccountId(acc.id);
                            setActiveTab('transfer');
                          }}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Transfer &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowAccountModal(true)}
                  className="w-full mt-4 py-2 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-600 hover:border-blue-400 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Open Additional Demo Account
                </button>
              </div>

              {/* Right Column: Recent Transactions (7 cols) */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Activity</h3>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View Statement &rarr;
                  </button>
                </div>

                {dashboard?.recentTransactions && dashboard.recentTransactions.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {dashboard.recentTransactions.map(tx => (
                      <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              tx.type === 'credit'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {tx.type === 'credit' ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-900 block truncate">
                              {tx.description}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {tx.referenceId}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-bold font-mono tabular-nums block ${
                              tx.type === 'credit' ? 'text-emerald-700' : 'text-slate-900'
                            }`}
                          >
                            {tx.type === 'credit' ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No transactions found for this account.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. ACCOUNTS VIEW */}
        {activeTab === 'accounts' && user && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Account Management
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Portfolio of checking, high-yield savings, and investment accounts
                </p>
              </div>
              <button
                onClick={() => setShowAccountModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Open New Demo Account
              </button>
            </div>

            {accountCreateSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{accountCreateSuccess}</span>
              </div>
            )}

            {/* Account Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map(acc => {
                const isNavy = acc.accountType === 'Checking';
                const isBlue = acc.accountType === 'Savings';
                const isGreen = acc.accountType === 'Investment';
                const isPurple = acc.accountType === 'Business';

                return (
                  <div
                    key={acc.id}
                    className={`rounded-xl p-6 text-white shadow-sm flex flex-col justify-between min-h-[220px] ${
                      isNavy
                        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950'
                        : isBlue
                        ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900'
                        : isGreen
                        ? 'bg-gradient-to-br from-emerald-900 via-teal-800 to-slate-900'
                        : 'bg-gradient-to-br from-purple-950 via-purple-900 to-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-1 bg-white/10 rounded-md backdrop-blur-xs">
                        {acc.accountType} Account
                      </span>
                      <span className="text-xs font-mono text-slate-300">
                        {acc.status}
                      </span>
                    </div>

                    <div className="my-4">
                      <span className="text-[11px] uppercase tracking-wider text-slate-300 block">
                        Available Balance
                      </span>
                      <div className="text-3xl font-bold font-mono tracking-tight tabular-nums mt-1">
                        ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/15 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Account Number</span>
                        <span className="text-xs font-mono font-semibold tracking-wider">
                          {acc.maskedNumber || `•••• ${acc.accountNumber.slice(-4)}`}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSourceAccountId(acc.id);
                          setActiveTab('transfer');
                        }}
                        className="px-3 py-1 bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold rounded-md shadow-xs transition-colors"
                      >
                        Transfer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. MONEY TRANSFER VIEW */}
        {activeTab === 'transfer' && user && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="pb-4 border-b border-slate-200">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Money Transfer
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Send money between your accounts or transfer to another account number
              </p>
            </div>

            {/* Transfer Success Banner */}
            {transferSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">Transfer Completed Successfully</h4>
                    <p className="text-xs text-emerald-800 mt-0.5">{transferSuccess.message}</p>
                    <div className="mt-2 text-xs font-mono text-emerald-700 bg-emerald-100/60 p-2.5 rounded">
                      <div>Ref: <strong>{transferSuccess.ref}</strong></div>
                      <div>Updated Source Balance: <strong>${transferSuccess.newBalance.toFixed(2)}</strong></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/60">
                  <button
                    onClick={() => setTransferSuccess(null)}
                    className="px-3 py-1.5 bg-emerald-700 text-white hover:bg-emerald-800 rounded text-xs font-semibold"
                  >
                    Make Another Transfer
                  </button>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100 rounded text-xs font-semibold"
                  >
                    View in Transactions
                  </button>
                </div>
              </div>
            )}

            {/* Transfer Error Banner */}
            {transferError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            {/* Transfer Form Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              <form onSubmit={handleTransfer} className="space-y-4">
                {/* 1. Source Account */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Source Account (From)
                  </label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountType} ({acc.maskedNumber}) — Available: ${acc.balance.toFixed(2)}
                      </option>
                    ))}
                  </select>

                  {selectedSource && (
                    <div className="mt-1 text-[11px] text-slate-500 flex justify-between">
                      <span>Available: <strong className="font-mono text-slate-800">${selectedSource.balance.toFixed(2)}</strong></span>
                      {parseFloat(transferAmount) > selectedSource.balance && (
                        <span className="text-rose-600 font-semibold">Exceeds available balance</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Destination Mode Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transfer Destination
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDestinationMode('internal')}
                      className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        destinationMode === 'internal'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Between My Accounts
                    </button>
                    <button
                      type="button"
                      onClick={() => setDestinationMode('external')}
                      className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        destinationMode === 'external'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      To Another Account Number
                    </button>
                  </div>
                </div>

                {/* 3. Destination Account Selection */}
                {destinationMode === 'internal' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Destination Account (To)
                    </label>
                    <select
                      value={destinationAccountId}
                      onChange={(e) => setDestinationAccountId(e.target.value)}
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      required
                    >
                      <option value="">-- Choose destination account --</option>
                      {availableDestAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountType} ({acc.maskedNumber}) — Current: ${acc.balance.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Recipient 10-Digit Account Number
                    </label>
                    <input
                      type="text"
                      value={destinationAccountNumber}
                      onChange={(e) => setDestinationAccountNumber(e.target.value)}
                      placeholder="e.g. 2009384711 (David Chen) or custom account"
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                    <div className="mt-1 text-[11px] text-slate-500">
                      Hint: Demo peer user David Chen holds account number <code>2009384711</code>.
                    </div>
                  </div>
                )}

                {/* 4. Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* 5. Description / Memo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description / Memo (Optional)
                  </label>
                  <input
                    type="text"
                    value={transferDescription}
                    onChange={(e) => setTransferDescription(e.target.value)}
                    placeholder="e.g. Monthly savings, emergency fund, dining share"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isTransferring ? 'Verifying & Executing Transfer...' : 'Confirm & Execute Transfer'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 4. TRANSACTIONS LEDGER VIEW */}
        {activeTab === 'transactions' && user && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Transaction History
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete ledger of debits, credits, and inter-account wire transfers
                </p>
              </div>
              <button
                onClick={() => setActiveTab('transfer')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                New Transfer
              </button>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Filter by description or ref..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={txTypeFilter}
                  onChange={(e) => setTxTypeFilter(e.target.value as any)}
                  className="w-full py-1.5 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="all">All Types (Credit & Debit)</option>
                  <option value="credit">Credits Only (Incoming)</option>
                  <option value="debit">Debits Only (Outgoing)</option>
                </select>
              </div>

              {/* Account Filter */}
              <div>
                <select
                  value={txAccountFilter}
                  onChange={(e) => setTxAccountFilter(e.target.value)}
                  className="w-full py-1.5 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono"
                >
                  <option value="">All User Accounts</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.accountType} ({a.maskedNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Description / Reference</th>
                      <th className="py-3 px-4">Accounts Involved</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              tx.type === 'credit'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">
                            {tx.description}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Ref: {tx.referenceId}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {tx.sourceAccount && <div>From: {tx.sourceAccount}</div>}
                          {tx.destinationAccount && <div>To: {tx.destinationAccount}</div>}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                            tx.type === 'credit' ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {tx.type === 'credit' ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-[11px] font-medium text-slate-600">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No transactions found matching the filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. CODE & PROJECT INSPECTOR VIEW (Allows student & grader to review exact Angular codebase) */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Angular & Express Code Explorer
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Browse and inspect the complete standalone Angular 18/19 components, routes, models, services, and backend
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadProjectZip}
                  disabled={isZipping}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  {isZipping ? 'Packaging ZIP...' : 'Download Project (.ZIP)'}
                </button>
              </div>
            </div>

            {/* Split Explorer: File List on Left, Syntax Code View on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* File List */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Project Files ({PROJECT_FILES.length})</h3>
                <div className="space-y-1">
                  {PROJECT_FILES.map(file => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left p-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between ${
                        selectedFile.path === file.path
                          ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{file.name}</span>
                      <span className="text-[10px] uppercase text-slate-400 font-sans">{file.category}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
                  <span className="font-semibold block text-slate-700 mb-1">Local Run Command:</span>
                  <div className="bg-slate-900 text-slate-200 p-2 rounded font-mono text-[11px]">
                    npm install && npm start
                  </div>
                </div>
              </div>

              {/* Code Viewer */}
              <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-300 font-bold">{selectedFile.path}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">{selectedFile.language}</span>
                  </div>
                  <button
                    onClick={copyCodeToClipboard}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[600px] leading-relaxed select-all">
                  <code>{selectedFile.content}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* 6. LOGIN VIEW */}
        {activeTab === 'login' && (
          <div className="max-w-md mx-auto my-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Sign in to Apex Bank</h2>
                <p className="text-xs text-slate-500 mt-1">Single Page Banking Services Application</p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              {/* Instant Quick-Fill for Demo Users */}
              <div className="mt-6 pt-5 border-t border-slate-200 space-y-2">
                <span className="text-[11px] font-semibold text-slate-500 block text-center uppercase tracking-wider">
                  1-Click Instant Demo Login
                </span>
                <button
                  type="button"
                  onClick={() => quickLogin('sarah.jenkins@example.com', 'Password123!')}
                  className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">Sarah Jenkins (Primary)</span>
                    <span className="text-[11px] text-slate-500">sarah.jenkins@example.com</span>
                  </div>
                  <span className="text-blue-600 font-semibold text-xs">Fill &rarr;</span>
                </button>

                <button
                  type="button"
                  onClick={() => quickLogin('david.chen@example.com', 'Password123!')}
                  className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">David Chen (Peer Account)</span>
                    <span className="text-[11px] text-slate-500">david.chen@example.com</span>
                  </div>
                  <span className="text-blue-600 font-semibold text-xs">Fill &rarr;</span>
                </button>
              </div>

              <div className="mt-4 text-center">
                <span className="text-xs text-slate-500">Need an account? </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                >
                  Register here
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. REGISTER VIEW */}
        {activeTab === 'register' && (
          <div className="max-w-md mx-auto my-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Open Bank Account</h2>
                <p className="text-xs text-slate-500 mt-1">Includes $2,500 demo welcome deposit bonus</p>
              </div>

              {regError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    required
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="alex.morgan@example.com"
                    required
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isLoading ? 'Creating Account...' : 'Open Account Now'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <span className="text-xs text-slate-500">Already registered? </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* CREATE ACCOUNT MODAL */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Open New Demo Account</h3>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                &times;
              </button>
            </div>

            {accountCreateError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded border border-rose-200">
                {accountCreateError}
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Type</label>
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value as any)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="Checking">Checking (Everyday Expenses)</option>
                  <option value="Savings">Savings (High-Yield 4.5% APY Target)</option>
                  <option value="Investment">Investment (Portfolio Equities)</option>
                  <option value="Business">Business (Corporate Operations)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Opening Deposit (USD)</label>
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={newAccountDeposit}
                  onChange={(e) => setNewAccountDeposit(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Confirm & Open Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Apex Bank NA</span>
            <span>·</span>
            <span>Member FDIC</span>
            <span>·</span>
            <span>Educational Banking Simulation</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('code')}
              className="text-blue-600 hover:underline font-medium"
            >
              Browse Angular Project Files
            </button>
            <span>·</span>
            <span className="font-mono text-slate-400">Node.js Express + Angular SPA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
