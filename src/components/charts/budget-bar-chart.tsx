
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList, Cell } from 'recharts';
import Link from 'next/link'; // Import Link
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Budget, Category } from '@/types'; 
import { useCurrency } from "@/contexts/currency-context";
import { formatCurrency as formatUtilCurrency } from "@/lib/currency-utils";

interface BudgetWithSpent extends Budget { 
  spentAmount: number;
}
interface BudgetBarChartProps {
  budgets: BudgetWithSpent[]; 
  categories: Category[]; 
}

const DEFAULT_CATEGORY_COLOR = 'hsl(var(--muted-foreground))';

export function BudgetBarChart({ budgets, categories }: BudgetBarChartProps) {
  const { selectedCurrency, selectedCurrencyDetails } = useCurrency();
  const locale = selectedCurrencyDetails?.locale || 'en-US';

  const formatCurrency = (amount: number) => {
    return formatUtilCurrency(amount, selectedCurrency, locale);
  };

  const chartData = budgets.map(budget => {
    const category = categories.find(c => c.id === budget.categoryId);
    const categoryColor = budget.categoryColor || category?.color || DEFAULT_CATEGORY_COLOR;
    return {
      categoryName: budget.categoryName || category?.name || 'Unknown',
      limit: budget.limitAmount,
      spent: budget.spentAmount,
      spentFill: budget.spentAmount > budget.limitAmount ? 'hsl(var(--destructive))' : categoryColor,
      limitFill: 'hsl(var(--chart-2))', 
    };
  });

  const chartConfig = {
    limit: { label: 'Budget Limit', color: 'hsl(var(--chart-2))' }, 
    spent: { label: 'Actual Spent', color: 'hsl(var(--primary))' },   
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget vs. Actual Spending</CardTitle>
        <CardDescription>Comparison of budgeted amounts and actual expenses by category for the current period.</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground">
            <p className="text-center">
              No budget data available. <br />
              <Link href="/budgets" className="text-primary underline hover:text-primary/80">
                Set up your budgets
              </Link> to see this chart.
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="categoryName"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
              <ChartTooltip
                content={<ChartTooltipContent 
                  formatter={(value, name, props) => {
                    const itemColor = name === 'spent' ? props.payload.spentFill : props.payload.limitFill;
                    return (
                      <div className="flex items-center">
                        <span className="mr-2 h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{backgroundColor: itemColor}} />
                        {name === "limit" ? "Limit: " : "Spent: "} {formatCurrency(value as number)}
                      </div>
                    );
                  }}
                />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="limit" radius={4}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-limit-${index}`} fill={entry.limitFill} />
                ))}
                 <LabelList dataKey="limit" position="top" offset={8} className="fill-foreground" fontSize={10} formatter={(value: number) => formatCurrency(value)} />
              </Bar>
              <Bar dataKey="spent" radius={4}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-spent-${index}`} fill={entry.spentFill} />
                ))}
                <LabelList dataKey="spent" position="top" offset={8} className="fill-foreground" fontSize={10} formatter={(value: number) => formatCurrency(value)} />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

