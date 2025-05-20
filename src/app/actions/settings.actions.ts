
// src/app/actions/settings.actions.ts
'use server';

import { getDb } from '@/lib/db';
import type { AppSetting } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  try {
    const setting = await db.get<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', key);
    return setting ? setting.value : null;
  } catch (error) {
    console.error(`Failed to get setting for key ${key}:`, error);
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<{ success: boolean; message?: string }> {
  const db = await getDb();
  try {
    // Use INSERT OR REPLACE (UPSERT)
    await db.run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', key, value);
    // Revalidate paths that might depend on these settings indirectly, e.g., pages using currency or AI config.
    // This is broad; a more targeted approach might be needed if performance becomes an issue.
    revalidatePath('/', 'layout'); // Revalidate all pages as settings can be global
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to set setting for key ${key}:`, error);
    return { success: false, message: error.message || `Failed to set setting ${key}.` };
  }
}

export async function getAllSettings(): Promise<AppSetting[]> {
    const db = await getDb();
    try {
        const settings = await db.all<AppSetting[]>('SELECT key, value FROM app_settings');
        return settings;
    } catch (error) {
        console.error('Failed to fetch all settings for export:', error);
        return [];
    }
}

export async function importSettings(settings: AppSetting[]): Promise<{ success: boolean; message?: string; count?: number }> {
    const db = await getDb();
    try {
        // Not clearing, but replacing. If a key isn't in the import, it remains.
        // await db.run('DELETE FROM app_settings'); // Option: Clear all existing settings first
        let importedCount = 0;
        for (const setting of settings) {
            if (setting.key && typeof setting.value !== 'undefined') {
                 await db.run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', setting.key, setting.value);
                 importedCount++;
            }
        }
        revalidatePath('/', 'layout');
        return { success: true, count: importedCount };
    } catch (error: any) {
        console.error('Failed to import settings:', error);
        return { success: false, message: error.message || 'Failed to import settings.' };
    }
}
