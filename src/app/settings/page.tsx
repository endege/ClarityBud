
// src/app/settings/page.tsx
'use client';

import React, { useState } from 'react';
import { CurrencySelector } from '@/components/layout/currency-selector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/currency-context';
import type { Category, Transaction, Budget, AppSetting } from '@/types';

// Import server actions for data
import { getAllCategories, importCategories } from '@/app/actions/categories.actions';
import { getAllTransactions, importTransactions } from '@/app/actions/transactions.actions';
import { getAllBudgets, importBudgets } from '@/app/actions/budgets.actions';
import { getAllSettings, importSettings } from '@/app/actions/settings.actions';
import { Loader2 } from 'lucide-react';


export default function SettingsPage() {
  const { toast } = useToast();
  const { selectedCurrency, setSelectedCurrency, isLoadingCurrency } = useCurrency();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const [categories, transactions, budgets, settings] = await Promise.all([
        getAllCategories(),
        getAllTransactions(),
        getAllBudgets(),
        getAllSettings()
      ]);
      
      const dataToExport = {
        exportedAt: new Date().toISOString(),
        settings: settings, 
        categories: categories,
        transactions: transactions,
        budgets: budgets,
      };

      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateSuffix = new Date().toISOString().split('T')[0];
      link.download = `claritybud_data_${dateSuffix}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'Your data has been exported from the database.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Could not export your data. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImportFile(event.target.files[0]);
    } else {
      setImportFile(null);
    }
  };

  const handleImportData = async () => {
    if (!importFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a JSON file to import.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Failed to read file content.');
        }
        const importedData = JSON.parse(text);

        if (!importedData || typeof importedData !== 'object') {
          throw new Error('Invalid JSON structure.');
        }

        let changesMadeCount = 0;

        // Import Settings first
        if (Array.isArray(importedData.settings)) {
          const settingsResult = await importSettings(importedData.settings as AppSetting[]);
          if (settingsResult.success && settingsResult.count) changesMadeCount += settingsResult.count;
          // Update contexts after import
          const currencySetting = importedData.settings.find((s: AppSetting) => s.key === 'selectedCurrency');
          if (currencySetting && currencySetting.value) { // check currencySetting.value
             try {
                const parsedCurrency = JSON.parse(currencySetting.value);
                if (typeof parsedCurrency === 'string') {
                    setSelectedCurrency(parsedCurrency);
                }
             } catch (parseError) {
                console.error("Error parsing currency setting during import:", parseError);
             }
          }
        }
        
        // Import Categories
        if (Array.isArray(importedData.categories)) {
           const catResult = await importCategories(importedData.categories as Category[]);
           if (catResult.success && catResult.count) changesMadeCount += catResult.count;
        }
        
        // Import Transactions
        if (Array.isArray(importedData.transactions)) {
            const transResult = await importTransactions(importedData.transactions as Transaction[]);
            if (transResult.success && transResult.count) changesMadeCount += transResult.count;
        }
        
        // Import Budgets
        if (Array.isArray(importedData.budgets)) {
            const budgetResult = await importBudgets(importedData.budgets as Budget[]);
            if (budgetResult.success && budgetResult.count) changesMadeCount += budgetResult.count;
        }


        if (changesMadeCount > 0) {
          toast({
            title: 'Import Successful',
            description: `Successfully imported ${changesMadeCount} items into the database. Some changes may require a page refresh to fully apply across all views.`,
            duration: 5000,
          });
        } else {
           toast({
            title: 'Import Complete',
            description: 'No new data was imported, or the file contained no compatible data.',
            variant: 'default',
          });
        }

      } catch (error: any) {
        console.error('Import error:', error);
        toast({
          title: 'Import Failed',
          description: error.message || 'Could not import data. Ensure the file is a valid ClarityBud JSON export.',
          variant: 'destructive',
        });
      } finally {
        setIsImporting(false);
        setImportFile(null); 
        const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    };

    reader.onerror = () => {
      toast({
        title: 'File Read Error',
        description: 'Could not read the selected file.',
        variant: 'destructive',
      });
      setIsImporting(false);
    };

    reader.readAsText(importFile);
  };

  if (isLoadingCurrency) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading settings...</p>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and data.</p>
      </div>
      
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>Choose the default currency for displaying monetary values across the application. Saved in the database.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs"> 
            <CurrencySelector />
          </div>
        </CardContent>
      </Card>
      
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Export your application data from the database or import data to the database from a previously exported file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Export Data</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Download all your settings, categories, transactions, and budgets from the database as a JSON file.
            </p>
            <Button onClick={handleExportData} disabled={isExporting}>
              {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Export All Data
            </Button>
          </div>
          
          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-2">Import Data</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Import data from a previously exported ClarityBud JSON file. This will overwrite existing data in the database.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <Input 
                id="import-file-input"
                type="file" 
                accept=".json" 
                onChange={handleFileChange} 
                className="max-w-xs"
              />
              <Button onClick={handleImportData} disabled={!importFile || isImporting}>
                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import Data
              </Button>
            </div>
             {importFile && <p className="text-xs text-muted-foreground mt-1">Selected file: {importFile.name}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
