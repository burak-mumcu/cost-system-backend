import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const odsPath = process.env.ODS_PATH || path.join(process.cwd(), 'data', 'final_maliyet_sistemi.ods');

export function parseOdsDefaults() {
    if (!fs.existsSync(odsPath)) throw new Error('ODS file not found at ' + odsPath);
    const workbook = XLSX.readFile(odsPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // We'll read by absolute coordinates we inspected
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    // helper to safely read
    const v = (r, c) => (rows[r] && rows[r][c] != null ? rows[r][c] : null);

    const defaults = {
        rates: { EUR: v(2,1), USD: v(3,1), GBP: v(4,1) },
        fabric: { price_eur: v(2,4), metre_eur: v(3,4), unit_eur: v(4,4) },
        genel_gider: { '0-50': v(7,1), '51-100': v(8,1), '101-200': v(9,1) },
        karlilik: { '0-50': v(13,1), '51-100': v(14,1), '101-200': v(15,1) },
        KDV: v(18,1),
        komisyon: v(19,1),
        operations: {}
    };

    // operations rows 29-35 and range columns 1..3
    const opsRows = [29,30,31,32,33,34,35];
    for (const r of opsRows) {
        const name = v(r,0);
        if (!name) continue;
        defaults.operations[name] = {
            '0-50': v(r,1) || 0,
            '51-100': v(r,2) || 0,
            '101-200': v(r,3) || 0
        };
    }

    return defaults;
}
