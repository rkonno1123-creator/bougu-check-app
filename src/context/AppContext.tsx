'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 業者データ
export interface Vendor {
  id: string;
  name: string;
}

// 日付ごとの入力データ
export interface DailyInput {
  [vendorId: string]: {
    bogoufuku: number | null;
    tebukuro: number | null;
    kyuushukan: number | null;
  };
}

// Excelから読み込んだデータ
export interface ExcelData {
  dates: string[];
  values: {
    [date: string]: {
      bogoufuku: number;
      tebukuro: number;
      kyuushukan: number;
    };
  };
}

// ローカルストレージのキー
const STORAGE_KEY = 'bougu-check-data';

interface SavedData {
  vendors: Vendor[];
  excelData: ExcelData | null;
  inputs: { [date: string]: DailyInput };
  savedAt: string;
}

interface AppContextType {
  vendors: Vendor[];
  setVendors: (vendors: Vendor[]) => void;
  excelData: ExcelData | null;
  setExcelData: (data: ExcelData) => void;
  inputs: { [date: string]: DailyInput };
  setInput: (date: string, vendorId: string, item: string, value: number | null) => void;
  resetAll: () => void;
  lastSaved: string | null;
}

const AppContext = createContext<AppContextType | null>(null);

// デフォルトの業者
const defaultVendors: Vendor[] = [
  { id: '1', name: 'さくら塗装' },
  { id: '2', name: '竹内塗装' },
  { id: '3', name: 'リバーランズ' },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [vendors, setVendorsState] = useState<Vendor[]>(defaultVendors);
  const [excelData, setExcelDataState] = useState<ExcelData | null>(null);
  const [inputs, setInputs] = useState<{ [date: string]: DailyInput }>({});
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 初回ロード時にローカルストレージから復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: SavedData = JSON.parse(saved);
        if (data.vendors) setVendorsState(data.vendors);
        if (data.excelData) setExcelDataState(data.excelData);
        if (data.inputs) setInputs(data.inputs);
        if (data.savedAt) setLastSaved(data.savedAt);
        console.log('データを復元しました:', data.savedAt);
      }
    } catch (e) {
      console.error('データの復元に失敗:', e);
    }
    setIsLoaded(true);
  }, []);

  // データが変更されたらローカルストレージに保存
  useEffect(() => {
    if (!isLoaded) return; // 初回ロード完了前は保存しない
    
    try {
      const now = new Date().toLocaleString('ja-JP');
      const data: SavedData = {
        vendors,
        excelData,
        inputs,
        savedAt: now,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setLastSaved(now);
    } catch (e) {
      console.error('データの保存に失敗:', e);
    }
  }, [vendors, excelData, inputs, isLoaded]);

  const setVendors = (newVendors: Vendor[]) => {
    setVendorsState(newVendors);
  };

  const setExcelData = (data: ExcelData) => {
    setExcelDataState(data);
  };

  const setInput = (date: string, vendorId: string, item: string, value: number | null) => {
    setInputs(prev => {
      const newInputs = { ...prev };
      if (!newInputs[date]) {
        newInputs[date] = {};
      }
      if (!newInputs[date][vendorId]) {
        newInputs[date][vendorId] = { bogoufuku: null, tebukuro: null, kyuushukan: null };
      }
      (newInputs[date][vendorId] as any)[item] = value;
      return newInputs;
    });
  };

  const resetAll = () => {
    setVendorsState(defaultVendors);
    setExcelDataState(null);
    setInputs({});
    // ローカルストレージもクリア
    localStorage.removeItem(STORAGE_KEY);
    setLastSaved(null);
  };

  return (
    <AppContext.Provider value={{
      vendors,
      setVendors,
      excelData,
      setExcelData,
      inputs,
      setInput,
      resetAll,
      lastSaved,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
