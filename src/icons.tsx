import React from 'react';
import {
  LayoutDashboard, Wallet, Plus, ReceiptText, Sparkles, Repeat, Tag, Target,
  Landmark, Upload, Sun, Moon, Search, Pencil, Trash2, Check, Download,
  Utensils, Car, Home, HeartPulse, Clapperboard, ShoppingBag, GraduationCap,
  ArrowLeftRight, Shield, PiggyBank, CircleDollarSign, TrendingUp, Calendar,
  FileText, Images, type LucideIcon,
} from 'lucide-react';
import { View } from './types';

// ── View → icon (navigation) ──
const VIEW_ICONS: Partial<Record<View, LucideIcon>> = {
  dashboard: LayoutDashboard,
  expenses: Wallet,
  add: Plus,
  scanner: ReceiptText,
  advisor: Sparkles,
  subscriptions: Repeat,
  categories: Tag,
  goals: Target,
  banksync: Landmark,
  import: Upload,
};

export function ViewIcon({ view, size = 20 }: { view: View; size?: number }) {
  const Icon = VIEW_ICONS[view] || Wallet;
  return <Icon size={size} strokeWidth={1.9} />;
}

// ── Category → icon ──
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Jedzenie: Utensils,
  Transport: Car,
  Dom: Home,
  Zdrowie: HeartPulse,
  Rozrywka: Clapperboard,
  Zakupy: ShoppingBag,
  Edukacja: GraduationCap,
  Przelewy: ArrowLeftRight,
  Ubezpieczenia: Shield,
  Oszczędności: PiggyBank,
  Inne: CircleDollarSign,
};

export function CategoryIcon({ name, size = 18, color }: { name: string; size?: number; color?: string }) {
  const Icon = CATEGORY_ICONS[name] || CircleDollarSign;
  return <Icon size={size} strokeWidth={1.9} color={color} />;
}

export const hasCategoryIcon = (name: string): boolean => name in CATEGORY_ICONS;

// ── Re-exported icons for misc UI (buttons, sections) ──
export {
  Sun, Moon, Search, Pencil, Trash2, Check, Download, Plus, Repeat, PiggyBank,
  TrendingUp, Calendar, FileText, Images, ReceiptText, Sparkles, Target, Landmark,
  Wallet, Upload,
};
