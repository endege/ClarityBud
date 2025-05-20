
import type { LucideIcon } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  icon?: string; // Store icon name as string
  color?: string; // Optional color for category visualization
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string; // ISO string date
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName?: string; // Optional: denormalized for convenience, populated by server actions
  categoryIcon?: string; // Optional: denormalized
  categoryColor?: string; // Optional: denormalized
}

export interface Budget {
  id: string;
  categoryId: string;
  limitAmount: number; // Renamed from 'limit' - this should be a number
  // spentAmount is no longer stored directly; calculated on client based on transactions
  period: 'monthly' | 'weekly' | 'yearly'; // Budget period
  categoryName?: string; // Optional: denormalized
  categoryIcon?: string; // Optional: denormalized
  categoryColor?: string; // Optional: denormalized
}

// For User Settings stored in DB
export interface AppSetting {
  key: string;
  value: string; // Store stringified JSON for complex objects
}


// For AI suggestions
export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  estimatedSavings?: number;
}
