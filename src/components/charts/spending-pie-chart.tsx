
'use client';

import { TrendingUp } from 'lucide-react';
import { Pie, PieChart, Sector } from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Category, Transaction } from '@/types';
import { useCurrency } from "@/contexts/currency-context";
import { formatCurrency as formatUtilCurrency } from "@/lib/currency-utils";

interface SpendingPieChartProps {
  transactions: Transaction[]; // Expecting transactions with categoryName, categoryColor denormalized
  categories: Category[]; // Still needed for fallback or if denormalization isn't complete
}

export function SpendingPieChart({ transactions, categories }: SpendingPieChartProps) {
  const { selectedCurrency, selectedCurrencyDetails } = useCurrency();
  const locale = selectedCurrencyDetails?.locale || 'en-US';
  
  const formatCurrency = (amount: number) => {
    return formatUtilCurrency(amount, selectedCurrency, locale);
  };

  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const spendingByCategory = expenseTransactions.reduce((acc, curr) => {
    const categoryName = curr.categoryName || categories.find(c => c.id === curr.categoryId)?.name || 'Unknown Category';
    acc[categoryName] = (acc[categoryName] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(spendingByCategory).map(([name, value], index) => {
    // Try to find original category for color, or use denormalized color from transaction if available
    const originalCategory = categories.find(c => c.name === name);
    const transactionWithThisCategory = expenseTransactions.find(t => (t.categoryName || categories.find(c => c.id === t.categoryId)?.name) === name);
    const fillColor = transactionWithThisCategory?.categoryColor || originalCategory?.color || `hsl(var(--chart-${(index % 5) + 1}))`;
    
    return {
      name,
      value,
      fill: fillColor,
      tooltipValue: formatCurrency(value)
    };
  });
  
  if (chartData.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>No expense data available for this period.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex h-[250px] w-full items-center justify-center text-muted-foreground">
            No data to display
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = chartData.reduce((acc, item) => {
    acc[item.name] = { label: item.name, color: item.fill };
    return acc;
  }, {} as ChartConfig);


  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>Monthly expenses distribution</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
          <PieChart>
            <ChartTooltip 
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="name" formatter={(value, name, props) => {
                return (
                  <div className="flex flex-col">
                    <span className="font-medium">{props.payload?.name}</span>
                    <span className="text-muted-foreground">{props.payload?.tooltipValue}</span>
                  </div>
                )
              }}/>} 
            />
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Track where your money goes.
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Understanding spending helps in better budgeting.
        </div>
      </CardFooter>
    </Card>
  );
}
