import React, { useState, useEffect } from 'react';
import './App.css';
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

  const addExpense = (expense: Expense) => setExpenses(prev => [expense, ...prev]);
  const deleteExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));
  const addCategory = (category: Category) => setCategories(prev => [...prev, category]);
  const deleteCategory = (id: string) => setCategories(prev => prev.filter(c => c.id !== id));
  const addGoal = (goal: SavingsGoal) => setGoals(prev => [...prev, goal]);
  const updateGoal = (id: string, amount: number) =>
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current: Math.min(g.current + amount, g.target) } : g));
  const deleteGoal = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));
  const importExpenses = (newExpenses: Expense[]) => setExpenses(prev => [...newExpenses, ...prev]);

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard expenses={expenses} categories={categories} goals={goals} onNavigate={setView} />;
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
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <Navigation currentView={view} onNavigate={setView} apiKey={apiKey} onApiKeyChange={setApiKey} />
      <main className="main-content">{renderView()}</main>
    </div>
  );
}

export default App;
