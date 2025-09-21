// src/services/odsParser.js - DÜZELTME

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { config } from '../config/environment.js';
import { ODS_STRUCTURE, APP_CONSTANTS } from '../config/constants.js';
import { FileNotFoundError, FileParseError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { cacheHelpers } from '../utils/cache.js';

class OdsParser {
    constructor() {
        this.odsPath = config.odsPath;
        this.lastModified = null;
    }

    parseOdsDefaults() {
        const startTime = Date.now();

        try {
            // Check cache first
            const cached = cacheHelpers.getOdsDefaults();
            if (cached && this.isFileUnchanged()) {
                logger.debug('Using cached ODS defaults', {
                    filePath: this.odsPath
                });
                return cached;
            }

            // Validate file exists
            if (!fs.existsSync(this.odsPath)) {
                throw new FileNotFoundError(this.odsPath);
            }

            // Check file permissions
            try {
                fs.accessSync(this.odsPath, fs.constants.R_OK);
            } catch (error) {
                throw new FileParseError(this.odsPath, 'File is not readable');
            }

            // Read and parse file
            const workbook = this.readWorkbook();
            const defaults = this.extractDefaults(workbook);

            // Validate extracted data
            this.validateDefaults(defaults);

            // Cache the results
            cacheHelpers.setOdsDefaults(defaults);
            this.updateLastModified();

            const duration = Date.now() - startTime;
            logger.logFileOperation('parse', this.odsPath, true);
            logger.logPerformance('ODS parsing', duration, {
                filePath: this.odsPath,
                cacheUsed: false
            });

            return defaults;

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.logFileOperation('parse', this.odsPath, false, error);
            logger.error('ODS parsing failed', error, {
                filePath: this.odsPath,
                duration
            });

            if (error instanceof FileNotFoundError || error instanceof FileParseError) {
                throw error;
            }

            throw new FileParseError(this.odsPath, error.message);
        }
    }

    readWorkbook() {
        try {
            const workbook = XLSX.readFile(this.odsPath);

            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('No sheets found in workbook');
            }

            return workbook;
        } catch (error) {
            throw new FileParseError(this.odsPath, `Failed to read workbook: ${error.message}`);
        }
    }

    extractDefaults(workbook) {
        const sheetName = workbook.SheetNames[ODS_STRUCTURE.DEFAULT_SHEET_INDEX];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
            throw new Error(`Sheet "${sheetName}" not found`);
        }

        // Convert sheet to rows
        const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: null,
            raw: false // Ensure numbers are converted properly
        });

        logger.debug('Sheet converted to rows', {
            sheetName,
            rowCount: rows.length
        });

        return {
            rates: this.extractRates(rows),
            fabric: this.extractFabric(rows),
            genel_gider: this.extractGenelGider(rows),
            karlilik: this.extractKarlilik(rows),
            KDV: this.extractKDV(rows),
            komisyon: this.extractKomisyon(rows),
            operations: this.extractOperations(rows)
        };
    }

    // DÜZELTME: Virgülden noktaya çeviren fonksiyon
    parseNumber(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        // Eğer zaten sayı ise direkt dön
        if (typeof value === 'number') {
            return value;
        }

        // String ise virgülü noktaya çevir
        if (typeof value === 'string') {
            // Virgül ile nokta yer değiştir (Türkçe format)
            const normalized = value.trim().replace(',', '.');
            const num = parseFloat(normalized);

            if (isNaN(num)) {
                logger.warn('Could not parse number from ODS', {
                    originalValue: value,
                    normalizedValue: normalized
                });
                return null;
            }

            return num;
        }

        return null;
    }

    safeValue(rows, row, col) {
        if (!rows[row] || rows[row][col] === undefined || rows[row][col] === null) {
            return null;
        }

        const value = rows[row][col];
        return this.parseNumber(value); // DÜZELTME: parseNumber kullan
    }

    extractRates(rows) {
        const rates = {
            EUR: this.safeValue(rows, ODS_STRUCTURE.RATES_START_ROW, ODS_STRUCTURE.COLUMNS.RATE_VALUES),
            USD: this.safeValue(rows, ODS_STRUCTURE.RATES_START_ROW + 1, ODS_STRUCTURE.COLUMNS.RATE_VALUES),
            GBP: this.safeValue(rows, ODS_STRUCTURE.RATES_START_ROW + 2, ODS_STRUCTURE.COLUMNS.RATE_VALUES)
        };

        // Use defaults if any rate is missing or invalid
        Object.keys(rates).forEach(currency => {
            if (!rates[currency] || rates[currency] <= 0) {
                rates[currency] = APP_CONSTANTS.DEFAULT_EXCHANGE_RATES[currency];
                logger.warn('Using default exchange rate', {
                    currency,
                    defaultRate: rates[currency],
                    originalValue: rows[ODS_STRUCTURE.RATES_START_ROW + (currency === 'EUR' ? 0 : currency === 'USD' ? 1 : 2)][ODS_STRUCTURE.COLUMNS.RATE_VALUES]
                });
            }
        });

        return rates;
    }

    extractFabric(rows) {
        const fabric = {
            price_eur: this.safeValue(rows, ODS_STRUCTURE.FABRIC_START_ROW, ODS_STRUCTURE.COLUMNS.FABRIC_VALUES) || 0,
            metre_eur: this.safeValue(rows, ODS_STRUCTURE.FABRIC_START_ROW + 1, ODS_STRUCTURE.COLUMNS.FABRIC_VALUES) || 0,
            unit_eur: this.safeValue(rows, ODS_STRUCTURE.FABRIC_START_ROW + 2, ODS_STRUCTURE.COLUMNS.FABRIC_VALUES) || 0
        };

        logger.debug('Extracted fabric data', fabric); // Debug log ekle

        return fabric;
    }

    extractGenelGider(rows) {
        return {
            '0-50': this.safeValue(rows, ODS_STRUCTURE.GENEL_GIDER_START_ROW, ODS_STRUCTURE.COLUMNS.RANGE_0_50) || 0,
            '51-100': this.safeValue(rows, ODS_STRUCTURE.GENEL_GIDER_START_ROW + 1, ODS_STRUCTURE.COLUMNS.RANGE_51_100) || 0,
            '101-200': this.safeValue(rows, ODS_STRUCTURE.GENEL_GIDER_START_ROW + 2, ODS_STRUCTURE.COLUMNS.RANGE_101_200) || 0
        };
    }

    extractKarlilik(rows) {
        return {
            '0-50': this.safeValue(rows, ODS_STRUCTURE.KARLILIK_START_ROW, ODS_STRUCTURE.COLUMNS.RANGE_0_50) || 0,
            '51-100': this.safeValue(rows, ODS_STRUCTURE.KARLILIK_START_ROW + 1, ODS_STRUCTURE.COLUMNS.RANGE_51_100) || 0,
            '101-200': this.safeValue(rows, ODS_STRUCTURE.KARLILIK_START_ROW + 2, ODS_STRUCTURE.COLUMNS.RANGE_101_200) || 0
        };
    }

    extractKDV(rows) {
        return this.safeValue(rows, ODS_STRUCTURE.KDV_ROW, ODS_STRUCTURE.COLUMNS.RATE_VALUES) || 20;
    }

    extractKomisyon(rows) {
        return this.safeValue(rows, ODS_STRUCTURE.KOMISYON_ROW, ODS_STRUCTURE.COLUMNS.RATE_VALUES) || 5;
    }

    extractOperations(rows) {
        const operations = {};

        for (let i = ODS_STRUCTURE.OPERATIONS_START_ROW; i <= ODS_STRUCTURE.OPERATIONS_END_ROW; i++) {
            const name = rows[i] ? rows[i][ODS_STRUCTURE.COLUMNS.OPERATION_NAME] : null;

            if (!name || typeof name !== 'string') {
                continue;
            }

            operations[name.trim()] = {
                '0-50': this.safeValue(rows, i, ODS_STRUCTURE.COLUMNS.RANGE_0_50) || 0,
                '51-100': this.safeValue(rows, i, ODS_STRUCTURE.COLUMNS.RANGE_51_100) || 0,
                '101-200': this.safeValue(rows, i, ODS_STRUCTURE.COLUMNS.RANGE_101_200) || 0
            };
        }

        return operations;
    }

    validateDefaults(defaults) {
        const errors = [];

        // Validate rates
        if (!defaults.rates || typeof defaults.rates !== 'object') {
            errors.push('Invalid rates data structure');
        } else {
            APP_CONSTANTS.SUPPORTED_CURRENCIES.forEach(currency => {
                const rate = defaults.rates[currency];
                if (typeof rate !== 'number' || rate <= 0 || isNaN(rate)) {
                    logger.warn('Invalid rate detected', { currency, rate, type: typeof rate });
                    errors.push(`Invalid exchange rate for ${currency}: ${rate}`);
                }
            });
        }

        // Validate fabric - daha esnek validation
        if (!defaults.fabric || typeof defaults.fabric !== 'object') {
            errors.push('Invalid fabric data structure');
        } else {
            Object.entries(defaults.fabric).forEach(([key, value]) => {
                if (typeof value !== 'number' || isNaN(value)) {
                    logger.warn('Invalid fabric value detected', { key, value, type: typeof value });
                    // Fabric değerleri 0 olabilir, bu normal
                }
            });
        }

        // Validate ranges
        APP_CONSTANTS.BATCH_RANGES.forEach(range => {
            const genelGider = defaults.genel_gider[range];
            const karlilik = defaults.karlilik[range];

            if (typeof genelGider !== 'number' || isNaN(genelGider)) {
                errors.push(`Invalid genel_gider for range ${range}: ${genelGider}`);
            }
            if (typeof karlilik !== 'number' || isNaN(karlilik)) {
                errors.push(`Invalid karlilik for range ${range}: ${karlilik}`);
            }
        });

        // Validate percentages
        if (typeof defaults.KDV !== 'number' || defaults.KDV < 0 || isNaN(defaults.KDV)) {
            errors.push(`Invalid KDV value: ${defaults.KDV}`);
        }
        if (typeof defaults.komisyon !== 'number' || defaults.komisyon < 0 || isNaN(defaults.komisyon)) {
            errors.push(`Invalid komisyon value: ${defaults.komisyon}`);
        }

        if (errors.length > 0) {
            logger.error('ODS validation failed', { errors, defaults });
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
    }

    isFileUnchanged() {
        try {
            const stats = fs.statSync(this.odsPath);
            return this.lastModified && stats.mtime.getTime() === this.lastModified;
        } catch (error) {
            return false;
        }
    }

    updateLastModified() {
        try {
            const stats = fs.statSync(this.odsPath);
            this.lastModified = stats.mtime.getTime();
        } catch (error) {
            logger.warn('Could not update last modified time', { error: error.message });
        }
    }

    getFileInfo() {
        try {
            const stats = fs.statSync(this.odsPath);
            return {
                path: this.odsPath,
                exists: true,
                size: stats.size,
                modified: stats.mtime.toISOString(),
                readable: true
            };
        } catch (error) {
            return {
                path: this.odsPath,
                exists: false,
                error: error.message
            };
        }
    }
}

// Create singleton instance
const odsParser = new OdsParser();

// Export main function for backward compatibility
export function parseOdsDefaults() {
    return odsParser.parseOdsDefaults();
}

// Export parser instance for advanced usage
export { odsParser };
export default odsParser;