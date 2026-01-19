'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const ITEMS = [
  { key: 'bogoufuku', label: '防護服', bgClass: 'bg-amber-100' },
  { key: 'tebukuro', label: '手袋', bgClass: 'bg-blue-100' },
  { key: 'kyuushukan', label: '吸収缶', bgClass: 'bg-emerald-100' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function SummaryPage() {
  const router = useRouter();
  const { vendors, excelData, inputs } = useApp();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!excelData || vendors.length === 0) {
      router.push('/');
    }
  }, [excelData, vendors, router]);

  if (!excelData || vendors.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  // 集計計算
  const calculateSummary = (date: string, itemKey: string) => {
    let total = 0;
    for (const vendor of vendors) {
      const val = inputs[date]?.[vendor.id]?.[itemKey as keyof typeof inputs[string][string]];
      if (val !== null && val !== undefined) {
        total += val as number;
      }
    }
    return total;
  };

  // 各業者の内訳を取得
  const getBreakdown = (date: string, itemKey: string) => {
    const breakdown: { name: string; value: number }[] = [];
    for (const vendor of vendors) {
      const val = inputs[date]?.[vendor.id]?.[itemKey as keyof typeof inputs[string][string]];
      const value = val !== null && val !== undefined ? (val as number) : 0;
      // 会社名の1文字目を取得
      const shortName = vendor.name.charAt(0);
      breakdown.push({ name: shortName, value });
    }
    return breakdown;
  };

  // ステータス判定
  const getStatus = (date: string, itemKey: string) => {
    const total = calculateSummary(date, itemKey);
    const excelVal = excelData.values[date]?.[itemKey as keyof typeof excelData.values[string]] || 0;
    
    // 入力があるか確認
    let hasInput = false;
    for (const vendor of vendors) {
      const val = inputs[date]?.[vendor.id]?.[itemKey as keyof typeof inputs[string][string]];
      if (val !== null && val !== undefined) {
        hasInput = true;
        break;
      }
    }
    
    if (!hasInput) return 'unchecked';
    return total === excelVal ? 'ok' : 'warning';
  };

  // ツールチップ表示
  const showTooltip = (e: React.MouseEvent, date: string, itemKey: string) => {
    const breakdown = getBreakdown(date, itemKey);
    const content = breakdown.map(b => `${b.name} ${b.value}`).join('\n');
    setTooltip({
      x: e.clientX + 10,
      y: e.clientY + 10,
      content,
    });
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  // 全体の統計
  const stats = {
    total: excelData.dates.length * ITEMS.length,
    ok: 0,
    warning: 0,
    unchecked: 0,
  };

  for (const date of excelData.dates) {
    for (const item of ITEMS) {
      const status = getStatus(date, item.key);
      stats[status]++;
    }
  }

  // PDF出力
  const handleExportPdf = () => {
    // 印刷用のスタイルを適用してwindow.print()を使用
    const printContent = document.getElementById('printArea');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>防護具照合結果</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 20px;
            font-size: 12px;
          }
          h1 {
            font-size: 18px;
            margin-bottom: 20px;
          }
          .stats {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
          }
          .stat-box {
            padding: 10px 20px;
            border: 1px solid #ccc;
            border-radius: 4px;
          }
          .stat-box.ok { background: #dcfce7; }
          .stat-box.warning { background: #fef3c7; }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 4px 8px;
            text-align: center;
          }
          th {
            background: #f3f4f6;
          }
          .bg-amber { background: #fef3c7; }
          .bg-blue { background: #dbeafe; }
          .bg-emerald { background: #d1fae5; }
          .ok { color: green; }
          .warning { color: orange; font-weight: bold; }
          .breakdown {
            font-size: 10px;
            color: #666;
            white-space: pre-line;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>防護具照合結果</h1>
        <div class="stats">
          <div class="stat-box">日数: ${excelData.dates.length}</div>
          <div class="stat-box ok">OK: ${stats.ok}</div>
          <div class="stat-box warning">要確認: ${stats.warning}</div>
          <div class="stat-box">未入力: ${stats.unchecked}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th rowspan="2">日付</th>
              ${ITEMS.map(item => `<th colspan="3" class="bg-${item.key === 'bogoufuku' ? 'amber' : item.key === 'tebukuro' ? 'blue' : 'emerald'}">${item.label}</th>`).join('')}
            </tr>
            <tr>
              ${ITEMS.map(() => '<th>入力</th><th>Excel</th><th>結果</th>').join('')}
            </tr>
          </thead>
          <tbody>
            ${excelData.dates.map(date => {
              return `<tr>
                <td>${formatDate(date)}</td>
                ${ITEMS.map(item => {
                  const total = calculateSummary(date, item.key);
                  const excel = excelData.values[date]?.[item.key as keyof typeof excelData.values[string]] || 0;
                  const status = getStatus(date, item.key);
                  const breakdown = getBreakdown(date, item.key);
                  const breakdownText = breakdown.map(b => `${b.name}:${b.value}`).join(' ');
                  
                  return `
                    <td>${total || '-'}${status === 'warning' ? `<br><span class="breakdown">${breakdownText}</span>` : ''}</td>
                    <td>${excel}</td>
                    <td class="${status}">${status === 'ok' ? '✓' : status === 'warning' ? '⚠' : '-'}</td>
                  `;
                }).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // 少し待ってから印刷ダイアログを開く
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">集計結果</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/input')}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              ← 入力に戻る
            </button>
            <button
              onClick={handleExportPdf}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              PDF出力
            </button>
          </div>
        </div>

        {/* 統計サマリー */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold">{excelData.dates.length}</p>
            <p className="text-sm text-gray-500">日数</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.ok}</p>
            <p className="text-sm text-gray-500">OK</p>
          </div>
          <div className="bg-orange-50 rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{stats.warning}</p>
            <p className="text-sm text-gray-500">要確認</p>
          </div>
          <div className="bg-gray-50 rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{stats.unchecked}</p>
            <p className="text-sm text-gray-500">未入力</p>
          </div>
        </div>

        {/* 結果テーブル */}
        <div id="printArea" className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left">日付</th>
                {ITEMS.map(item => (
                  <th key={item.key} colSpan={3} className={`px-3 py-2 text-center ${item.bgClass}`}>
                    {item.label}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50 text-xs">
                <th></th>
                {ITEMS.map(item => (
                  <th key={`${item.key}-header`} colSpan={3} className="px-2 py-1">
                    <div className="flex justify-around">
                      <span>入力</span>
                      <span>Excel</span>
                      <span>結果</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {excelData.dates.map(date => (
                <tr key={date} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{formatDate(date)}</td>
                  {ITEMS.map(item => {
                    const total = calculateSummary(date, item.key);
                    const excel = excelData.values[date]?.[item.key as keyof typeof excelData.values[string]] || 0;
                    const status = getStatus(date, item.key);
                    
                    return (
                      <td key={`${date}-${item.key}`} colSpan={3} className="px-2 py-2">
                        <div className="flex justify-around items-center">
                          <span>{total || '-'}</span>
                          <span>{excel}</span>
                          <span
                            className={`cursor-pointer ${status === 'warning' ? 'relative' : ''}`}
                            onMouseEnter={(e) => status === 'warning' && showTooltip(e, date, item.key)}
                            onMouseLeave={hideTooltip}
                          >
                            {status === 'ok' && <span className="text-green-600">✓</span>}
                            {status === 'warning' && <span className="text-orange-500 font-bold">⚠</span>}
                            {status === 'unchecked' && <span className="text-gray-300">-</span>}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 凡例 */}
        <div className="mt-4 flex gap-6 text-sm text-gray-500">
          <span><span className="text-green-600">✓</span> 一致</span>
          <span><span className="text-orange-500">⚠</span> 不一致（ホバーで内訳表示）</span>
          <span><span className="text-gray-300">-</span> 未入力</span>
        </div>

        {/* ツールチップ */}
        {tooltip && (
          <div
            className="fixed bg-gray-800 text-white px-3 py-2 rounded shadow-lg text-sm whitespace-pre-line z-50"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
}
