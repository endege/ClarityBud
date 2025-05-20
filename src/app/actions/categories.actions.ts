
// src/app/actions/categories.actions.ts
'use server';

import { getDb } from '@/lib/db';
import type { Category } from '@/types';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

// Helper type for form data
type CategoryFormData = Omit<Category, 'id'>;


export async function getCategories(): Promise<Category[]> {
  const db = await getDb();
  try {
    const categories = await db.all<Category[]>('SELECT * FROM categories ORDER BY name ASC');
    return categories;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return []; 
  }
}

export async function addCategory(data: CategoryFormData): Promise<{ success: boolean; message?: string; category?: Category }> {
  const db = await getDb();
  const newId = randomUUID();
  try {
    await db.run(
      'INSERT INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?)',
      newId,
      data.name,
      data.icon,
      data.color
    );
    revalidatePath('/categories');
    revalidatePath('/analytics'); 
    revalidatePath('/budgets');
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    const newCategory = { id: newId, ...data };
    return { success: true, category: newCategory };
  } catch (error: any) {
    console.error('Failed to add category:', error);
    return { success: false, message: error.message || 'Failed to add category.' };
  }
}

export async function updateCategory(id: string, data: CategoryFormData): Promise<{ success: boolean; message?: string; category?: Category }> {
  const db = await getDb();
  try {
    await db.run(
      'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?',
      data.name,
      data.icon,
      data.color,
      id
    );
    revalidatePath('/categories');
    revalidatePath('/analytics');
    revalidatePath('/budgets');
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    const updatedCategory = { id, ...data };
    return { success: true, category: updatedCategory };
  } catch (error: any) {
    console.error('Failed to update category:', error);
    return { success: false, message: error.message || 'Failed to update category.' };
  }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; message?: string }> {
  const db = await getDb();
  try {
    // Foreign key constraints with ON DELETE CASCADE in transactions and budgets
    // will handle deletion of associated records.
    await db.run('DELETE FROM categories WHERE id = ?', id);
    revalidatePath('/categories');
    revalidatePath('/analytics');
    revalidatePath('/budgets');
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any)
   {
    console.error('Failed to delete category:', error);
    // Check for foreign key constraint error if not using ON DELETE CASCADE
    if (error.message?.includes('FOREIGN KEY constraint failed')) {
      return { success: false, message: 'Category is in use by transactions or budgets and cannot be deleted. Please remove associated items first.' };
    }
    return { success: false, message: error.message || 'Failed to delete category.' };
  }
}

// For import/export
export async function getAllCategories(): Promise<Category[]> {
  return getCategories(); // Same logic for now
}

export async function importCategories(categories: Category[]): Promise<{ success: boolean; message?: string; count?: number }> {
  const db = await getDb();
  try {
    await db.run('DELETE FROM categories'); // Clear existing categories
    // This will also cascade delete transactions and budgets due to FK constraints.
    // This might be too aggressive. Consider alternative strategies for real app (e.g. merge, update).
    // For this exercise, a full clear and replace is simpler.
    let importedCount = 0;
    for (const cat of categories) {
       await db.run(
        'INSERT INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?)',
        cat.id || randomUUID(), // Ensure ID exists
        cat.name,
        cat.icon,
        cat.color
      );
      importedCount++;
    }
    revalidatePath('/categories');
    revalidatePath('/analytics'); 
    revalidatePath('/budgets');
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    return { success: true, count: importedCount };
  } catch (error: any) {
    console.error('Failed to import categories:', error);
    return { success: false, message: error.message || 'Failed to import categories.' };
  }
}
