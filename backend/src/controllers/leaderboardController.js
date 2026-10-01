const db = require('../config/database');

// ============================================
// HELPER: Nama Bulan Indonesia
// ============================================
function getNamaBulan(bulan) {
    const arr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return arr[parseInt(bulan) - 1] || '';
}

// ============================================
// HELPER: Hitung Range Tanggal Berdasarkan Mode
// ============================================
function getRangeTanggal(mode, bulan, tahun, semester) {
    const now = new Date();
    const tahunNum = parseInt(tahun) || now.getFullYear();
    const bulanNum = parseInt(bulan) || (now.getMonth() + 1);

    if (mode === 'harian') {
        const start = new Date().toISOString().split('T')[0];
        const label = `${now.getDate()} ${getNamaBulan(now.getMonth() + 1)} ${now.getFullYear()}`;
        return { start, end: start, label, mode };
    }
    else if (mode === 'mingguan') {
        // 7 hari terakhir
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];
        const label = `${startDate.getDate()} ${getNamaBulan(startDate.getMonth() + 1)} - ${endDate.getDate()} ${getNamaBulan(endDate.getMonth() + 1)} ${endDate.getFullYear()}`;
        return { start, end, label, mode };
    }
    else if (mode === 'bulanan') {
        const start = `${tahunNum}-${String(bulanNum).padStart(2, '0')}-01`;
        const end = new Date(tahunNum, bulanNum, 0).toISOString().split('T')[0];
        return { start, end, label: `Bulan ${getNamaBulan(bulanNum)} ${tahunNum}`, mode };
    }
    else if (mode === 'semester') {
        const semesterFinal = semester || 'gasal';
        if (semesterFinal === 'gasal') {
            const start = `${tahunNum}-07-01`;
            const end = `${tahunNum}-12-31`;
            return { start, end, label: `Semester Gasal ${tahunNum}/${tahunNum + 1}`, mode, semester: 'gasal' };
        } else {
            const start = `${tahunNum}-01-01`;
            const end = `${tahunNum}-06-30`;
            return { start, end, label: `Semester Genap ${tahunNum - 1}/${tahunNum}`, mode, semester: 'genap' };
        }
    }
    else if (mode === 'tahunan') {
        const start = `${tahunNum}-01-01`;
        const end = `${tahunNum}-12-31`;
        return { start, end, label: `Tahun ${tahunNum}`, mode };
    }

    return { start: '', end: '', label: '', mode };
}

