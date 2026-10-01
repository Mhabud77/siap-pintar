const db = require('../config/database');

// Get semua murid (dengan filter)
exports.getAllMurid = async (req, res) => {
    try {
        const { q, kelas_id, limit = 1000 } = req.query;

        let query = `
            SELECT 
                m.id,
                m.nis,
                m.kelas_id,
                m.poin_bulan_ini,
                u.nama_lengkap,
                k.nama_kelas
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE 1=1
        `;
        const params = [];

        // Filter by nama atau NIS
        if (q) {
            query += ' AND (u.nama_lengkap LIKE ? OR m.nis LIKE ?)';
            params.push(`%${q}%`, `%${q}%`);
        }

        // Filter by kelas
        if (kelas_id) {
            query += ' AND m.kelas_id = ?';
            params.push(kelas_id);
        }

        query += ' ORDER BY k.nama_kelas, u.nama_lengkap LIMIT ?';
        params.push(parseInt(limit));

        const [murid] = await db.query(query, params);

        res.json({
            success: true,
            data: murid
        });

    } catch (error) {
        console.error('Get all murid error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// Get murid by ID
exports.getMuridById = async (req, res) => {
    try {
        const { id } = req.params;

        const [murid] = await db.query(`
            SELECT 
                m.*,
                u.nama_lengkap,
                u.email,
                k.nama_kelas
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.id = ?
        `, [id]);

        if (murid.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Murid tidak ditemukan'
            });
        }

        res.json({
            success: true,
            data: murid[0]
        });

    } catch (error) {
        console.error('Get murid by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// Get semua kelas
exports.getAllKelas = async (req, res) => {
    try {
        const [kelas] = await db.query(`
            SELECT k.id, k.nama_kelas, k.tingkat, 
                   u.nama_lengkap AS wali_kelas
            FROM kelas k
            LEFT JOIN users u ON k.wali_kelas_id = u.id
            ORDER BY k.nama_kelas
        `);

        res.json({
            success: true,
            data: kelas
        });

    } catch (error) {
        console.error('Get all kelas error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

exports.getMuridById = async (req, res) => {
    try {
        const { id } = req.params;
        const [murid] = await db.query(`
            SELECT m.id, m.nis, m.poin_bulan_ini, u.nama_lengkap, k.nama_kelas
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.id = ?
        `, [id]);

        if (murid.length === 0) {
            return res.status(404).json({ success: false, message: 'Murid tidak ditemukan' });
        }

        res.json({ success: true, data: murid[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};