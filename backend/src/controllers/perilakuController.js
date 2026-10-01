const db = require('../config/database');
const { kirimNotifikasiWA } = require('../services/whatsappService');

// ============================================
// HELPER: Ambil konfigurasi poin perilaku dari DB
// ============================================
async function getKategoriPerilaku() {
    const [rows] = await db.query(`
        SELECT nama_konfigurasi, nilai, kategori, keterangan
        FROM konfigurasi_poin 
        WHERE kategori LIKE 'perilaku%'
        ORDER BY kategori, nama_konfigurasi
    `);

    const result = {};

    rows.forEach(r => {
        // Mapping nama_konfigurasi → key
        const key = r.nama_konfigurasi.replace('poin_', '');
        const jenis = r.kategori === 'perilaku_positif' ? 'positif' : 'negatif';
        
        result[key] = {
            jenis,
            poin: r.nilai,
            label: r.keterangan || key
        };
    });

    return result;
}

// ============================================
// CATAT PERILAKU
// ============================================
exports.catatPerilaku = async (req, res) => {
    try {
        const { murid_id, kategori, deskripsi, tanggal, waktu } = req.body;
        const guru_id = req.user.id;

        // Validasi input
        if (!murid_id || !kategori) {
            return res.status(400).json({
                success: false,
                message: 'Murid dan kategori harus diisi'
            });
        }

        // Cek kategori valid
        const KATEGORI = await getKategoriPerilaku();
        const kategoriData = KATEGORI[kategori];
        if (!kategoriData) {
            return res.status(400).json({
                success: false,
                message: 'Kategori perilaku tidak valid'
            });
        }

        // ============================================
        // VALIDASI & FALLBACK TANGGAL & WAKTU
        // ============================================
        const now = new Date();
        const serverDate = now.toISOString().split('T')[0];
        const serverTime = now.toTimeString().slice(0, 8);

        let tanggalFinal = tanggal || serverDate;

        // Validasi format tanggal
        const tanggalRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (tanggal && !tanggalRegex.test(tanggal)) {
            return res.status(400).json({
                success: false,
                message: 'Format tanggal tidak valid (harus YYYY-MM-DD)'
            });
        }

        // Validasi tanggal tidak masa depan
        const tanggalObj = new Date(tanggalFinal);
        const hariIni = new Date(serverDate);
        if (tanggalObj > hariIni) {
            return res.status(400).json({
                success: false,
                message: 'Tanggal tidak boleh di masa depan'
            });
        }

        // Validasi tanggal tidak lebih dari 7 hari ke belakang
        const tujuhHariLalu = new Date();
        tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7);
        if (tanggalObj < tujuhHariLalu) {
            return res.status(400).json({
                success: false,
                message: 'Tanggal tidak boleh lebih dari 7 hari ke belakang'
            });
        }

        let waktuFinal = waktu || serverTime;

        // Validasi format waktu
        const waktuRegex = /^\d{2}:\d{2}(:\d{2})?$/;
        if (waktu && !waktuRegex.test(waktu)) {
            return res.status(400).json({
                success: false,
                message: 'Format waktu tidak valid (harus HH:MM atau HH:MM:SS)'
            });
        }

        // Normalisasi waktu ke HH:MM:SS
        if (waktuFinal.length === 5) {
            waktuFinal = waktuFinal + ':00';
        }

        // ============================================
        // CEK MURID
        // ============================================
        const [murid] = await db.query(`
            SELECT m.*, u.nama_lengkap, u.id as user_id, k.nama_kelas
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.id = ?
        `, [murid_id]);

        if (murid.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Murid tidak ditemukan'
            });
        }

        const muridData = murid[0];

        // ============================================
        // INSERT PERILAKU
        // ============================================
        const [result] = await db.query(`
            INSERT INTO perilaku 
            (murid_id, guru_id, jenis, kategori, deskripsi, poin, tanggal, waktu)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            murid_id,
            guru_id,
            kategoriData.jenis,
            kategori,
            deskripsi || kategoriData.label,
            kategoriData.poin,
            tanggalFinal,
            waktuFinal
        ]);

        // Update poin murid
        await db.query(`
            UPDATE murid 
            SET poin_bulan_ini = poin_bulan_ini + ?,
                poin_tahun_ini = poin_tahun_ini + ?
            WHERE id = ?
        `, [kategoriData.poin, kategoriData.poin, murid_id]);

        // Log poin
        const [currentPoin] = await db.query(
            'SELECT poin_bulan_ini FROM murid WHERE id = ?',
            [murid_id]
        );

        await db.query(`
            INSERT INTO log_poin 
            (murid_id, sumber, referensi_id, poin_perubahan, poin_sebelum, poin_sesudah, keterangan)
            VALUES (?, 'perilaku', ?, ?, ?, ?, ?)
        `, [
            murid_id,
            result.insertId,
            kategoriData.poin,
            currentPoin[0].poin_bulan_ini - kategoriData.poin,
            currentPoin[0].poin_bulan_ini,
            `${kategoriData.label}: ${deskripsi || ''}`
        ]);

        // Kirim notifikasi WA (opsional)
        if (muridData.orangtua_id) {
            try {
                const [orangtua] = await db.query(
                    'SELECT no_telepon FROM users WHERE id = ?',
                    [muridData.orangtua_id]
                );

                if (orangtua.length > 0 && orangtua[0].no_telepon) {
                    const emoji = kategoriData.jenis === 'positif' ? '🌟' : '⚠️';
                    const pesan = `${emoji} *NOTIFIKASI PERILAKU*\n\n` +
                        `Ananda *${muridData.nama_lengkap}* (${muridData.nama_kelas})\n\n` +
                        `Jenis: ${kategoriData.jenis === 'positif' ? 'POSITIF' : 'NEGATIF'}\n` +
                        `Kategori: ${kategoriData.label}\n` +
                        `Deskripsi: ${deskripsi || '-'}\n` +
                        `Poin: ${kategoriData.poin > 0 ? '+' : ''}${kategoriData.poin}\n` +
                        `Tanggal: ${tanggalFinal} ${waktuFinal.slice(0, 5)}\n\n` +
                        `_SIAP PINTAR_`;

                    await kirimNotifikasiWA(orangtua[0].no_telepon, pesan);
                }
            } catch (waError) {
                console.error('WA error:', waError.message);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Perilaku berhasil dicatat',
            data: {
                id: result.insertId,
                murid: muridData.nama_lengkap,
                kelas: muridData.nama_kelas,
                jenis: kategoriData.jenis,
                kategori: kategoriData.label,
                poin: kategoriData.poin,
                tanggal: tanggalFinal,
                waktu: waktuFinal
            }
        });

    } catch (error) {
        console.error('Catat perilaku error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET PERILAKU MURID
// ============================================
exports.getPerilakuMurid = async (req, res) => {
    try {
        const { murid_id } = req.params;
        const { bulan, tahun, jenis } = req.query;

        let query = `
            SELECT p.*, u.nama_lengkap as guru_nama
            FROM perilaku p
            JOIN users u ON p.guru_id = u.id
            WHERE p.murid_id = ?
        `;
        const params = [murid_id];

        if (bulan && tahun) {
            query += ' AND MONTH(p.tanggal) = ? AND YEAR(p.tanggal) = ?';
            params.push(bulan, tahun);
        }

        if (jenis) {
            query += ' AND p.jenis = ?';
            params.push(jenis);
        }

        query += ' ORDER BY p.tanggal DESC, p.created_at DESC';

        const [perilaku] = await db.query(query, params);

        res.json({
            success: true,
            data: perilaku
        });

    } catch (error) {
        console.error('Get perilaku error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ============================================
// GET KATEGORI PERILAKU
// ============================================
exports.getKategoriPerilaku = async (req, res) => {
    try {
        const KATEGORI = await getKategoriPerilaku();
        
        const kategori = Object.entries(KATEGORI).map(([key, value]) => ({
            id: key,
            ...value
        }));

        res.json({
            success: true,
            data: {
                positif: kategori.filter(k => k.jenis === 'positif'),
                negatif: kategori.filter(k => k.jenis === 'negatif')
            }
        });
    } catch (error) {
        // ...
    }
};