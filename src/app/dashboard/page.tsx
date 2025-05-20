
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Transaction, Budget, Category } from "@/types";
import { ArrowDownCircle, ArrowUpCircle, Landmark, TrendingUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/currency-context";
import { formatCurrency as formatUtilCurrency } from "@/lib/currency-utils";
import { getCategories as fetchDbCategories } from '@/app/actions/categories.actions';
import { getTransactions, getTotalSpendingForCategory } from '@/app/actions/transactions.actions';
import { getBudgets as fetchDbBudgets } from '@/app/actions/budgets.actions';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, formatISO } from 'date-fns';

interface BudgetWithSpent extends Budget {
  spentAmount: number;
}


export default function DashboardPage() {
  const { selectedCurrency, selectedCurrencyDetails } = useCurrency();
  const locale = selectedCurrencyDetails?.locale || 'en-US';

  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatCurrency = (amount: number) => {
    return formatUtilCurrency(amount, selectedCurrency, locale);
  };

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

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedCategories, fetchedTransactions, fetchedDbBudgets] = await Promise.all([
        fetchDbCategories(),
        getTransactions({ limit: 5, sortKey: 'date', sortDirection: 'desc' }), // Recent transactions
        fetchDbBudgets(),
      ]);
      setCategories(fetchedCategories);
      setTransactions(fetchedTransactions);

      const budgetsWithSpent: BudgetWithSpent[] = await Promise.all(
        fetchedDbBudgets.slice(0,3).map(async (budget) => { // Top 3 budgets
          const { startDate, endDate } = calculateDateRangeForPeriod(budget.period);
          const spentAmount = await getTotalSpendingForCategory(budget.categoryId, startDate, endDate);
          return { ...budget, spentAmount };
        })
      );
      setBudgets(budgetsWithSpent);

    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      // Potentially set an error state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Calculate totals from all transactions (not just recent 5)
  // This requires another fetch or modifying getTransactions to support fetching all for calculations.
  // For simplicity, using existing transactions state (which is last 5 for display)
  // This is a known limitation of this simplified dashboard calculation logic.
  // A better approach would fetch all transactions for the current period for accurate totals.
  const [allTransactionsForTotals, setAllTransactionsForTotals] = useState<Transaction[]>([]);
  useEffect(() => {
    // Fetch all transactions for the current month to calculate totals
    const currentMonthStart = formatISO(startOfMonth(new Date()), { representation: 'date' });
    const currentMonthEnd = formatISO(endOfMonth(new Date()), { representation: 'date' });
    getTransactions({ startDate: currentMonthStart, endDate: currentMonthEnd }).then(setAllTransactionsForTotals);
  }, []);


  const totalIncome = allTransactionsForTotals
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = allTransactionsForTotals
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;


  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
            {totalIncome === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Add income via the <Link href="/transactions" className="underline hover:text-primary">Transactions</Link> page.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Landmark className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(netBalance)}
            </div>
            <p className="text-xs text-muted-foreground">Current financial standing (this month)</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
            <CardDescription>Your spending progress across top budgets for the current period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgets.length === 0 && <p className="text-muted-foreground">No budgets to display. <Link href="/budgets" className="underline hover:text-primary">Add one?</Link></p>}
            {budgets.map((budget: BudgetWithSpent) => {
              const progress = budget.limitAmount > 0 ? (budget.spentAmount / budget.limitAmount) * 100 : 0;
              return (
                <div key={budget.id}>
                  <div className="mb-1 flex justify-between">
                    <span className="text-sm font-medium">{budget.categoryName || 'Unknown'}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(budget.spentAmount)} / {formatCurrency(budget.limitAmount)}
                    </span>
                  </div>
                  <Progress value={progress} aria-label={`${budget.categoryName} budget progress`} />
                </div>
              );
            })}
             <div className="mt-4">
              <Link href="/budgets" passHref>
                <Button variant="outline" className="w-full">View All Budgets</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activities.</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 && <p className="text-muted-foreground">No recent transactions. <Link href="/transactions" className="underline hover:text-primary">Add one?</Link></p>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction: Transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(transaction.date), "PPP")}
                      </div>
                    </TableCell>
                    <TableCell>{transaction.categoryName}</TableCell>
                    <TableCell className={`text-right font-medium ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4">
              <Link href="/transactions" passHref>
                <Button variant="outline" className="w-full">View All Transactions</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
