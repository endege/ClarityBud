
'use client';

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'; // ResponsiveContainer removed as ChartContainer handles it
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Transaction } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { useCurrency } from "@/contexts/currency-context";
import { formatCurrency as formatUtilCurrency } from "@/lib/currency-utils";

interface SpendingLineChartProps {
  transactions: Transaction[]; // Expecting transactions for the relevant period
}

export function SpendingLineChart({ transactions }: SpendingLineChartProps) {
  const { selectedCurrency, selectedCurrencyDetails } = useCurrency();
  const locale = selectedCurrencyDetails?.locale || 'en-US';

  const formatCurrency = (amount: number) => {
    return formatUtilCurrency(amount, selectedCurrency, locale);
  };

  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  // Aggregate expenses by day. Assuming transactions are already filtered for current month by parent.
  // If not, date range logic should be here or data pre-processed.
  // For now, derive date range from the provided transactions or default to current month.
  let firstDate = startOfMonth(new Date());
  let lastDate = endOfMonth(new Date());

  if (expenseTransactions.length > 0) {
    const dates = expenseTransactions.map(t => parseISO(t.date));
    firstDate = dates.reduce((min, d) => d < min ? d : min, dates[0]);
    // Ensure 'firstDate' is at least start of its month for consistent X-axis display
    firstDate = startOfMonth(firstDate); 
    // lastDate can be end of current month, or end of month of latest transaction
    // For simplicity, use end of current month or end of month of latest transaction if it's in future (unlikely for expenses)
  }
  
  const daysInPeriod = eachDayOfInterval({ start: firstDate, end: lastDate });


  const chartData = daysInPeriod.map(day => {
    const dailyExpenses = expenseTransactions
      .filter(t => isSameDay(parseISO(t.date), day))
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      date: format(day, 'MMM d'),
      expenses: dailyExpenses,
    };
  });
  
  if (expenseTransactions.length === 0 && chartData.every(d => d.expenses === 0)) {
     return (
       <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Spending Over Time</CardTitle>
          <CardDescription>No expense data available for this period.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground">
            No data to display
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    expenses: {
      label: 'Daily Expenses',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Over Time</CardTitle>
        <CardDescription>Daily spending trend for the selected period (typically current month).</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 5,
              bottom: 5,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value, index) => {
                if (chartData.length > 15 && index % Math.floor(chartData.length/7) !== 0 && index !== chartData.length -1 && index !== 0) return "";
                return value;
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value as number)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(label) => label}
                  formatter={(value) => formatCurrency(value as number)}
                />
              }
            />
            <Line
              dataKey="expenses"
              type="monotone"
              stroke="var(--color-expenses)"
              strokeWidth={2}
              dot={chartData.length === 1} // Show dot if only one data point
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
