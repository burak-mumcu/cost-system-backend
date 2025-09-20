import { parseOdsDefaults } from './odsParser.js';

const DEFAULT_BATCH = { '0-50':25, '51-100':75, '101-200':150 };

export function calculateFromInput(input = {}, overrides = {}) {
    // get defaults from ODS
    const defs = parseOdsDefaults();

    // merge inputs: overrides -> input -> defaults
    const rates = { ...defs.rates, ...(input.rates || {}), ...(overrides.rates || {}) };
    const fabric = { ...defs.fabric, ...(input.fabric || {}), ...(overrides.fabric || {}) };
    const genel = { ...defs.genel_gider, ...(input.genel_gider || {}), ...(overrides.genel_gider || {}) };
    const karlilik = { ...defs.karlilik, ...(input.karlilik || {}), ...(overrides.karlilik || {}) };
    const KDV = (input.KDV ?? defs.KDV);
    const komisyon = (input.komisyon ?? defs.komisyon);
    const operations = { ...defs.operations, ...(input.operations || {}), ...(overrides.operations || {}) };
    const batch = { ...DEFAULT_BATCH, ...(input.batch || {}) };

    const ranges = ['0-50','51-100','101-200'];
    const out = {};

    for (const r of ranges) {
        // sum all ops TRY for this range
        let totalOpsTry = 0;
        for (const opName of Object.keys(operations)) {
            totalOpsTry += Number(operations[opName][r] || 0);
        }
        const perUnitOpsTry = totalOpsTry / (batch[r] || 1);
        const perUnitOpsEur = perUnitOpsTry / Number(rates.EUR);

        const perUnitEur = Number(fabric.unit_eur || fabric.price_eur || 0) + perUnitOpsEur;
        const hamMaliyetEur = perUnitEur * (batch[r] || 1);
        const genelGiderEur = hamMaliyetEur * (Number(genel[r] || 0) / 100);
        const karEur = hamMaliyetEur * (Number(karlilik[r] || 0) / 100);
        const taxable = hamMaliyetEur + genelGiderEur + karEur;
        const kdvEur = taxable * (Number(KDV || 0) / 100);
        const commissionEur = taxable * (Number(komisyon || 0) / 100);
        const finalEur = taxable + kdvEur + commissionEur;
        const finalTry = finalEur * Number(rates.EUR);
        const finalUsd = finalTry / Number(rates.USD);
        const finalGbp = finalTry / Number(rates.GBP);

        out[r] = {
            batchSize: batch[r],
            perUnitEur,
            hamMaliyetEur,
            genelGiderEur,
            karEur,
            kdvEur,
            commissionEur,
            finalEur,
            finalTry,
            finalUsd,
            finalGbp
        };
    }

    return { rates, fabric, genel, karlilik, KDV, komisyon, operations, result: out };
}
