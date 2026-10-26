import { Account } from './account.model';

export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'Completed' | 'Pending' | 'Failed';

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  referenceId: string;
  sourceAccount?: string;
  destinationAccount?: string;
}

export interface TransferRequest {
  sourceAccountId: string;
  destinationAccountId?: string;
  destinationAccountNumber?: string;
  amount: number;
  description: string;
}

export interface TransferResponse {
  success: boolean;
  message: string;
  referenceId: string;
  newSourceBalance: number;
  sourceAccount: {
    id: string;
    accountNumber: string;
    maskedNumber: string;
    balance: number;
  };
  error?: string;
}

export interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
  };
  totalBalance: number;
  accountsCount: number;
  accounts: Account[];
  recentTransactions: Transaction[];
  stats: {
    totalIncome: number;
    totalExpenses: number;
  };
}
