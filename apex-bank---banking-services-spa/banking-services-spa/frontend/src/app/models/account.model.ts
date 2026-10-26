export type AccountType = 'Checking' | 'Savings' | 'Investment' | 'Business';

export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  maskedNumber?: string;
  accountType: AccountType;
  balance: number;
  currency: string;
  status: 'Active' | 'Frozen' | 'Closed';
  createdAt: string;
}

export interface CreateAccountRequest {
  accountType: AccountType;
  initialDeposit: number;
}
