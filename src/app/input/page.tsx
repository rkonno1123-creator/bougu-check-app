'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

// 月曜始まりの週を取得（カレンダーベース、月〜金の5日間）
function getWeeks(dates: string[]): { start: string; end: string; weekDates: string[]; dataDates: string[] }[] {
  if (dates.length === 0) return [];
  
  // データの最初と最後の日付を取得
  const sortedDates = [...dates].sort();
  const firstDate = new Date(sortedDates[0]);
  const lastDate = new Date(sortedDates[sortedDates.length - 1]);
  
  // 最初の日付が含まれる週の月曜日を取得
  const firstMonday = new Date(firstDate);
  const firstDayOfWeek = firstDate.getDay(); // 0=日, 1=月, ...
  const daysToMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  firstMonday.setDate(firstDate.getDate() - daysToMonday);
  
  // 最後の日付が含まれる週の金曜日を取得
  const lastFriday = new Date(lastDate);
  const lastDayOfWeek = lastDate.getDay();
  const daysToFriday = lastDayOfWeek === 0 ? -2 : 5 - lastDayOfWeek;
  lastFriday.setDate(lastDate.getDate() + daysToFriday);
  
  // データ日付をSetに変換（高速検索用）
  const dateSet = new Set(dates);
  
  const weeks: { start: string; end: string; weekDates: string[]; dataDates: string[] }[] = [];
  
  // 月曜日から金曜日までの週を生成
  let currentMonday = new Date(firstMonday);
  
  while (currentMonday <= lastFriday) {
    const weekDates: string[] = [];
    const dataDates: string[] = [];
    
    // 月〜金の5日間を生成
    for (let i = 0; i < 5; i++) {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      const dateStr = formatDateToISO(d);
      weekDates.push(dateStr);
      
      // この日にデータがあるか確認
      if (dateSet.has(dateStr)) {
        dataDates.push(dateStr);
      }
    }
    
    // この週に1日でもデータがあれば追加
    if (dataDates.length > 0) {
      weeks.push({
        start: weekDates[0],
        end: weekDates[4],
        weekDates,  // 月〜金の5日間
        dataDates,  // データがある日のみ
      });
    }
    
    // 次の週へ（7日後）
    currentMonday.setDate(currentMonday.getDate() + 7);
  }
  
  return weeks;
}

// 日付をYYYY-MM-DD形式に変換
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 日付フォーマット
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatWeekLabel(start: string, end: string): string {
  return `${formatDate(start)} 〜 ${formatDate(end)}`;
}

const ITEMS = [
  { key: 'bogoufuku', label: '防護服', bgClass: 'item-bogoufuku' },
  { key: 'tebukuro', label: '手袋', bgClass: 'item-tebukuro' },
  { key: 'kyuushukan', label: '吸収缶', bgClass: 'item-kyuushukan' },
];

export default function InputPage() {
  const router = useRouter();
  const { vendors, excelData, inputs, setInput } = useApp();
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  const weeks = excelData ? getWeeks(excelData.dates) : [];

  useEffect(() => {
    if (!excelData || vendors.length === 0) {
      router.push('/');
      return;
    }
    setSelectedVendorId(vendors[0].id);
  }, [excelData, vendors, router]);

  if (!excelData || vendors.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  const currentWeek = weeks[selectedWeekIndex];
  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  // 入力値取得
  const getValue = (date: string, item: string): string => {
    const val = inputs[date]?.[selectedVendorId]?.[item as keyof typeof inputs[string][string]];
    return val !== null && val !== undefined ? String(val) : '';
  };

  // 入力値更新
  const handleChange = (date: string, item: string, value: string) => {
    const numVal = value === '' ? null : parseInt(value) || 0;
    setInput(date, selectedVendorId, item, numVal);
  };

  // 次の業者 or 次の週へ
  const handleNext = () => {
    const currentVendorIndex = vendors.findIndex(v => v.id === selectedVendorId);
    
    if (selectedWeekIndex < weeks.length - 1) {
      // 次の週へ
      setSelectedWeekIndex(selectedWeekIndex + 1);
    } else if (currentVendorIndex < vendors.length - 1) {
      // 次の業者へ、週をリセット
      setSelectedVendorId(vendors[currentVendorIndex + 1].id);
      setSelectedWeekIndex(0);
    } else {
      // 全部完了 → 集計へ
      router.push('/summary');
    }
  };

  // 前へ
  const handlePrev = () => {
    if (selectedWeekIndex > 0) {
      setSelectedWeekIndex(selectedWeekIndex - 1);
    } else {
      const currentVendorIndex = vendors.findIndex(v => v.id === selectedVendorId);
      if (currentVendorIndex > 0) {
        setSelectedVendorId(vendors[currentVendorIndex - 1].id);
        setSelectedWeekIndex(weeks.length - 1);
      }
    }
  };

  const currentVendorIndex = vendors.findIndex(v => v.id === selectedVendorId);
  const isFirst = currentVendorIndex === 0 && selectedWeekIndex === 0;
  const isLast = currentVendorIndex === vendors.length - 1 && selectedWeekIndex === weeks.length - 1;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← 設定に戻る
          </button>
          <button
            onClick={() => router.push('/summary')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            集計へ →
          </button>
        </div>

        {/* 業者選択 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {vendors.map((vendor, index) => (
            <button
              key={vendor.id}
              onClick={() => {
                setSelectedVendorId(vendor.id);
              }}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                vendor.id === selectedVendorId
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              {vendor.name}
            </button>
          ))}
        </div>

        {/* 週選択 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {weeks.map((week, index) => (
            <button
              key={index}
              onClick={() => setSelectedWeekIndex(index)}
              className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                index === selectedWeekIndex
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              {formatWeekLabel(week.start, week.end)}
            </button>
          ))}
        </div>

        {/* 入力テーブル */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
          <div className="bg-gray-100 px-4 py-3 font-semibold">
            {selectedVendor?.name} - {currentWeek && formatWeekLabel(currentWeek.start, currentWeek.end)}
          </div>
          
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left w-24">項目</th>
                {currentWeek?.weekDates.map(date => {
                  const hasData = currentWeek.dataDates.includes(date);
                  return (
                    <th key={date} className={`px-2 py-2 text-center ${!hasData ? 'text-gray-300' : ''}`}>
                      {formatDate(date)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ITEMS.map(item => (
                <tr key={item.key} className={item.bgClass}>
                  <td className="px-4 py-3 font-medium">{item.label}</td>
                  {currentWeek?.weekDates.map(date => {
                    const hasData = currentWeek.dataDates.includes(date);
                    return (
                      <td key={date} className="px-2 py-2">
                        {hasData ? (
                          <input
                            type="number"
                            min="0"
                            value={getValue(date, item.key)}
                            onChange={(e) => handleChange(date, item.key, e.target.value)}
                            className="w-full px-2 py-1 text-center border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="w-full px-2 py-1 text-center text-gray-300">-</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ナビゲーション */}
        <div className="flex justify-between">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className="px-6 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            ← 前へ
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {isLast ? '集計へ' : '次へ →'}
          </button>
        </div>
      </div>
    </div>
  );
}
