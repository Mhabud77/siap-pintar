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
// CATAT PERILAKU (MENDUKUNG BANYAK MURID & BANYAK KATEGORI)
// ============================================
exports.catatPerilaku = async (req, res) => {
    try {
        const { murid_id, murid_ids, kategori, kategoris, deskripsi, tanggal, waktu } = req.body;
        const guru_id = req.user.id;

        // Normalisasi ke Array
        const listMuridIds = Array.isArray(murid_ids) 
            ? murid_ids 
            : (murid_id ? [murid_id] : []);
        
        const listKategoris = Array.isArray(kategoris) 
            ? kategoris 
            : (kategori ? [kategori] : []);

        // Validasi Input
        if (listMuridIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Pilih minimal 1 murid'
            });
        }

        if (listKategoris.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Pilih minimal 1 kategori perilaku'
            });
        }

        // Cek Validasi Kategori
        const KATEGORI_ALL = await getKategoriPerilaku();
        const validKategoriData = [];
        for (const katKey of listKategoris) {
            if (!KATEGORI_ALL[katKey]) {
                return res.status(400).json({
                    success: false,
                    message: `Kategori perilaku '${katKey}' tidak valid`
                });
            }
            validKategoriData.push({ key: katKey, ...KATEGORI_ALL[katKey] });
        }

        // Validasi & Fallback Tanggal
        const now = new Date();
        const serverDate = now.toISOString().split('T')[0];
        const serverTime = now.toTimeString().slice(0, 8);

        let tanggalFinal = tanggal || serverDate;

        const tanggalRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (tanggal && !tanggalRegex.test(tanggal)) {
            return res.status(400).json({
                success: false,
                message: 'Format tanggal tidak valid (harus YYYY-MM-DD)'
            });
        }

        const tanggalObj = new Date(tanggalFinal);
        const hariIni = new Date(serverDate);
        if (tanggalObj > hariIni) {
            return res.status(400).json({
                success: false,
                message: 'Tanggal tidak boleh di masa depan'
            });
        }

        const tujuhHariLalu = new Date();
        tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7);
        if (tanggalObj < tujuhHariLalu) {
            return res.status(400).json({
                success: false,
                message: 'Tanggal tidak boleh lebih dari 7 hari ke belakang'
            });
        }

        let waktuFinal = waktu || serverTime;
        const waktuRegex = /^\d{2}:\d{2}(:\d{2})?$/;
        if (waktu && !waktuRegex.test(waktu)) {
            return res.status(400).json({
                success: false,
                message: 'Format waktu tidak valid (harus HH:MM atau HH:MM:SS)'
            });
        }

        if (waktuFinal.length === 5) {
            waktuFinal = waktuFinal + ':00';
        }

        // Ambil Data Murid
        const [muridList] = await db.query(`
            SELECT m.*, u.nama_lengkap, u.id as user_id, k.nama_kelas
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.id IN (?)
        `, [listMuridIds]);

        if (muridList.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Murid tidak ditemukan'
            });
        }

        let totalTercatat = 0;
        const hasilMurid = [];

        // Loop Setiap Murid & Setiap Kategori
        for (const muridData of muridList) {
            let totalPoinPerubahanMurid = 0;

            for (const katData of validKategoriData) {
                const [result] = await db.query(`
                    INSERT INTO perilaku 
                    (murid_id, guru_id, jenis, kategori, deskripsi, poin, tanggal, waktu)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    muridData.id,
                    guru_id,
                    katData.jenis,
                    katData.key,
                    deskripsi || katData.label,
                    katData.poin,
                    tanggalFinal,
                    waktuFinal
                ]);

                // Update poin murid
                await db.query(`
                    UPDATE murid 
                    SET poin_bulan_ini = poin_bulan_ini + ?,
                        poin_tahun_ini = poin_tahun_ini + ?
                    WHERE id = ?
                `, [katData.poin, katData.poin, muridData.id]);

                totalPoinPerubahanMurid += katData.poin;

                // Log poin
                const [currentPoin] = await db.query(
                    'SELECT poin_bulan_ini FROM murid WHERE id = ?',
                    [muridData.id]
                );

                const poinBulanIni = currentPoin[0]?.poin_bulan_ini || 0;

                await db.query(`
                    INSERT INTO log_poin 
                    (murid_id, sumber, referensi_id, poin_perubahan, poin_sebelum, poin_sesudah, keterangan)
                    VALUES (?, 'perilaku', ?, ?, ?, ?, ?)
                `, [
                    muridData.id,
                    result.insertId,
                    katData.poin,
                    poinBulanIni - katData.poin,
                    poinBulanIni,
                    `${katData.label}: ${deskripsi || ''}`
                ]);

                totalTercatat++;
            }

            // Notifikasi WA Ke Orang Tua
            if (muridData.orangtua_id) {
                try {
                    const [orangtua] = await db.query(
                        'SELECT no_telepon FROM users WHERE id = ?',
                        [muridData.orangtua_id]
                    );

                    if (orangtua.length > 0 && orangtua[0].no_telepon) {
                        const labelsKat = validKategoriData.map(k => k.label).join(', ');
                        const emoji = totalPoinPerubahanMurid >= 0 ? '🌟' : '⚠️';
                        const pesan = `${emoji} *NOTIFIKASI PERILAKU*\n\n` +
                            `Ananda *${muridData.nama_lengkap}* (${muridData.nama_kelas})\n\n` +
                            `Kategori (${validKategoriData.length}): ${labelsKat}\n` +
                            `Deskripsi: ${deskripsi || '-'}\n` +
                            `Total Poin: ${totalPoinPerubahanMurid > 0 ? '+' : ''}${totalPoinPerubahanMurid}\n` +
                            `Tanggal: ${tanggalFinal} ${waktuFinal.slice(0, 5)}\n\n` +
                            `_SIAP PINTAR_`;

                        await kirimNotifikasiWA(orangtua[0].no_telepon, pesan);
                    }
                } catch (waError) {
                    console.error('WA error:', waError.message);
                }
            }

            hasilMurid.push({
                murid: muridData.nama_lengkap,
                kelas: muridData.nama_kelas,
                totalPoin: totalPoinPerubahanMurid
            });
        }

        res.status(201).json({
            success: true,
            message: `Berhasil mencatat ${validKategoriData.length} kategori perilaku untuk ${muridList.length} murid (${totalTercatat} entri disimpan).`,
            data: {
                totalMurid: muridList.length,
                totalKategori: validKategoriData.length,
                totalTercatat,
                murid: hasilMurid
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
        res.status(500).json({ success: false, message: error.message });
    }
};