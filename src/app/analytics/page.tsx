
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { SpendingPieChart } from "@/components/charts/spending-pie-chart";
import { BudgetBarChart } from "@/components/charts/budget-bar-chart";
import { SpendingLineChart } from "@/components/charts/spending-line-chart";
import type { Category, Transaction, Budget } from "@/types";
import { getCategories as fetchDbCategories } from '@/app/actions/categories.actions';
import { getTransactions, getTotalSpendingForCategory } from '@/app/actions/transactions.actions';
import { getBudgets as fetchDbBudgets } from '@/app/actions/budgets.actions';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { formatISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';

const DEFAULT_ICON = 'Tag';
const DEFAULT_COLOR = 'hsl(var(--foreground))';

interface BudgetWithSpent extends Budget {
  spentAmount: number;
}

export default function AnalyticsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const calculateDateRangeForPeriod = (period: 'monthly' | 'weekly' | 'yearly'): { startDate: string, endDate: string } => {
    const now = new Date();
    let startDate, endDate;
    switch (period) {
      case 'weekly':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'yearly':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'monthly':
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
    }
    return { startDate: formatISO(startDate, { representation: 'date' }), endDate: formatISO(endDate, { representation: 'date' }) };
  };

  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedCategories, fetchedTransactions, fetchedDbBudgets] = await Promise.all([
        fetchDbCategories(),
        getTransactions({ sortKey: 'date', sortDirection: 'desc' }), // Fetch all transactions, sorted by date
        fetchDbBudgets(),
      ]);
      
      setCategories(fetchedCategories.map(cat => ({
        ...cat,
        icon: cat.icon || DEFAULT_ICON,
        color: cat.color || DEFAULT_COLOR,
      })));
      setTransactions(fetchedTransactions);

      const budgetsWithSpent: BudgetWithSpent[] = await Promise.all(
        fetchedDbBudgets.map(async (budget) => {
          const { startDate, endDate } = calculateDateRangeForPeriod(budget.period);
          const spentAmount = await getTotalSpendingForCategory(budget.categoryId, startDate, endDate);
          return { ...budget, spentAmount };
        })
      );
      setBudgets(budgetsWithSpent);

    } catch (error) {
      console.error('Error fetching data for analytics:', error);
      toast({ title: "Error", description: "Could not load analytics data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);


  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CardHeader className="px-0">
        <CardTitle>Visual Analytics</CardTitle>
        <CardDescription>Explore your spending patterns and budget adherence through visual charts. Data is fetched from the database.</CardDescription>
      </CardHeader>
      
      <div className="mb-6">
        <SpendingPieChart transactions={transactions} categories={categories} />
      </div>
      
      <div className="mb-6">
        <BudgetBarChart budgets={budgets} categories={categories} />
      </div>
      
      <div>
        <SpendingLineChart transactions={transactions} />
      </div>
    </div>
  );
}
