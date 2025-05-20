
// src/lib/db.ts
import type { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import type { Category, Transaction, Budget } from '@/types';
import { mockCategories as defaultMockCategories, mockTransactions as defaultMockTransactions, mockBudgets as defaultMockBudgets } from '@/lib/mock-data';
import { randomUUID } from 'crypto';

let db: Database | null = null;

const DB_FILE_NAME = 'claritybud.sqlite';
const DB_FILE_PATH = path.join(process.cwd(), DB_FILE_NAME);
const DB_SEED_MARKER_KEY = 'db_initial_data_seeded_v1';

console.log(`Database path: ${DB_FILE_PATH}`);

async function initializeCategory(category: Category, dbInstance: Database) {
  await dbInstance.run(
    'INSERT OR IGNORE INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?)',
    category.id,
    category.name,
    category.icon,
    category.color
  );
}

async function initializeTransaction(transaction: Transaction, dbInstance: Database) {
  await dbInstance.run(
    'INSERT OR IGNORE INTO transactions (id, date, description, amount, type, categoryId) VALUES (?, ?, ?, ?, ?, ?)',
    transaction.id,
    transaction.date,
    transaction.description,
    transaction.amount,
    transaction.type,
    transaction.categoryId
  );
}

async function initializeBudget(budget: Budget, dbInstance: Database) {
  const categoryExists = await dbInstance.get('SELECT 1 FROM categories WHERE id = ?', budget.categoryId);
  if (categoryExists) {
    const limitAmount = typeof budget.limitAmount === 'number' && isFinite(budget.limitAmount) ? budget.limitAmount : 0;
    if (typeof budget.limitAmount !== 'number' || !isFinite(budget.limitAmount)) {
        console.warn(`Warning: Budget for categoryId ${budget.categoryId} had invalid limitAmount ${budget.limitAmount}. Defaulting to 0.`);
    }
    await dbInstance.run(
      'INSERT OR IGNORE INTO budgets (id, categoryId, limit_amount, period) VALUES (?, ?, ?, ?)',
      budget.id || randomUUID(), // Ensure ID exists
      budget.categoryId,
      limitAmount,
      budget.period
    );
  } else {
    console.warn(`Skipping budget for non-existent categoryId: ${budget.categoryId}`);
  }
}


export async function getDb(): Promise<Database> {
  if (db) {
    return db;
  }

  try {
    db = await open({
      filename: DB_FILE_PATH,
      driver: sqlite3.Database,
    });

    console.log('Database connection established.');

    await db.exec('PRAGMA foreign_keys = ON;');

    // App Settings Table (key-value store) - Must be created first for the seed marker
    await db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    console.log('App settings table checked/created.');

    // Categories Table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT
      );
    `);
    console.log('Categories table checked/created.');
    
    // Transactions Table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        categoryId TEXT NOT NULL,
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_categoryId ON transactions(categoryId);
    `);
    console.log('Transactions table checked/created.');

    // Budgets Table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        categoryId TEXT NOT NULL UNIQUE,
        limit_amount REAL NOT NULL,
        period TEXT NOT NULL CHECK(period IN ('monthly', 'weekly', 'yearly')),
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_budgets_categoryId ON budgets(categoryId);
    `);
    console.log('Budgets table checked/created.');
    
    // Check if initial seeding has been done
    const initialSeedingMarker = await db.get<{ value: string }>("SELECT value FROM app_settings WHERE key = ?", DB_SEED_MARKER_KEY);

    if (!initialSeedingMarker || initialSeedingMarker.value !== 'true') {
      console.log(`Initial data seeding marker '${DB_SEED_MARKER_KEY}' not found or not true. Performing initial data seeding...`);

      // Seed Categories if they are empty
      const catCount = (await db.get('SELECT COUNT(*) as count FROM categories'))?.count;
      if (catCount === 0) {
        console.log('Seeding categories...');
        for (const category of defaultMockCategories) { await initializeCategory(category, db); }
      } else {
        console.log('Categories table already has data, skipping category seeding.');
      }

      // Seed Transactions if they are empty (and categories exist)
      const txnCategoriesExist = (await db.get('SELECT COUNT(*) as count FROM categories'))?.count > 0;
      if (txnCategoriesExist) {
        const txnCount = (await db.get('SELECT COUNT(*) as count FROM transactions'))?.count;
        if (txnCount === 0) {
          console.log('Seeding transactions...');
          for (const transaction of defaultMockTransactions) { await initializeTransaction(transaction, db); }
        } else {
          console.log('Transactions table already has data, skipping transaction seeding.');
        }
      } else {
        console.log('Categories table is empty, skipping transaction seeding.');
      }

      // Seed Budgets if they are empty (and categories exist)
      const budgetCategoriesExist = (await db.get('SELECT COUNT(*) as count FROM categories'))?.count > 0;
      if (budgetCategoriesExist) {
        const budgetCount = (await db.get('SELECT COUNT(*) as count FROM budgets'))?.count;
        if (budgetCount === 0) {
          console.log('Seeding budgets...');
          for (const budget of defaultMockBudgets) { await initializeBudget(budget, db); }
        } else {
          console.log('Budgets table already has data, skipping budget seeding.');
        }
      } else {
        console.log('Categories table is empty, skipping budget seeding.');
      }
      
      // Seed default app settings (currency, AI config) only if they don't already exist
      const currencySetting = await db.get('SELECT value FROM app_settings WHERE key = ?', 'selectedCurrency');
      if (!currencySetting) {
        console.log('Seeding default currency setting...');
        await db.run('INSERT INTO app_settings (key, value) VALUES (?, ?)', 'selectedCurrency', JSON.stringify('EUR'));
      }
      const aiConfigSetting = await db.get('SELECT value FROM app_settings WHERE key = ?', 'aiConfig');
      if (!aiConfigSetting) {
        console.log('Seeding default AI config setting...');
        await db.run('INSERT INTO app_settings (key, value) VALUES (?, ?)', 'aiConfig', JSON.stringify({ modelName: 'gemini-2.0-flash' }));
      }
      
      // Mark seeding as done
      await db.run("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)", DB_SEED_MARKER_KEY, 'true');
      console.log(`Initial data seeding routines complete. Marker '${DB_SEED_MARKER_KEY}' set to true.`);
    } else {
      console.log(`Database initial seeding marker '${DB_SEED_MARKER_KEY}' found as true. Skipping mock data seeding.`);
    }

  } catch (error) {
    console.error('Failed to initialize database:', error);
    db = null; 
    throw error; 
  }

  return db;
}

// Helper to close the DB, useful for testing or specific scenarios
export async function closeDb() {
  if (db) {
    await db.close();
    db = null;
    console.log('Database connection closed.');
  }
}
