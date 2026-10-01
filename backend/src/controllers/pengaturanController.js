const db = require('../config/database');

// ============================================
// GET SEMUA PENGATURAN ABSENSI
// ============================================
exports.getPengaturanAbsensi = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM pengaturan_absensi ORDER BY id');

        const pengaturan = {};
        rows.forEach(r => {
            pengaturan[r.nama_pengaturan] = r.nilai;
        });

        res.json({ success: true, data: pengaturan });
    } catch (error) {
        console.error('Get pengaturan error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// UPDATE PENGATURAN ABSENSI (BULK)
// ============================================
exports.updatePengaturanAbsensi = async (req, res) => {
    try {
        const { pengaturan } = req.body;

        if (!pengaturan || typeof pengaturan !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Data pengaturan tidak valid'
            });
        }

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            for (const [nama, nilai] of Object.entries(pengaturan)) {
                await connection.query(
                    'UPDATE pengaturan_absensi SET nilai = ? WHERE nama_pengaturan = ?',
                    [nilai, nama]
                );
            }
            await connection.commit();
            res.json({ success: true, message: 'Pengaturan berhasil disimpan' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Update pengaturan error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// HELPER: Ambil nilai pengaturan
// ============================================
exports.getNilaiPengaturan = async (nama) => {
    const [rows] = await db.query(
        'SELECT nilai FROM pengaturan_absensi WHERE nama_pengaturan = ?',
        [nama]
    );
    return rows.length > 0 ? rows[0].nilai : null;
};