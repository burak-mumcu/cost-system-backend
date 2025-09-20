import express from 'express';
import { calculateFromInput } from '../services/calculator.js';

const router = express.Router();

/**
 * @swagger
 * /api/calculate:
 *   post:
 *     summary: Maliyet hesaplaması yapar
 *     tags: [Calculate]
 *     description: Döviz kurları, kumaş fiyatları ve diğer parametreler ile maliyet hesaplaması
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rates:
 *                 type: object
 *                 description: Döviz kurları
 *                 properties:
 *                   EUR:
 *                     type: number
 *                     example: 37.99
 *                   USD:
 *                     type: number
 *                     example: 33.99
 *                   GBP:
 *                     type: number
 *                     example: 44.93
 *               fabric:
 *                 type: object
 *                 description: Kumaş fiyat bilgileri
 *                 properties:
 *                   unit_eur:
 *                     type: number
 *                     example: 4.74
 *                   price_eur:
 *                     type: number
 *                     example: 3.16
 *                   metre_eur:
 *                     type: number
 *                     example: 1.5
 *               genel_gider:
 *                 type: object
 *                 description: Genel gider oranları (adet aralığına göre)
 *                 additionalProperties:
 *                   type: number
 *                 example:
 *                   "0-50": 12.5
 *                   "51-100": 10.0
 *                   "101-500": 8.5
 *               karlilik:
 *                 type: object
 *                 description: Karlılık oranları
 *                 additionalProperties:
 *                   type: number
 *                 example:
 *                   "0-50": 25.0
 *                   "51-100": 20.0
 *               KDV:
 *                 type: number
 *                 description: KDV oranı (%)
 *                 example: 20
 *               komisyon:
 *                 type: number
 *                 description: Komisyon oranı (%)
 *                 example: 5
 *               operations:
 *                 type: object
 *                 description: İşlem maliyetleri
 *                 additionalProperties:
 *                   type: number
 *                 example:
 *                   "cutting": 2.5
 *                   "sewing": 8.0
 *                   "finishing": 3.0
 *               batch:
 *                 type: object
 *                 description: Batch maliyetleri (adet aralığına göre)
 *                 additionalProperties:
 *                   type: number
 *                 example:
 *                   "0-50": 25
 *                   "51-100": 20
 *                   "101-500": 15
 *     responses:
 *       200:
 *         description: Hesaplama başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 result:
 *                   type: object
 *                   description: Hesaplama sonuçları
 *                 calculations:
 *                   type: object
 *                   description: Detaylı hesaplama bilgileri
 *       400:
 *         description: Hatalı istek
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
 *                   example: "Geçersiz parametre"
 *       500:
 *         description: Sunucu hatası
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
 *                   example: "İç sunucu hatası"
 */
router.post('/', (req, res) => {
    try {
        const payload = req.body || {};
        const out = calculateFromInput(payload);
        res.json({ success: true, data: out });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success:false, error: err.message });
    }
});

export default router;
