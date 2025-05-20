
// src/app/budgets/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import type { Budget, Category, Transaction } from "@/types";
import { PlusCircle, Edit3, Trash2, Target, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getIconComponentByName } from '@/lib/icon-utils';
import { useCurrency } from "@/contexts/currency-context";
import { formatCurrency as formatUtilCurrency } from "@/lib/currency-utils";
import { getCategories as fetchDbCategories } from '@/app/actions/categories.actions';
import { getBudgets, addBudget, updateBudget, deleteBudget, type BudgetFormData } from '@/app/actions/budgets.actions';
import { getTotalSpendingForCategory, getTransactions } from '@/app/actions/transactions.actions';
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, formatISO } from 'date-fns';

const budgetSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  limitAmount: z.coerce.number().min(0.01, "Limit must be positive"),
  period: z.enum(["monthly", "weekly", "yearly"], { required_error: "Period is required" }),
});

type ClientSideBudgetFormData = z.infer<typeof budgetSchema>;

interface BudgetWithSpent extends Budget {
  spentAmount: number; // Dynamic field
}

export default function BudgetsPage() {
  const { selectedCurrency, selectedCurrencyDetails } = useCurrency();
  const locale = selectedCurrencyDetails?.locale || 'en-US';
  const { toast } = useToast();
  
  const formatCurrency = (amount: number) => {
    return formatUtilCurrency(amount, selectedCurrency, locale);
  };

  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithSpent | null>(null);

  const form = useForm<ClientSideBudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { categoryId: "", limitAmount: 100, period: "monthly" },
  });

  const calculateDateRangeForPeriod = (period: 'monthly' | 'weekly' | 'yearly'): { startDate: string, endDate: string } => {
    const now = new Date();
    let startDate, endDate;
    switch (period) {
      case 'weekly':
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
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

  const loadBudgetsAndSpending = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedCategories, fetchedDbBudgets] = await Promise.all([
        fetchDbCategories(),
        getBudgets()
      ]);
      setCategories(fetchedCategories);

      const budgetsWithSpent: BudgetWithSpent[] = await Promise.all(
        fetchedDbBudgets.map(async (budget) => {
          const { startDate, endDate } = calculateDateRangeForPeriod(budget.period);
          const spentAmount = await getTotalSpendingForCategory(budget.categoryId, startDate, endDate);
          return { ...budget, spentAmount };
        })
      );
      setBudgets(budgetsWithSpent);

    } catch (error) {
      console.error("Failed to fetch budget data:", error);
      toast({ title: "Error", description: "Could not load budget data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBudgetsAndSpending();
  }, [loadBudgetsAndSpending]);

  useEffect(() => {
    if (editingBudget) {
      form.reset({
        categoryId: editingBudget.categoryId,
        limitAmount: editingBudget.limitAmount,
        period: editingBudget.period,
      });
    } else {
       form.reset({ categoryId: "", limitAmount: 100, period: "monthly" });
    }
  }, [editingBudget, form, isModalOpen]);

  const onSubmit = async (data: ClientSideBudgetFormData) => {
    const apiData: BudgetFormData = {
        categoryId: data.categoryId,
        limitAmount: data.limitAmount,
        period: data.period,
    };
    
    let result;
    if (editingBudget) {
      result = await updateBudget(editingBudget.id, apiData);
    } else {
      result = await addBudget(apiData);
    }
    
    if (result.success) {
      toast({ title: "Success", description: `Budget ${editingBudget ? 'updated' : 'added'}.` });
      await loadBudgetsAndSpending();
      setIsModalOpen(false);
      setEditingBudget(null);
    } else {
      toast({ title: "Error", description: result.message || `Failed to ${editingBudget ? 'update' : 'add'} budget.`, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteBudget(id);
    if (result.success) {
      toast({ title: "Success", description: "Budget deleted." });
      await loadBudgetsAndSpending();
    } else {
      toast({ title: "Error", description: result.message || "Failed to delete budget.", variant: "destructive" });
    }
  };

  const openEditModal = (budget: BudgetWithSpent) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };
  
  const openAddModal = () => {
    setEditingBudget(null);
    form.reset(); // Reset form with default values
    setIsModalOpen(true);
  };

  const totalLimit = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
  const overallProgress = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading budget data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Overall Budget Progress</CardTitle>
              <CardDescription>Your total spending against total budget limits.</CardDescription>
            </div>
             <Target className="h-6 w-6 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-1 flex justify-between">
            <span className="text-sm font-medium">Total Spent: {formatCurrency(totalSpent)}</span>
            <span className="text-sm text-muted-foreground">Total Limit: {formatCurrency(totalLimit)}</span>
          </div>
          <Progress value={overallProgress} aria-label="Overall budget progress" />
           <p className={`mt-2 text-sm ${overallProgress > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {overallProgress > 100
              ? `You are ${formatCurrency(totalSpent - totalLimit)} over budget.`
              : `You have ${formatCurrency(totalLimit - totalSpent)} remaining.`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Category Budgets</CardTitle>
              <CardDescription>Set and monitor spending limits for each category.</CardDescription>
            </div>
            <Button onClick={openAddModal}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Budget
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {budgets.length === 0 ? (
            <p className="text-center text-muted-foreground">No budgets set yet. Add one to start tracking!</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {budgets.map((budget: BudgetWithSpent) => {
                const progress = budget.limitAmount > 0 ? (budget.spentAmount / budget.limitAmount) * 100 : 0;
                const IconComponent = getIconComponentByName(budget.categoryIcon);

                return (
                  <Card key={budget.id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           { IconComponent && <IconComponent className="h-5 w-5" style={{color: budget.categoryColor}}/> }
                           <CardTitle className="text-lg">{budget.categoryName || 'Unknown Category'}</CardTitle>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">{budget.period}</span>
                      </div>
                      <CardDescription>Limit: {formatCurrency(budget.limitAmount)}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2">
                      <Progress value={progress} aria-label={`${budget.categoryName} budget progress`} className={progress > 100 ? '[&>div]:bg-destructive' : ''} />
                      <div className="flex justify-between text-sm">
                        <span>Spent: {formatCurrency(budget.spentAmount)}</span>
                        <span className={budget.spentAmount > budget.limitAmount ? 'text-destructive' : 'text-muted-foreground'}>
                          {budget.spentAmount > budget.limitAmount
                            ? `${formatCurrency(budget.spentAmount - budget.limitAmount)} over`
                            : `${formatCurrency(budget.limitAmount - budget.spentAmount)} left`}
                        </span>
                      </div>
                    </CardContent>
                     <div className="flex justify-end p-3 border-t">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(budget)} title="Edit">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(budget.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
        setIsModalOpen(isOpen);
        if (!isOpen) setEditingBudget(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'Edit' : 'Set'} Budget</DialogTitle>
             <DialogDescription>
              {editingBudget ? 'Update the details for this budget.' : 'Set a new spending limit for a category.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!editingBudget}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categories.map((cat: Category) => (
                          <SelectItem 
                            key={cat.id} 
                            value={cat.id} 
                            disabled={
                                !editingBudget && budgets.some(b => b.categoryId === cat.id) // Disable if adding and category already has a budget
                            }
                          >
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="limitAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Limit</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 500" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                 <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Budget
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
