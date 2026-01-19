import * as XLSX from 'xlsx';

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

// 項目設定
const ITEM_CONFIG = {
  bogoufuku: { excelSheetName: '防護服' },
  tebukuro: { excelSheetName: '防護手袋' },
  kyuushukan: { excelSheetName: 'フィルター' },
};

type ItemType = 'bogoufuku' | 'tebukuro' | 'kyuushukan';

// Excelファイルからデータを読み込む
export async function readExcelFile(file: File): Promise<ExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const excelData: ExcelData = {
          dates: [],
          values: {},
        };
        
        // 各シートから日付と使用数を読み取る
        const itemTypes: ItemType[] = ['bogoufuku', 'tebukuro', 'kyuushukan'];
        
        for (const itemType of itemTypes) {
          const sheetName = ITEM_CONFIG[itemType].excelSheetName;
          const sheet = workbook.Sheets[sheetName];
          
          if (!sheet) {
            console.warn(`シート "${sheetName}" が見つかりません`);
            continue;
          }
          
          // シートをJSONに変換（ヘッダーなし）
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          
          // 7行目以降がデータ（0-indexed で 6から）
          for (let i = 6; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            
            // 列0: 日付
            const dateCell = row[0];
            if (!dateCell) continue;
            
            // 日付をパース
            let dateStr: string | null = null;
            if (dateCell instanceof Date) {
              dateStr = formatDate(dateCell);
            } else if (typeof dateCell === 'string') {
              const parsed = parseJapaneseDate(dateCell);
              if (parsed) dateStr = parsed;
            } else if (typeof dateCell === 'number') {
              // Excelのシリアル値
              const date = XLSX.SSF.parse_date_code(dateCell);
              if (date) {
                dateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
              }
            }
            
            if (!dateStr) continue;
            
            // 列3: 使用数（Excelの構造から）
            const usageValue = row[3];
            
            // 使用列に数字がない場合はスキップ（搬入日など）
            if (typeof usageValue !== 'number' || isNaN(usageValue)) {
              continue;
            }
            
            const usage = usageValue;
            
            // 日付リストに追加（重複チェック）
            if (!excelData.dates.includes(dateStr)) {
              excelData.dates.push(dateStr);
            }
            
            // 値を格納
            if (!excelData.values[dateStr]) {
              excelData.values[dateStr] = {
                bogoufuku: 0,
                tebukuro: 0,
                kyuushukan: 0,
              };
            }
            excelData.values[dateStr][itemType] = usage;
          }
        }
        
        // 日付をソート
        excelData.dates.sort();
        
        resolve(excelData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsArrayBuffer(file);
  });
}

// 日付をYYYY-MM-DD形式にフォーマット
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 日本語日付をパース（例: "2025/10/06"）
function parseJapaneseDate(dateStr: string): string | null {
  const match = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

// 日付を表示用にフォーマット（MM/DD）
export function formatDateForDisplay(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  }
  return dateStr;
}

// 日付を表示用にフォーマット（YYYY/MM/DD）
export function formatDateFull(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[0]}/${parseInt(parts[1])}/${parseInt(parts[2])}`;
  }
  return dateStr;
}
