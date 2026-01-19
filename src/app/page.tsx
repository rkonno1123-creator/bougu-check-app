'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, Vendor } from '@/context/AppContext';
import { readExcelFile } from '@/lib/excelUtils';

export default function HomePage() {
  const router = useRouter();
  const { vendors, setVendors, setExcelData, resetAll, excelData, lastSaved } = useApp();
  const [localVendors, setLocalVendors] = useState<Vendor[]>(vendors);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 保存データがある場合、localVendorsを更新
  useEffect(() => {
    if (vendors.length > 0) {
      setLocalVendors(vendors);
    }
  }, [vendors]);

  // 業者追加
  const addVendor = () => {
    const newId = String(localVendors.length + 1);
    setLocalVendors([...localVendors, { id: newId, name: '' }]);
  };

  // 業者削除
  const removeVendor = (id: string) => {
    if (localVendors.length <= 1) return;
    setLocalVendors(localVendors.filter(v => v.id !== id));
  };

  // 業者名変更
  const updateVendorName = (id: string, name: string) => {
    setLocalVendors(localVendors.map(v => v.id === id ? { ...v, name } : v));
  };

  // 続きから再開
  const handleContinue = () => {
    if (excelData) {
      router.push('/input');
    }
  };

  // 新規開始
  const handleStart = async () => {
    // バリデーション
    const emptyVendor = localVendors.find(v => !v.name.trim());
    if (emptyVendor) {
      setError('業者名を入力してください');
      return;
    }
    if (!excelFile) {
      setError('Excelファイルを選択してください');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      resetAll();
      const data = await readExcelFile(excelFile);
      setExcelData(data);
      setVendors(localVendors);
      router.push('/input');
    } catch (err) {
      setError('Excelの読み込みに失敗: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // データクリア
  const handleClear = () => {
    if (confirm('保存されているデータをすべて削除しますか？')) {
      resetAll();
      setLocalVendors([
        { id: '1', name: 'さくら塗装' },
        { id: '2', name: '竹内塗装' },
        { id: '3', name: 'リバーランズ' },
      ]);
      setExcelFile(null);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">防護具照合チェック</h1>

        {/* 保存データがある場合 */}
        {excelData && lastSaved && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 font-medium mb-2">📁 前回のデータがあります</p>
            <p className="text-sm text-blue-600 mb-3">最終保存: {lastSaved}</p>
            <div className="flex gap-2">
              <button
                onClick={handleContinue}
                className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                続きから再開
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50"
              >
                クリア
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">業者登録</h2>
          
          <div className="space-y-3 mb-4">
            {localVendors.map((vendor, index) => (
              <div key={vendor.id} className="flex gap-2">
                <span className="w-8 py-2 text-gray-500 text-sm">{index + 1}.</span>
                <input
                  type="text"
                  value={vendor.name}
                  onChange={(e) => updateVendorName(vendor.id, e.target.value)}
                  placeholder="業者名"
                  className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {localVendors.length > 1 && (
                  <button
                    onClick={() => removeVendor(vendor.id)}
                    className="px-3 py-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <button
            onClick={addVendor}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-400 hover:text-blue-500"
          >
            + 業者を追加
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Excel集計表</h2>
          
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
              excelFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            {excelFile ? (
              <p className="text-green-600 font-medium">✓ {excelFile.name}</p>
            ) : (
              <p className="text-gray-500">クリックしてExcelファイルを選択</p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded mb-6">
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? '読み込み中...' : '新規開始'}
        </button>
      </div>
    </div>
  );
}