// ============================================
// GET LEADERBOARD (MULTI MODE)
// ============================================
exports.getLeaderboard = async (req, res) => {
    try {
        const { 
            kelas_id, 
            from = 1, 
            to = 50, 
            mode = 'bulanan',
            bulan, 
            tahun, 
            semester 
        } = req.query;

        const now = new Date();
        const bulanFinal = parseInt(bulan) || (now.getMonth() + 1);
        const tahunFinal = parseInt(tahun) || now.getFullYear();

        const fromRank = parseInt(from);
        const toRank = parseInt(to);
        const offset = fromRank - 1;
        const limit = toRank - fromRank + 1;

        const { start, end, label, semester: semesterFinal } = getRangeTanggal(mode, bulanFinal, tahunFinal, semester);

        // ============================================
        // QUERY BERDASARKAN MODE
        // ============================================
        let query = '';
        let params = [];

        if (mode === 'harian' || mode === 'mingguan' || mode === 'bulanan' || mode === 'semester' || mode === 'tahunan') {
            // Semua mode pakai log_poin dengan filter tanggal
            query = `
                SELECT 
                    m.id,
                    u.nama_lengkap,
                    u.foto_profil,
                    k.nama_kelas,
                    COALESCE(SUM(lp.poin_perubahan), 0) AS poin_total,
                    (SELECT COUNT(*) FROM perilaku p WHERE p.murid_id = m.id AND p.jenis = 'positif') as total_positif,
                    (SELECT COUNT(*) FROM perilaku p WHERE p.murid_id = m.id AND p.jenis = 'negatif') as total_negatif
                FROM murid m
                JOIN users u ON m.user_id = u.id
                JOIN kelas k ON m.kelas_id = k.id
                LEFT JOIN log_poin lp ON lp.murid_id = m.id 
                    AND DATE(lp.created_at) BETWEEN ? AND ?
            `;
            params = [start, end];
        }

        if (kelas_id) {
            query += ' WHERE m.kelas_id = ?';
            params.push(kelas_id);
        }

        query += `
            GROUP BY m.id, u.nama_lengkap, u.foto_profil, k.nama_kelas
            ORDER BY poin_total DESC, m.id ASC
            LIMIT ? OFFSET ?
        `;
        params.push(limit, offset);

        const [leaderboard] = await db.query(query, params);

        // Format ranking
        const rankedData = leaderboard.map((item, index) => ({
            ...item,
            poin_bulan_ini: item.poin_total, // Untuk kompatibilitas frontend
            poin_tahun_ini: item.poin_total,
            rank: offset + index + 1,
            is_podium: (offset + index + 1) <= 3
        }));

        // Total murid untuk pagination
        let countQuery = 'SELECT COUNT(*) as total FROM murid m';
        const countParams = [];
        if (kelas_id) {
            countQuery += ' WHERE m.kelas_id = ?';
            countParams.push(kelas_id);
        }
        const [countResult] = await db.query(countQuery, countParams);

        res.json({
            success: true,
            data: rankedData,
            info: {
                total: countResult[0].total,
                from: fromRank,
                to: toRank,
                mode,
                label,
                periode: { start, end, bulan: bulanFinal, tahun: tahunFinal, semester: semesterFinal || null }
            }
        });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET TOP 3 (UNTUK PODIUM)
// ============================================
exports.getTop3 = async (req, res) => {
    try {
        const { 
            kelas_id, 
            mode = 'bulanan',
            bulan, 
            tahun, 
            semester 
        } = req.query;

        const now = new Date();
        const bulanFinal = parseInt(bulan) || (now.getMonth() + 1);
        const tahunFinal = parseInt(tahun) || now.getFullYear();

        const { start, end, label, semester: semesterFinal } = getRangeTanggal(mode, bulanFinal, tahunFinal, semester);

        let query = `
            SELECT 
                m.id,
                u.nama_lengkap,
                u.foto_profil,
                k.nama_kelas,
                COALESCE(SUM(lp.poin_perubahan), 0) AS poin_total
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            LEFT JOIN log_poin lp ON lp.murid_id = m.id 
                AND DATE(lp.created_at) BETWEEN ? AND ?
        `;
        const params = [start, end];

        if (kelas_id) {
            query += ' WHERE m.kelas_id = ?';
            params.push(kelas_id);
        }

        query += `
            GROUP BY m.id, u.nama_lengkap, u.foto_profil, k.nama_kelas
            ORDER BY poin_total DESC, m.id ASC
            LIMIT 3
        `;

        const [top3] = await db.query(query, params);

        const ranked = top3.map((item, i) => ({
            ...item,
            poin_bulan_ini: item.poin_total,
            rank: i + 1
        }));

        res.json({
            success: true,
            data: ranked,
            info: {
                mode,
                label,
                periode: { start, end, bulan: bulanFinal, tahun: tahunFinal, semester: semesterFinal || null }
            }
        });
    } catch (error) {
        console.error('Get top3 error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET DAFTAR PERIODE YANG ADA DATANYA
// ============================================
exports.getAvailablePeriods = async (req, res) => {
    try {
        const [periods] = await db.query(`
            SELECT DISTINCT 
                MONTH(created_at) as bulan,
                YEAR(created_at) as tahun
            FROM log_poin
            WHERE created_at IS NOT NULL
            ORDER BY tahun DESC, bulan DESC
        `);

        const formatted = periods.map(p => ({
            bulan: p.bulan,
            tahun: p.tahun,
            nama_bulan: getNamaBulan(p.bulan),
            label: `${getNamaBulan(p.bulan)} ${p.tahun}`
        }));

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Get periods error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET LEADERBOARD PER KELAS
// ============================================
exports.getLeaderboardKelas = async (req, res) => {
    try {
        const { mode = 'bulanan', bulan, tahun, semester } = req.query;

        const now = new Date();
        const bulanFinal = parseInt(bulan) || (now.getMonth() + 1);
        const tahunFinal = parseInt(tahun) || now.getFullYear();

        const { start, end } = getRangeTanggal(mode, bulanFinal, tahunFinal, semester);

        const [leaderboard] = await db.query(`
            SELECT 
                k.id,
                k.nama_kelas,
                k.tingkat,
                AVG(COALESCE(poin.total, 0)) as rata_rata_poin,
                COUNT(DISTINCT m.id) as jumlah_murid,
                SUM(COALESCE(poin.total, 0)) as total_poin
            FROM kelas k
            LEFT JOIN murid m ON k.id = m.kelas_id
            LEFT JOIN (
                SELECT murid_id, SUM(poin_perubahan) as total
                FROM log_poin
                WHERE DATE(created_at) BETWEEN ? AND ?
                GROUP BY murid_id
            ) poin ON poin.murid_id = m.id
            GROUP BY k.id, k.nama_kelas, k.tingkat
            ORDER BY rata_rata_poin DESC
        `, [start, end]);

        const rankedData = leaderboard.map((item, index) => ({
            ...item,
            rank: index + 1,
            rata_rata_poin: parseFloat(item.rata_rata_poin || 0).toFixed(1)
        }));

        res.json({ success: true, data: rankedData });
    } catch (error) {
        console.error('Get leaderboard kelas error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET STATISTIK MURID
// ============================================
exports.getStatistikMurid = async (req, res) => {
    try {
        const user_id = req.user.id;

        const [murid] = await db.query(`
            SELECT m.*, u.nama_lengkap, k.nama_kelas
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.user_id = ?
        `, [user_id]);

        if (murid.length === 0) {
            return res.status(404).json({ success: false, message: 'Murid tidak ditemukan' });
        }

        const muridData = murid[0];

        const [ranking] = await db.query(`
            SELECT COUNT(*) + 1 as rank
            FROM murid
            WHERE kelas_id = ? AND poin_bulan_ini > ?
        `, [muridData.kelas_id, muridData.poin_bulan_ini]);

        const [totalMurid] = await db.query(
            'SELECT COUNT(*) as total FROM murid WHERE kelas_id = ?',
            [muridData.kelas_id]
        );

        const [absensiStats] = await db.query(`
            SELECT 
                COUNT(*) as total_hari,
                SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END) as total_hadir,
                SUM(CASE WHEN status = 'terlambat' THEN 1 ELSE 0 END) as total_terlambat,
                SUM(CASE WHEN status = 'izin' THEN 1 ELSE 0 END) as total_izin,
                SUM(CASE WHEN status = 'sakit' THEN 1 ELSE 0 END) as total_sakit,
                SUM(CASE WHEN status = 'alpa' THEN 1 ELSE 0 END) as total_alpa
            FROM absensi
            WHERE murid_id = ? 
            AND MONTH(tanggal) = MONTH(CURDATE())
            AND YEAR(tanggal) = YEAR(CURDATE())
        `, [muridData.id]);

        const [perilakuStats] = await db.query(`
            SELECT 
                SUM(CASE WHEN jenis = 'positif' THEN 1 ELSE 0 END) as total_positif,
                SUM(CASE WHEN jenis = 'negatif' THEN 1 ELSE 0 END) as total_negatif
            FROM perilaku
            WHERE murid_id = ?
            AND MONTH(tanggal) = MONTH(CURDATE())
            AND YEAR(tanggal) = YEAR(CURDATE())
        `, [muridData.id]);

        res.json({
            success: true,
            data: {
                ...muridData,
                ranking: ranking[0].rank,
                total_murid_kelas: totalMurid[0].total,
                absensi: absensiStats[0],
                perilaku: perilakuStats[0]
            }
        });
    } catch (error) {
        console.error('Get statistik murid error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};