export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
  color: string;
  emoji: string;
}

export type View =
  | 'dashboard'
  | 'expenses'
  | 'add'
  | 'scanner'
  | 'advisor'
  | 'categories'
  | 'goals'
  | 'import'
  | 'banksync'
  | 'subscriptions';
