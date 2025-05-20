
// src/lib/icon-utils.ts
'use client'; // Mark as client component if it's imported by client components directly for functions

import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Utensils,
  Car,
  Gamepad2,
  Lightbulb,
  Stethoscope,
  ShoppingBag,
  Wifi,
  CircleDollarSign,
  Landmark,
  Shirt,
  Tag, // Default
} from 'lucide-react';

export const iconComponents: Record<string, LucideIcon> = {
  Home,
  Utensils,
  Car,
  Gamepad2,
  Lightbulb,
  Stethoscope,
  ShoppingBag,
  Wifi,
  CircleDollarSign,
  Landmark,
  Shirt,
  Tag,
};

export const iconOptionsList: { name: string; component: LucideIcon }[] = Object.entries(
  iconComponents
).map(([name, component]) => ({ name, component }));

export const getIconComponentByName = (iconName?: string): LucideIcon => {
  return iconName && iconComponents[iconName] ? iconComponents[iconName] : Tag; // Default to Tag icon
};
