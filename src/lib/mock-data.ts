
import type { Category, Transaction, Budget } from '@/types';

// This mockCategories array is now primarily used for initial DB seeding.
// UI components should fetch categories from the database via server actions.
export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Housing', icon: 'Home', color: 'hsl(var(--chart-1))' },
  { id: 'cat-2', name: 'Food', icon: 'Utensils', color: 'hsl(var(--chart-2))' },
  { id: 'cat-3', name: 'Transportation', icon: 'Car', color: 'hsl(var(--chart-3))' },
  { id: 'cat-4', name: 'Entertainment', icon: 'Gamepad2', color: 'hsl(var(--chart-4))' },
  { id: 'cat-5', name: 'Utilities', icon: 'Lightbulb', color: 'hsl(190, 60%, 60%)' }, // Blueish
  { id: 'cat-6', name: 'Healthcare', icon: 'Stethoscope', color: 'hsl(var(--primary))' },
  { id: 'cat-7', name: 'Shopping', icon: 'ShoppingBag', color: 'hsl(var(--accent))' },
  { id: 'cat-8', name: 'Subscriptions', icon: 'Wifi', color: 'hsl(200, 70%, 60%)' },
  { id: 'cat-9', name: 'Personal Care', icon: 'Shirt', color: 'hsl(300, 70%, 60%)' },
  { id: 'cat-10', name: 'Other Income', icon: 'CircleDollarSign', color: 'hsl(120, 40%, 65%)' }, // Greenish for income
  { id: 'cat-11', name: 'Other Expense', icon: 'Tag', color: 'hsl(0, 0%, 75%)' }, // Light gray for other expenses
];

export const mockTransactions: Transaction[] = [
  { id: 'txn-1', date: new Date(2024, 6, 15).toISOString(), description: 'Grocery shopping at Trader Joe\'s', amount: 75.50, type: 'expense', categoryId: 'cat-2' },
  { id: 'txn-2', date: new Date(2024, 6, 14).toISOString(), description: 'Netflix Subscription', amount: 15.99, type: 'expense', categoryId: 'cat-8' },
  { id: 'txn-3', date: new Date(2024, 6, 14).toISOString(), description: 'Dinner with friends', amount: 45.00, type: 'expense', categoryId: 'cat-2' },
  { id: 'txn-4', date: new Date(2024, 6, 13).toISOString(), description: 'Gas fill-up', amount: 55.20, type: 'expense', categoryId: 'cat-3' },
  { id: 'txn-5', date: new Date(2024, 6, 12).toISOString(), description: 'Freelance project payment', amount: 1200.00, type: 'income', categoryId: 'cat-10' }, 
  { id: 'txn-6', date: new Date(2024, 6, 10).toISOString(), description: 'Electricity Bill', amount: 85.00, type: 'expense', categoryId: 'cat-5' },
  { id: 'txn-7', date: new Date(2024, 6, 5).toISOString(), description: 'Rent Payment', amount: 1500.00, type: 'expense', categoryId: 'cat-1' },
  { id: 'txn-8', date: new Date(2024, 6, 20).toISOString(), description: 'Movie tickets', amount: 30.00, type: 'expense', categoryId: 'cat-4' },
  { id: 'txn-9', date: new Date(2024, 6, 22).toISOString(), description: 'New T-shirt', amount: 25.00, type: 'expense', categoryId: 'cat-7' },
  { id: 'txn-10', date: new Date(2024, 6, 1).toISOString(), description: 'Salary Deposit', amount: 3500.00, type: 'income', categoryId: 'cat-10' },
];

// Mock budgets for initial seeding. Note 'limit' becomes 'limitAmount'. 'spent' is ignored.
export const mockBudgets: Omit<Budget, 'categoryName' | 'categoryIcon' | 'categoryColor'>[] = [
  { id: 'bud-1', categoryId: 'cat-1', limitAmount: 1500, period: 'monthly' },
  { id: 'bud-2', categoryId: 'cat-2', limitAmount: 400, period: 'monthly' },
  { id: 'bud-3', categoryId: 'cat-3', limitAmount: 150, period: 'monthly' },
  { id: 'bud-4', categoryId: 'cat-4', limitAmount: 100, period: 'monthly' },
  { id: 'bud-8', categoryId: 'cat-8', limitAmount: 50, period: 'monthly' },
];

// Helper function remains useful, takes categories array as argument
export function getCategoryName(categoryId: string, categories: Category[]): string {
  const category = categories.find(cat => cat.id === categoryId);
  return category?.name || 'Unknown Category';
}

export function getCategoryIconName(categoryId: string, categories: Category[]): string | undefined {
  const category = categories.find(cat => cat.id === categoryId);
  return category?.icon;
}
