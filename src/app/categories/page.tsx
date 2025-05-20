
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription as DialogDescriptionComponent } from "@/components/ui/dialog";
import type { Category } from "@/types";
import { PlusCircle, Edit3, Trash2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getIconComponentByName, iconOptionsList } from '@/lib/icon-utils';
import { getCategories, addCategory, updateCategory, deleteCategory } from '@/app/actions/categories.actions';
import { useToast } from "@/hooks/use-toast";


const varHslPattern = "hsl\\(var\\(--[^)]+\\)\\)";
const modernHslPattern = "hsl\\(\\s*\\d{1,3}(\\.\\d+)?(deg)?\\s+\\d{1,3}(\\.\\d+)?%\\s+\\d{1,3}(\\.\\d+)?%(\\s*\\/\\s*(0|1|0?\\.\\d+|\\d{1,3}(\\.\\d+)?%))?\\s*\\)";
const hexPattern = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})";
const combinedColorRegex = new RegExp(`^(${varHslPattern}|${modernHslPattern}|${hexPattern})$`);

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  icon: z.string().optional(),
  color: z.string()
    .regex(combinedColorRegex, "Invalid color format. Use HSL (e.g., hsl(0 100% 50%)), HSL with alpha (e.g., hsl(0 100% 50% / 0.8)), HSL CSS variables (e.g., hsl(var(--primary))), or HEX (e.g., #FF0000 or #F00).")
    .optional()
    .or(z.literal("")), // Allow empty string, then default will be applied
});

type CategoryFormData = z.infer<typeof categorySchema>;

const themeColors: string[] = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(0 100% 50%)", // Red
  "hsl(120 100% 50%)", // Green
  "hsl(240 100% 50%)", // Blue
  "hsl(60 100% 50%)", // Yellow
  "hsl(0 0% 50%)", // Gray
  "hsl(0 0% 100%)", // White (might not be visible on light theme background)
  "hsl(0 0% 0%)", // Black
];

const generateWebSafeColors = (): string[] => {
  const hexValues = ['00', '33', '66', '99', 'CC', 'FF'];
  const colors: string[] = [];
  for (const r of hexValues) {
    for (const g of hexValues) {
      for (const b of hexValues) {
        colors.push(`#${r}${g}${b}`);
      }
    }
  }
  return colors;
};

const predefinedColors: string[] = [...themeColors, ...generateWebSafeColors()];

const DEFAULT_ICON = 'Tag';
const DEFAULT_COLOR = 'hsl(var(--foreground))';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const fetchedCategories = await getCategories();
      setCategories(fetchedCategories.map(cat => ({
        ...cat,
        icon: cat.icon || DEFAULT_ICON,
        color: cat.color || DEFAULT_COLOR,
      })));
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast({ title: "Error", description: "Could not load categories.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", icon: DEFAULT_ICON, color: DEFAULT_COLOR },
  });

  useEffect(() => {
    if (editingCategory) {
      form.reset({
        name: editingCategory.name,
        icon: editingCategory.icon || DEFAULT_ICON,
        color: editingCategory.color || DEFAULT_COLOR,
      });
    } else {
      form.reset({ name: "", icon: DEFAULT_ICON, color: DEFAULT_COLOR });
    }
  }, [editingCategory, form, isModalOpen]);


  const onSubmit = async (data: CategoryFormData) => {
    const processedData = {
      name: data.name,
      icon: data.icon || DEFAULT_ICON,
      color: data.color || DEFAULT_COLOR,
    };
    
    let result;
    if (editingCategory) {
      result = await updateCategory(editingCategory.id, processedData);
    } else {
      result = await addCategory(processedData);
    }

    if (result.success) {
      toast({ title: "Success", description: `Category ${editingCategory ? 'updated' : 'added'}.` });
      await fetchCategories(); // Re-fetch to update list
    } else {
      toast({ title: "Error", description: result.message || `Failed to ${editingCategory ? 'update' : 'add'} category.`, variant: "destructive" });
    }
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteCategory(id);
    if (result.success) {
      toast({ title: "Success", description: "Category deleted." });
      await fetchCategories(); // Re-fetch
    } else {
      toast({ title: "Error", description: result.message || "Failed to delete category.", variant: "destructive" });
    }
  };
  
  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingCategory(null);
    form.reset({ name: "", icon: DEFAULT_ICON, color: DEFAULT_COLOR });
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading categories...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Spending Categories</CardTitle>
            <CardDescription>Manage your income and expense categories.</CardDescription>
          </div>
          <Button onClick={openAddModal}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-center text-muted-foreground">No categories yet. Add one to get started!</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((category: Category) => {
              const IconComponent = getIconComponentByName(category.icon);
              return (
                <Card key={category.id} className="flex flex-col">
                  <CardHeader className="flex flex-row items-center space-x-3 pb-3">
                     <span style={{ color: category.color || DEFAULT_COLOR }}>
                        <IconComponent className="h-6 w-6" />
                     </span>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {/* Placeholder for potential extra info */}
                  </CardContent>
                  <div className="flex justify-end p-3 border-t">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(category)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
        setIsModalOpen(isOpen);
        if (!isOpen) setEditingCategory(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit' : 'Add'} Category</DialogTitle>
             <DialogDescriptionComponent>
              {editingCategory ? 'Update the details of your category.' : 'Create a new category for tracking expenses.'}
            </DialogDescriptionComponent>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Groceries" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || DEFAULT_ICON}>
                      <FormControl>
                        <SelectTrigger>
                          <div className="flex items-center gap-2">
                            {field.value && React.createElement(getIconComponentByName(field.value), {className: "h-4 w-4"})}
                            <SelectValue placeholder="Select an icon" />
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {iconOptionsList.map(opt => (
                          <SelectItem key={opt.name} value={opt.name}>
                            <div className="flex items-center gap-2">
                              <opt.component className="h-4 w-4" />
                              {opt.name}
                            </div>
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
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., hsl(var(--accent)) or #FF8A65"
                        {...field}
                        value={field.value ?? ''} 
                      />
                    </FormControl>
                    <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                      {predefinedColors.map((colorValue) => (
                        <button
                          type="button"
                          key={colorValue}
                          className="w-6 h-6 rounded-sm border cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0"
                          style={{ backgroundColor: colorValue }}
                          onClick={() => field.onChange(colorValue)}
                          aria-label={`Select color ${colorValue}`}
                          title={colorValue}
                        />
                      ))}
                    </div>
                    <FormDescription>
                      Select a color or enter a HSL/HEX value. Defaults to theme foreground if left empty.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Category
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
