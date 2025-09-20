import express from 'express';
import { parseOdsDefaults } from '../services/odsParser.js';
const router = express.Router();

/**
 * @swagger
 * /api/schema:
 *   get:
 *     summary: Varsayılan hesaplama parametrelerini getirir
 *     tags: [Schema]
 *     description: ODS dosyasından varsayılan döviz kurları, kumaş fiyatları ve diğer hesaplama parametrelerini döndürür. Bu değerler /api/calculate endpoint'inde override edilebilir.
 *     responses:
 *       200:
 *         description: Varsayılan parametreler başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 defaults:
 *                   type: object
 *                   description: Varsayılan hesaplama parametreleri
 *                   properties:
 *                     rates:
 *                       type: object
 *                       description: Varsayılan döviz kurları
 *                       properties:
 *                         EUR:
 *                           type: number
 *                           example: 37.99
 *                         USD:
 *                           type: number
 *                           example: 33.99
 *                         GBP:
 *                           type: number
 *                           example: 44.93
 *                     fabric:
 *                       type: object
 *                       description: Varsayılan kumaş fiyat bilgileri
 *                       properties:
 *                         unit_eur:
 *                           type: number
 *                           example: 4.74
 *                         price_eur:
 *                           type: number
 *                           example: 3.16
 *                         metre_eur:
 *                           type: number
 *                           example: 1.5
 *                     genel_gider:
 *                       type: object
 *                       description: Varsayılan genel gider oranları
 *                       additionalProperties:
 *                         type: number
 *                       example:
 *                         "0-50": 12.5
 *                         "51-100": 10.0
 *                         "101-500": 8.5
 *                     karlilik:
 *                       type: object
 *                       description: Varsayılan karlılık oranları
 *                       additionalProperties:
 *                         type: number
 *                       example:
 *                         "0-50": 25.0
 *                         "51-100": 20.0
 *                     KDV:
 *                       type: number
 *                       description: Varsayılan KDV oranı (%)
 *                       example: 20
 *                     komisyon:
 *                       type: number
 *                       description: Varsayılan komisyon oranı (%)
 *                       example: 5
 *                     operations:
 *                       type: object
 *                       description: Varsayılan işlem maliyetleri
 *                       additionalProperties:
 *                         type: number
 *                       example:
 *                         "cutting": 2.5
 *                         "sewing": 8.0
 *                         "finishing": 3.0
 *                     batch:
 *                       type: object
 *                       description: Varsayılan batch maliyetleri
 *                       additionalProperties:
 *                         type: number
 *                       example:
 *                         "0-50": 25
 *                         "51-100": 20
 *                         "101-500": 15
 *                 note:
 *                   type: string
 *                   description: Kullanım talimatları
 *                   example: "You can POST to /api/calculate with overrides to compute results."
 *       500:
 *         description: Sunucu hatası - ODS dosyası parse edilemedi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "ODS dosyası okunamadı veya parse edilemedi"
 */
router.get('/', (req, res) => {
    try {
        const defs = parseOdsDefaults();
        res.json({ success: true, defaults: defs, note: 'You can POST to /api/calculate with overrides to compute results.' });
    } catch (err) {
        res.status(500).json({ success:false, error: err.message });
    }
});

export default router;