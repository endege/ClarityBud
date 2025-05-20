
// src/app/actions/budgets.actions.ts
'use server';

import { getDb } from '@/lib/db';
import type { Budget } from '@/types';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

export interface BudgetFormData {
  categoryId: string;
  limitAmount: number;
  period: 'monthly' | 'weekly' | 'yearly';
}

export async function getBudgets(): Promise<Budget[]> {
  const db = await getDb();
  try {
    // Join with categories to get categoryName, icon, color for display
    // Explicitly alias limit_amount to limitAmount
    const budgets = await db.all<Budget[]>(`
      SELECT 
        b.id, 
        b.categoryId, 
        b.limit_amount as limitAmount, 
        b.period, 
        c.name as categoryName, 
        c.icon as categoryIcon, 
        c.color as categoryColor
      FROM budgets b
      JOIN categories c ON b.categoryId = c.id
      ORDER BY c.name ASC
    `);
    return budgets;
  } catch (error) {
    console.error('Failed to fetch budgets:', error);
    return [];
  }
}

export async function getBudgetById(id: string): Promise<Budget | null> {
  const db = await getDb();
  try {
    // Explicitly alias limit_amount to limitAmount
    const budget = await db.get<Budget>(`
      SELECT 
        b.id, 
        b.categoryId, 
        b.limit_amount as limitAmount, 
        b.period, 
        c.name as categoryName, 
        c.icon as categoryIcon, 
        c.color as categoryColor
      FROM budgets b
      JOIN categories c ON b.categoryId = c.id
      WHERE b.id = ?
    `, id);
    return budget || null;
  } catch (error) {
    console.error(`Failed to fetch budget ${id}:`, error);
    return null;
  }
}


export async function addBudget(data: BudgetFormData): Promise<{ success: boolean; message?: string; budget?: Budget }> {
  const db = await getDb();
  const newId = randomUUID();

  // Server-side validation for limitAmount
  if (typeof data.limitAmount !== 'number' || !isFinite(data.limitAmount) || data.limitAmount <= 0) {
    return { success: false, message: 'Budget limit must be a positive number.' };
  }

  try {
    await db.run(
      'INSERT INTO budgets (id, categoryId, limit_amount, period) VALUES (?, ?, ?, ?)',
      newId,
      data.categoryId,
      data.limitAmount,
      data.period
    );
    revalidatePath('/budgets');
    revalidatePath('/dashboard');
    revalidatePath('/analytics');
    
    const newBudget = await getBudgetById(newId);
    return { success: true, budget: newBudget || undefined };
  } catch (error: any) {
    console.error('Failed to add budget:', error);
    if (error.message?.includes('UNIQUE constraint failed: budgets.categoryId')) {
      return { success: false, message: 'A budget for this category already exists.' };
    }
    if (error.message?.includes('NOT NULL constraint failed')) {
      return { success: false, message: 'Failed to add budget. Required information is missing or invalid.' };
    }
    return { success: false, message: error.message || 'Failed to add budget.' };
  }
}

export async function updateBudget(id: string, data: BudgetFormData): Promise<{ success: boolean; message?: string; budget?: Budget }> {
  const db = await getDb();

  // Server-side validation for limitAmount
  if (typeof data.limitAmount !== 'number' || !isFinite(data.limitAmount) || data.limitAmount <= 0) {
    return { success: false, message: 'Budget limit must be a positive number.' };
  }

  try {
    // categoryId cannot be changed for an existing budget due to UNIQUE constraint,
    // so we don't update it. If user wants to change category, they should delete and add new.
    await db.run(
      'UPDATE budgets SET limit_amount = ?, period = ? WHERE id = ?',
      data.limitAmount,
      data.period,
      id
    );
    revalidatePath('/budgets');
    revalidatePath('/dashboard');
    revalidatePath('/analytics');

    const updatedBudget = await getBudgetById(id);
    return { success: true, budget: updatedBudget || undefined };
  } catch (error: any) {
    console.error('Failed to update budget:', error);
     if (error.message?.includes('NOT NULL constraint failed')) {
      return { success: false, message: 'Failed to update budget. Required information is missing or invalid.' };
    }
    return { success: false, message: error.message || 'Failed to update budget.' };
  }
}

export async function deleteBudget(id: string): Promise<{ success: boolean; message?: string }> {
  const db = await getDb();
  try {
    await db.run('DELETE FROM budgets WHERE id = ?', id);
    revalidatePath('/budgets');
    revalidatePath('/dashboard');
    revalidatePath('/analytics');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete budget:', error);
    return { success: false, message: error.message || 'Failed to delete budget.' };
  }
}


// For import/export
export async function getAllBudgets(): Promise<Budget[]> {
  const db = await getDb();
  try {
    // Fetch raw budget data without category joins, as category data will be exported separately
    // Ensure limit_amount is aliased to limitAmount here too for consistency.
    const budgets = await db.all<Budget[]>(`
      SELECT b.id, b.categoryId, b.limit_amount as limitAmount, b.period 
      FROM budgets b
    `);
    return budgets;
  } catch (error) {
    console.error('Failed to fetch all budgets for export:', error);
    return [];
  }
}

export async function importBudgets(budgets: Budget[]): Promise<{ success: boolean; message?: string; count?: number }> {
  const db = await getDb();
  try {
    await db.run('DELETE FROM budgets'); // Clear existing budgets
    let importedCount = 0;
    for (const budget of budgets) {
      // Ensure categoryId for each budget exists
      const categoryExists = await db.get('SELECT 1 FROM categories WHERE id = ?', budget.categoryId);
      if (categoryExists) {
        // Server-side validation for limitAmount during import
        if (typeof budget.limitAmount !== 'number' || !isFinite(budget.limitAmount) || budget.limitAmount <= 0) {
          console.warn(`Skipping budget import for categoryId ${budget.categoryId} due to invalid limitAmount: ${budget.limitAmount}`);
          continue;
        }
        await db.run(
          'INSERT INTO budgets (id, categoryId, limit_amount, period) VALUES (?, ?, ?, ?)',
          budget.id || randomUUID(),
          budget.categoryId,
          budget.limitAmount,
          budget.period
        );
        importedCount++;
      } else {
         console.warn(`Skipping budget import due to missing categoryId: ${budget.categoryId}`);
      }
    }
    revalidatePath('/budgets');
    revalidatePath('/dashboard');
    revalidatePath('/analytics');
    return { success: true, count: importedCount };
  } catch (error: any) {
    console.error('Failed to import budgets:', error);
    return { success: false, message: error.message || 'Failed to import budgets.' };
  }
}

