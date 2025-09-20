import * as XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadData() {
    const filePath = path.join(__dirname, "../../data/final_maliyet_sistemi.ods");
    const workbook = XLSX.readFile(filePath);

    // İlk sayfayı al
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // JSON formatına çevir
    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    return data;
}
