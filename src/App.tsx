import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './App.css';
import { EASE, MotionButton } from './motion';
import { Expense, Category, SavingsGoal, View } from './types';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import ExpenseList from './components/ExpenseList';
import AddExpense from './components/AddExpense';
import ReceiptScanner from './components/ReceiptScanner';
import AIAdvisor from './components/AIAdvisor';
import Categories from './components/Categories';
import SavingsGoals from './components/SavingsGoals';
import ImportCSV from './components/ImportCSV';
import BankSync from './components/BankSync';
import Subscriptions from './components/Subscriptions';
import Challenges from './components/Challenges';

const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Jedzenie', color: '#34c759', emoji: '🍔' },
  { id: '2', name: 'Transport', color: '#0071e3', emoji: '🚗' },
  { id: '3', name: 'Dom', color: '#ff9500', emoji: '🏠' },
  { id: '4', name: 'Zdrowie', color: '#ff3b30', emoji: '💊' },
  { id: '5', name: 'Rozrywka', color: '#af52de', emoji: '🎬' },
  { id: '6', name: 'Zakupy', color: '#ff2d55', emoji: '👗' },
  { id: '7', name: 'Edukacja', color: '#5ac8fa', emoji: '📚' },
  { id: '8', name: 'Inne', color: '#8e8e93', emoji: '💰' },
];

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}

function App() {
  // If returning from a bank link (?ref= GoCardless, ?code= Tink), open bank sync
  const _qs = new URLSearchParams(window.location.search);
  const initialView: View = (_qs.has('ref') || _qs.has('code')) ? 'banksync' : 'dashboard';
  const [view, setView] = useState<View>(initialView);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('categories', DEFAULT_CATEGORIES);
  const [goals, setGoals] = useLocalStorage<SavingsGoal[]>('goals', []);
  const [apiKey, setApiKey] = useLocalStorage<string>('anthropicApiKey', '');
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const [budget, setBudget] = useLocalStorage<number>('monthlyBudget', 0);
  const [accent, setAccent] = useLocalStorage<string>('accent', '#0071e3');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-hover', accent);
  }, [accent]);

  const addExpense = (expense: Expense) => setExpenses(prev => [expense, ...prev]);
  const deleteExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));
  const addCategory = (category: Category) => setCategories(prev => [...prev, category]);
  const deleteCategory = (id: string) => setCategories(prev => prev.filter(c => c.id !== id));
  const addGoal = (goal: SavingsGoal) => setGoals(prev => [...prev, goal]);
  const updateGoal = (id: string, amount: number) =>
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current: Math.min(g.current + amount, g.target) } : g));
  const deleteGoal = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));
  const importExpenses = (newExpenses: Expense[]) => setExpenses(prev => {
    const ids = new Set(prev.map(e => e.id));
    const fresh = newExpenses.filter(e => !ids.has(e.id));
    return fresh.length ? [...fresh, ...prev] : prev;
  });

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard expenses={expenses} categories={categories} goals={goals} onNavigate={setView} budget={budget} onSetBudget={setBudget} apiKey={apiKey} />;
      case 'expenses':
        return <ExpenseList expenses={expenses} categories={categories} onDelete={deleteExpense} onAdd={() => setView('add')} />;
      case 'add':
        return <AddExpense categories={categories} onAdd={exp => { addExpense(exp); setView('expenses'); }} onBack={() => setView('expenses')} />;
      case 'scanner':
        return <ReceiptScanner categories={categories} onAdd={exp => { addExpense(exp); setView('expenses'); }} apiKey={apiKey} />;
      case 'advisor':
        return <AIAdvisor expenses={expenses} categories={categories} goals={goals} apiKey={apiKey} />;
      case 'categories':
        return <Categories categories={categories} onAdd={addCategory} onDelete={deleteCategory} />;
      case 'goals':
        return <SavingsGoals goals={goals} onAdd={addGoal} onUpdate={updateGoal} onDelete={deleteGoal} />;
      case 'import':
        return <ImportCSV categories={categories} onImport={importExpenses} />;
      case 'banksync':
        return <BankSync categories={categories} onImport={importExpenses} />;
      case 'subscriptions':
        return <Subscriptions expenses={expenses} />;
      case 'challenges':
        return <Challenges expenses={expenses} goals={goals} onAddToGoal={updateGoal} />;
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <MotionButton
        className="theme-toggle"
        aria-label="Przełącz motyw"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
      >
        <span className="emoji" style={{ fontSize: 18 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
      </MotionButton>
      <Navigation currentView={view} onNavigate={setView} apiKey={apiKey} onApiKeyChange={setApiKey} accent={accent} onAccentChange={setAccent} />
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={view === 'dashboard' ? { opacity: 0, y: -16 } : { opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={view === 'dashboard' ? { opacity: 0, y: 16 } : { opacity: 0 }}
            transition={{ duration: view === 'dashboard' ? 0.4 : 0.18, ease: EASE }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
