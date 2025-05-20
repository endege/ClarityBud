
// src/app/actions/transactions.actions.ts
'use server';

import { getDb } from '@/lib/db';
import type { Transaction, TransactionType } from '@/types';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

export interface TransactionFormData {
  description: string;
  amount: number;
  date: string; // ISO String from client
  type: TransactionType;
  categoryId: string;
}

export async function getTransactions(filters?: {
  searchTerm?: string;
  categoryFilter?: string | 'all';
  typeFilter?: TransactionType | 'all';
  sortKey?: keyof Transaction | string; // Allow string for flexibility if needed, map to actual cols
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
}): Promise<Transaction[]> {
  const db = await getDb();
  try {
    let query = `
      SELECT t.*, c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor
      FROM transactions t
      JOIN categories c ON t.categoryId = c.id
    `;
    const queryParams: any[] = [];
    const conditions: string[] = [];

    if (filters?.searchTerm) {
      conditions.push('t.description LIKE ?');
      queryParams.push(`%${filters.searchTerm}%`);
    }
    if (filters?.categoryFilter && filters.categoryFilter !== 'all') {
      conditions.push('t.categoryId = ?');
      queryParams.push(filters.categoryFilter);
    }
    if (filters?.typeFilter && filters.typeFilter !== 'all') {
      conditions.push('t.type = ?');
      queryParams.push(filters.typeFilter);
    }
    if (filters?.startDate) {
      conditions.push('t.date >= ?');
      queryParams.push(filters.startDate);
    }
    if (filters?.endDate) {
      conditions.push('t.date <= ?');
      queryParams.push(filters.endDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Basic sorting, ensure sortKey is a valid column name to prevent SQL injection if passed directly
    const validSortKeys: (keyof Transaction)[] = ['date', 'description', 'amount', 'type'];
    const sortKey = filters?.sortKey && validSortKeys.includes(filters.sortKey as keyof Transaction) ? filters.sortKey : 'date';
    const sortDirection = filters?.sortDirection === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY t.${sortKey} ${sortDirection}`;

    if (filters?.limit) {
      query += ' LIMIT ?';
      queryParams.push(filters.limit);
    }
    
    const transactions = await db.all<Transaction[]>(query, ...queryParams);
    return transactions;
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return [];
  }
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const db = await getDb();
  try {
    const transaction = await db.get<Transaction>(
     `SELECT t.*, c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor
      FROM transactions t
      JOIN categories c ON t.categoryId = c.id
      WHERE t.id = ?`, id);
    return transaction || null;
  } catch (error) {
    console.error(`Failed to fetch transaction ${id}:`, error);
    return null;
  }
}

export async function addTransaction(data: TransactionFormData): Promise<{ success: boolean; message?: string; transaction?: Transaction }> {
  const db = await getDb();
  const newId = randomUUID();
  try {
    await db.run(
      'INSERT INTO transactions (id, description, amount, date, type, categoryId) VALUES (?, ?, ?, ?, ?, ?)',
      newId,
      data.description,
      data.amount,
      data.date, // Ensure this is an ISO string
      data.type,
      data.categoryId
    );
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    revalidatePath('/analytics');
    revalidatePath('/budgets'); // Spent amounts might change

    const newTransaction = await getTransactionById(newId);
    return { success: true, transaction: newTransaction || undefined };
  } catch (error: any) {
    console.error('Failed to add transaction:', error);
    return { success: false, message: error.message || 'Failed to add transaction.' };
  }
}

export async function updateTransaction(id: string, data: TransactionFormData): Promise<{ success: boolean; message?: string; transaction?: Transaction }> {
  const db = await getDb();
  try {
    await db.run(
      'UPDATE transactions SET description = ?, amount = ?, date = ?, type = ?, categoryId = ? WHERE id = ?',
      data.description,
      data.amount,
      data.date,
      data.type,
      data.categoryId,
      id
    );
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    revalidatePath('/analytics');
    revalidatePath('/budgets');
    
    const updatedTransaction = await getTransactionById(id);
    return { success: true, transaction: updatedTransaction || undefined };
  } catch (error: any) {
    console.error('Failed to update transaction:', error);
    return { success: false, message: error.message || 'Failed to update transaction.' };
  }
}

export async function deleteTransaction(id: string): Promise<{ success: boolean; message?: string }> {
  const db = await getDb();
  try {
    await db.run('DELETE FROM transactions WHERE id = ?', id);
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    revalidatePath('/analytics');
    revalidatePath('/budgets');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete transaction:', error);
    return { success: false, message: error.message || 'Failed to delete transaction.' };
  }
}


// For import/export
export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  try {
    const transactions = await db.all<Transaction[]>('SELECT * FROM transactions ORDER BY date DESC');
    return transactions;
  } catch (error) {
    console.error('Failed to fetch all transactions for export:', error);
    return [];
  }
}

export async function importTransactions(transactions: Transaction[]): Promise<{ success: boolean; message?: string; count?: number }> {
  const db = await getDb();
  try {
    await db.run('DELETE FROM transactions'); // Clear existing transactions
    let importedCount = 0;
    for (const trans of transactions) {
      // Ensure categoryId for each transaction exists, or skip/handle error
      const categoryExists = await db.get('SELECT 1 FROM categories WHERE id = ?', trans.categoryId);
      if (categoryExists) {
        await db.run(
          'INSERT INTO transactions (id, date, description, amount, type, categoryId) VALUES (?, ?, ?, ?, ?, ?)',
          trans.id || randomUUID(), // Ensure ID exists
          trans.date,
          trans.description,
          trans.amount,
          trans.type,
          trans.categoryId
        );
        importedCount++;
      } else {
        console.warn(`Skipping transaction import due to missing categoryId: ${trans.categoryId}`);
      }
    }
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    revalidatePath('/analytics');
    revalidatePath('/budgets');
    return { success: true, count: importedCount };
  } catch (error: any) {
    console.error('Failed to import transactions:', error);
    return { success: false, message: error.message || 'Failed to import transactions.' };
  }
}

// Get total spending for a category within a date range (for budget calculation)
export async function getTotalSpendingForCategory(categoryId: string, startDate: string, endDate: string): Promise<number> {
    const db = await getDb();
    try {
        const result = await db.get<{ total: number }>(
            `SELECT SUM(amount) as total 
             FROM transactions 
             WHERE categoryId = ? AND type = 'expense' AND date >= ? AND date <= ?`,
            categoryId,
            startDate,
            endDate
        );
        return result?.total || 0;
    } catch (error) {
        console.error(`Failed to get total spending for category ${categoryId}:`, error);
        return 0;
    }
}
