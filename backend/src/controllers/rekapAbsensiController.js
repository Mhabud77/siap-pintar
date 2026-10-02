const db = require('../config/database');
const ExcelJS = require('exceljs');

// ============================================
// HELPER
// ============================================
function getNamaBulan(bulan) {
    const arr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return arr[bulan - 1] || '';
}

function getNamaHari(hari) {
    const arr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return arr[hari] || '';
}

// Helper untuk format objek Date lokal ke format YYYY-MM-DD tanpa terpengaruh UTC conversion
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getRangeTanggal(periode, bulan, tahun, tanggal, minggu, semester) {
    const now = new Date();
    const tahunNum = parseInt(tahun) || now.getFullYear();
    const bulanNum = parseInt(bulan) || (now.getMonth() + 1);

    if (periode === 'harian') {
        const tgl = tanggal || formatDateLocal(now);
        const parts = tgl.split('-').map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const label = `${getNamaHari(d.getDay())}, ${d.getDate()} ${getNamaBulan(d.getMonth() + 1)} ${d.getFullYear()}`;
        return { start: tgl, end: tgl, label };
    } 
    else if (periode === 'mingguan') {
        const mingguNum = parseInt(minggu) || 1;
        let startDate = new Date(tahunNum, bulanNum - 1, 1);
        while (startDate.getDay() !== 1) { // 1 = Senin
            startDate.setDate(startDate.getDate() + 1);
        }
        startDate.setDate(startDate.getDate() + (mingguNum - 1) * 7);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);

        const start = formatDateLocal(startDate);
        const end = formatDateLocal(endDate);
        const label = `Minggu ke-${mingguNum} (${startDate.getDate()} - ${endDate.getDate()} ${getNamaBulan(bulanNum)} ${tahunNum})`;
        return { start, end, label };
    }
    else if (periode === 'bulanan') {
        const startDate = new Date(tahunNum, bulanNum - 1, 1);
        const endDate = new Date(tahunNum, bulanNum, 0); // Hari terakhir bulan
        const start = formatDateLocal(startDate);
        const end = formatDateLocal(endDate);
        return { start, end, label: `${getNamaBulan(bulanNum)} ${tahunNum}` };
    }
    else if (periode === 'semester') {
        const semesterFinal = semester || 'gasal';
        if (semesterFinal === 'gasal') {
            const start = `${tahunNum}-07-01`;
            const end = `${tahunNum}-12-31`;
            return { start, end, label: `Semester Gasal ${tahunNum}/${tahunNum + 1}`, semester: 'gasal' };
        } else {
            const start = `${tahunNum}-01-01`;
            const end = `${tahunNum}-06-30`;
            return { start, end, label: `Semester Genap ${tahunNum - 1}/${tahunNum}`, semester: 'genap' };
        }
    }
    else {
        const start = `${tahunNum}-01-01`;
        const end = `${tahunNum}-12-31`;
        return { start, end, label: `Tahun ${tahunNum}` };
    }
}

// ============================================
// GET REKAP ABSENSI KELAS (DENGAN PAGINATION)
// ============================================
exports.getRekapAbsensiKelas = async (req, res) => {
    try {
        const { 
            kelas_id, bulan, tahun, periode = 'bulanan', jenis_kelamin, 
            tanggal, minggu, semester,
            limit = 32, offset = 0 
        } = req.query;

        const now = new Date();
        const bulanFinal = parseInt(bulan) || (now.getMonth() + 1);
        const tahunFinal = parseInt(tahun) || now.getFullYear();
        const { start, end, label, semester: semesterFinal } = getRangeTanggal(periode, bulanFinal, tahunFinal, tanggal, minggu, semester);

        const isSemuaKelas = !kelas_id || kelas_id === '' || kelas_id === 'all' || kelas_id === 'semua';

        let kelasData = { id: 'all', nama_kelas: 'Semua Kelas', tingkat: '-', wali_kelas_nama: '-' };

        if (!isSemuaKelas) {
            const [kelas] = await db.query(`
                SELECT k.id, k.nama_kelas, k.tingkat, wali.nama_lengkap AS wali_kelas_nama
                FROM kelas k
                LEFT JOIN users wali ON k.wali_kelas_id = wali.id
                WHERE k.id = ?
            `, [kelas_id]);

            if (kelas.length === 0) {
                return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
            }
            kelasData = kelas[0];
        }

        // BUILD QUERY
        let baseQuery = `
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE 1=1
        `;
        const baseParams = [];

        if (!isSemuaKelas) {
            baseQuery += ' AND m.kelas_id = ?';
            baseParams.push(kelas_id);
        }

        if (jenis_kelamin && ['L', 'P'].includes(jenis_kelamin)) {
            baseQuery += ' AND m.jenis_kelamin = ?';
            baseParams.push(jenis_kelamin);
        }

        // Hitung total murid
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total ${baseQuery}`,
            baseParams
        );
        const totalMurid = countResult[0].total;

        // Ambil data murid dengan pagination
        const limitNum = Math.max(1, parseInt(limit) || 32);
        const offsetNum = Math.max(0, parseInt(offset) || 0);

        const selectQuery = `
            SELECT 
                m.id, m.nis, m.jenis_kelamin,
                u.nama_lengkap, u.foto_profil,
                k.nama_kelas,
                (SELECT COUNT(*) FROM absensi 
                 WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'hadir') AS hadir_ontime,
                (SELECT COUNT(*) FROM absensi 
                 WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'terlambat') AS terlambat,
                (SELECT COUNT(*) FROM absensi 
                 WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'izin') AS izin,
                (SELECT COUNT(*) FROM absensi 
                 WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'sakit') AS sakit,
                (SELECT COUNT(*) FROM absensi 
                 WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'alpa') AS alpa
            ${baseQuery}
            ORDER BY k.tingkat, k.nama_kelas, u.nama_lengkap
            LIMIT ? OFFSET ?
        `;

        const selectParams = [
            start, end, start, end, start, end, start, end, start, end,
            ...baseParams,
            limitNum, offsetNum
        ];

        const [murid] = await db.query(selectQuery, selectParams);

        const muridFormatted = murid.map((m, index) => {
            const totalHadir = m.hadir_ontime + m.terlambat;
            const izinSakit = m.izin + m.sakit;
            const totalAbsen = totalHadir + izinSakit + m.alpa;

            return {
                no: offsetNum + index + 1,
                id: m.id,
                nis: m.nis,
                jenis_kelamin: m.jenis_kelamin,
                jenis_kelamin_label: m.jenis_kelamin === 'L' ? 'Laki-laki' : m.jenis_kelamin === 'P' ? 'Perempuan' : '-',
                nama_lengkap: m.nama_lengkap,
                foto_profil: m.foto_profil,
                nama_kelas: m.nama_kelas,
                hadir_ontime: m.hadir_ontime,
                terlambat: m.terlambat,
                hadir: totalHadir,
                izin: m.izin,
                sakit: m.sakit,
                izin_sakit: izinSakit,
                alpa: m.alpa,
                total_absen: totalAbsen,
                persen_hadir: totalAbsen > 0 ? Math.round((totalHadir / totalAbsen) * 100) : 0
            };
        });

        // STATISTIK (hitung dari SEMUA data)
        const [statQuery] = await db.query(`
            SELECT 
                m.jenis_kelamin,
                (SELECT COUNT(*) FROM absensi 
                 WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'hadir') AS hadir_ontime,
                (SELECT COUNT(*) FROM absensi 
                 WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'terlambat') AS terlambat,
                (SELECT COUNT(*) FROM absensi 
                 WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'izin') AS izin,
                (SELECT COUNT(*) FROM absensi 
                 WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'sakit') AS sakit,
                (SELECT COUNT(*) FROM absensi 
                 WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'alpa') AS alpa
            ${baseQuery}
        `, [start, end, start, end, start, end, start, end, start, end, ...baseParams]);

        const statistik = {
            total_murid: totalMurid,
            total_laki: statQuery.filter(m => m.jenis_kelamin === 'L').length,
            total_perempuan: statQuery.filter(m => m.jenis_kelamin === 'P').length,
            total_hadir: statQuery.reduce((s, m) => s + m.hadir_ontime + m.terlambat, 0),
            total_hadir_ontime: statQuery.reduce((s, m) => s + m.hadir_ontime, 0),
            total_terlambat: statQuery.reduce((s, m) => s + m.terlambat, 0),
            total_izin: statQuery.reduce((s, m) => s + m.izin, 0),
            total_sakit: statQuery.reduce((s, m) => s + m.sakit, 0),
            total_izin_sakit: statQuery.reduce((s, m) => s + m.izin + m.sakit, 0),
            total_alpa: statQuery.reduce((s, m) => s + m.alpa, 0)
        };

        const totalKehadiran = statistik.total_hadir + statistik.total_izin_sakit + statistik.total_alpa;
        statistik.persen_hadir = totalKehadiran > 0
            ? Math.round((statistik.total_hadir / totalKehadiran) * 100)
            : 0;

        res.json({
            success: true,
            data: {
                kelas: kelasData,
                murid: muridFormatted,
                statistik,
                periode: {
                    start, end, label,
                    bulan: bulanFinal,
                    tahun: tahunFinal,
                    tanggal: tanggal || null,
                    minggu: minggu || null,
                    semester: semesterFinal || null
                },
                is_semua_kelas: isSemuaKelas,
                pagination: {
                    total: totalMurid,
                    limit: limitNum,
                    offset: offsetNum,
                    total_pages: Math.ceil(totalMurid / limitNum),
                    current_page: Math.floor(offsetNum / limitNum) + 1
                }
            }
        });
    } catch (error) {
        console.error('Get rekap error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET REKAP HARIAN (DENGAN PAGINATION)
// ============================================
exports.getRekapHarian = async (req, res) => {
    try {
        const { 
            kelas_id, tanggal, jenis_kelamin,
            limit = 32, offset = 0 
        } = req.query;

        const tgl = tanggal || formatDateLocal(new Date());
        const isSemuaKelas = !kelas_id || kelas_id === '' || kelas_id === 'all' || kelas_id === 'semua';

        let kelasData = { id: 'all', nama_kelas: 'Semua Kelas', tingkat: '-', wali_kelas_nama: '-' };

        if (!isSemuaKelas) {
            const [kelas] = await db.query(`
                SELECT k.id, k.nama_kelas, k.tingkat, wali.nama_lengkap AS wali_kelas_nama
                FROM kelas k
                LEFT JOIN users wali ON k.wali_kelas_id = wali.id
                WHERE k.id = ?
            `, [kelas_id]);

            if (kelas.length === 0) {
                return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
            }
            kelasData = kelas[0];
        }

        let baseQuery = `
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            LEFT JOIN absensi a ON a.murid_id = m.id AND a.tanggal = ?
            WHERE 1=1
        `;
        const baseParams = [tgl];

        if (!isSemuaKelas) {
            baseQuery += ' AND m.kelas_id = ?';
            baseParams.push(kelas_id);
        }

        if (jenis_kelamin && ['L', 'P'].includes(jenis_kelamin)) {
            baseQuery += ' AND m.jenis_kelamin = ?';
            baseParams.push(jenis_kelamin);
        }

        // Total murid
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total ${baseQuery}`,
            baseParams
        );
        const totalMurid = countResult[0].total;

        const limitNum = Math.max(1, parseInt(limit) || 32);
        const offsetNum = Math.max(0, parseInt(offset) || 0);

        const [murid] = await db.query(`
            SELECT 
                m.id, m.nis, m.jenis_kelamin,
                u.nama_lengkap, u.foto_profil,
                k.nama_kelas,
                a.jam_datang, a.status, a.jam_pulang, a.status_pulang, a.poin_didapat, a.keterangan
            ${baseQuery}
            ORDER BY k.tingkat, k.nama_kelas, u.nama_lengkap
            LIMIT ? OFFSET ?
        `, [...baseParams, limitNum, offsetNum]);

        const muridFormatted = murid.map((m, index) => {
            const isHadir = m.status === 'hadir' || m.status === 'terlambat';
            const isTerlambat = m.status === 'terlambat';
            const isIzin = m.status === 'izin';
            const isSakit = m.status === 'sakit';
            const isAlpa = m.status === 'alpa';

            return {
                no: offsetNum + index + 1,
                id: m.id,
                nis: m.nis,
                jenis_kelamin: m.jenis_kelamin,
                jenis_kelamin_label: m.jenis_kelamin === 'L' ? 'Laki-laki' : m.jenis_kelamin === 'P' ? 'Perempuan' : '-',
                nama_lengkap: m.nama_lengkap,
                foto_profil: m.foto_profil,
                nama_kelas: m.nama_kelas,
                jam_datang: m.jam_datang,
                status: m.status || 'belum_absen',
                status_label: m.status === 'hadir' ? 'Hadir' : m.status === 'terlambat' ? 'Terlambat' : m.status === 'izin' ? 'Izin' : m.status === 'sakit' ? 'Sakit' : m.status === 'alpa' ? 'Alpa' : 'Belum Absen',
                jam_pulang: m.jam_pulang || null,
                status_pulang: m.status_pulang || '-',
                poin_didapat: m.poin_didapat || 0,
                keterangan: m.keterangan,
                is_hadir: isHadir,
                is_terlambat: isTerlambat,
                is_izin: isIzin,
                is_sakit: isSakit,
                is_alpa: isAlpa,
                is_belum: !m.status
            };
        });

        // Statistik dari SEMUA data
        const [allData] = await db.query(`
            SELECT 
                m.id, a.status
            ${baseQuery}
        `, baseParams);

        const statistik = {
            total_murid: allData.length,
            total_hadir: allData.filter(m => m.status === 'hadir' || m.status === 'terlambat').length,
            hadir_ontime: allData.filter(m => m.status === 'hadir').length,
            terlambat: allData.filter(m => m.status === 'terlambat').length,
            izin: allData.filter(m => m.status === 'izin').length,
            sakit: allData.filter(m => m.status === 'sakit').length,
            izin_sakit: allData.filter(m => m.status === 'izin' || m.status === 'sakit').length,
            alpa: allData.filter(m => m.status === 'alpa').length,
            belum_absen: allData.filter(m => !m.status).length
        };

        statistik.persen_hadir = statistik.total_murid > 0
            ? Math.round((statistik.total_hadir / statistik.total_murid) * 100)
            : 0;

        const partsTgl = tgl.split('-').map(Number);
        const dateObj = new Date(partsTgl[0], partsTgl[1] - 1, partsTgl[2]);

        res.json({
            success: true,
            data: {
                kelas: kelasData,
                murid: muridFormatted,
                statistik,
                tanggal: tgl,
                tanggal_label: `${getNamaHari(dateObj.getDay())}, ${dateObj.getDate()} ${getNamaBulan(dateObj.getMonth() + 1)} ${dateObj.getFullYear()}`,
                is_semua_kelas: isSemuaKelas,
                pagination: {
                    total: totalMurid,
                    limit: limitNum,
                    offset: offsetNum,
                    total_pages: Math.ceil(totalMurid / limitNum),
                    current_page: Math.floor(offsetNum / limitNum) + 1
                }
            }
        });
    } catch (error) {
        console.error('Get rekap harian error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// EXPORT EXCEL
// ============================================
exports.exportRekapExcel = async (req, res) => {
    try {
        const { kelas_id, bulan, tahun, periode = 'bulanan', jenis_kelamin, tanggal, minggu, semester } = req.query;

        const now = new Date();
        const bulanFinal = parseInt(bulan) || (now.getMonth() + 1);
        const tahunFinal = parseInt(tahun) || now.getFullYear();
        const { start, end, label } = getRangeTanggal(periode, bulanFinal, tahunFinal, tanggal, minggu, semester);

        const isSemuaKelas = !kelas_id || kelas_id === '' || kelas_id === 'all' || kelas_id === 'semua';

        let kelasData = { id: 'all', nama_kelas: 'Semua Kelas', wali_kelas_nama: '-' };

        if (!isSemuaKelas) {
            const [kelas] = await db.query(`
                SELECT k.id, k.nama_kelas, wali.nama_lengkap AS wali_kelas_nama
                FROM kelas k LEFT JOIN users wali ON k.wali_kelas_id = wali.id
                WHERE k.id = ?
            `, [kelas_id]);

            if (kelas.length === 0) return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
            kelasData = kelas[0];
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Rekap`);

        if (periode === 'harian') {
            const tgl = start;
            let query = `
                SELECT 
                    m.id, m.nis, m.jenis_kelamin, u.nama_lengkap, k.nama_kelas,
                    a.jam_datang, a.status, a.jam_pulang, a.status_pulang, a.poin_didapat, a.keterangan
                FROM murid m
                JOIN users u ON m.user_id = u.id
                JOIN kelas k ON m.kelas_id = k.id
                LEFT JOIN absensi a ON a.murid_id = m.id AND a.tanggal = ?
                WHERE 1=1
            `;
            const params = [tgl];

            if (!isSemuaKelas) {
                query += ' AND m.kelas_id = ?';
                params.push(kelas_id);
            }
            if (jenis_kelamin && ['L', 'P'].includes(jenis_kelamin)) {
                query += ' AND m.jenis_kelamin = ?';
                params.push(jenis_kelamin);
            }
            query += ' ORDER BY k.tingkat, k.nama_kelas, u.nama_lengkap';

            const [murid] = await db.query(query, params);

            worksheet.mergeCells('A1:K1');
            worksheet.getCell('A1').value = `REKAP ABSENSI HARIAN - ${kelasData.nama_kelas.toUpperCase()}`;
            worksheet.getCell('A1').font = { size: 16, bold: true };
            worksheet.getCell('A1').alignment = { horizontal: 'center' };

            worksheet.mergeCells('A2:K2');
            worksheet.getCell('A2').value = `Tanggal: ${label}`;
            worksheet.getCell('A2').font = { size: 12 };
            worksheet.getCell('A2').alignment = { horizontal: 'center' };

            worksheet.mergeCells('A3:K3');
            worksheet.getCell('A3').value = `Wali Kelas: ${kelasData.wali_kelas_nama || '-'}`;
            worksheet.getCell('A3').font = { size: 11, italic: true };
            worksheet.getCell('A3').alignment = { horizontal: 'center' };

            const headerRow = worksheet.getRow(5);
            headerRow.values = ['No', 'NIS', 'Nama', 'Kelas', 'JK', 'Jam Datang', 'Status Datang', 'Jam Pulang', 'Status Pulang', 'Poin', 'Keterangan'];
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            headerRow.height = 35;

            worksheet.columns = [
                { width: 5 }, { width: 12 }, { width: 30 }, { width: 10 }, { width: 6 },
                { width: 12 }, { width: 15 }, { width: 12 }, { width: 15 }, { width: 8 }, { width: 25 }
            ];

            murid.forEach((m, index) => {
                const statusLabel = m.status === 'hadir' ? 'Hadir' : m.status === 'terlambat' ? 'Terlambat' : m.status === 'izin' ? 'Izin' : m.status === 'sakit' ? 'Sakit' : m.status === 'alpa' ? 'Alpa' : 'Belum Absen';
                const row = worksheet.addRow([
                    index + 1,
                    m.nis,
                    m.nama_lengkap,
                    m.nama_kelas,
                    m.jenis_kelamin === 'L' ? 'L' : m.jenis_kelamin === 'P' ? 'P' : '-',
                    m.jam_datang ? m.jam_datang.slice(0, 5) : '-',
                    statusLabel,
                    m.jam_pulang ? m.jam_pulang.slice(0, 5) : '-',
                    m.status_pulang || '-',
                    m.poin_didapat || 0,
                    m.keterangan || '-'
                ]);
                if (index % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            });
        } else {
            let query = `
                SELECT 
                    m.id, m.nis, m.jenis_kelamin, u.nama_lengkap,
                    k.nama_kelas,
                    (SELECT COUNT(*) FROM absensi WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'hadir') AS hadir_ontime,
                    (SELECT COUNT(*) FROM absensi WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'terlambat') AS terlambat,
                    (SELECT COUNT(*) FROM absensi WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'izin') AS izin,
                    (SELECT COUNT(*) FROM absensi WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'sakit') AS sakit,
                    (SELECT COUNT(*) FROM absensi WHERE murid_id = m.id AND tanggal BETWEEN ? AND ? AND status = 'alpa') AS alpa
                FROM murid m
                JOIN users u ON m.user_id = u.id
                JOIN kelas k ON m.kelas_id = k.id
                WHERE 1=1
            `;
            const params = [start, end, start, end, start, end, start, end, start, end];

            if (!isSemuaKelas) {
                query += ' AND m.kelas_id = ?';
                params.push(kelas_id);
            }
            if (jenis_kelamin && ['L', 'P'].includes(jenis_kelamin)) {
                query += ' AND m.jenis_kelamin = ?';
                params.push(jenis_kelamin);
            }
            query += ' ORDER BY k.tingkat, k.nama_kelas, u.nama_lengkap';

            const [murid] = await db.query(query, params);

            const muridFormatted = murid.map((m, index) => {
                const totalHadir = m.hadir_ontime + m.terlambat;
                const izinSakit = m.izin + m.sakit;
                const totalAbsen = totalHadir + izinSakit + m.alpa;
                return {
                    no: index + 1,
                    nis: m.nis,
                    nama: m.nama_lengkap,
                    kelas: m.nama_kelas,
                    jenis_kelamin: m.jenis_kelamin === 'L' ? 'L' : m.jenis_kelamin === 'P' ? 'P' : '-',
                    hadir_ontime: m.hadir_ontime,
                    terlambat: m.terlambat,
                    hadir_total: totalHadir,
                    izin: m.izin,
                    sakit: m.sakit,
                    izin_sakit: izinSakit,
                    alpa: m.alpa,
                    total_absen: totalAbsen,
                    persen_hadir: totalAbsen > 0 ? Math.round((totalHadir / totalAbsen) * 100) : 0
                };
            });

            worksheet.mergeCells('A1:L1');
            worksheet.getCell('A1').value = `REKAP ABSENSI ${kelasData.nama_kelas.toUpperCase()}`;
            worksheet.getCell('A1').font = { size: 16, bold: true };
            worksheet.getCell('A1').alignment = { horizontal: 'center' };

            worksheet.mergeCells('A2:L2');
            worksheet.getCell('A2').value = `Periode: ${label}`;
            worksheet.getCell('A2').font = { size: 12 };
            worksheet.getCell('A2').alignment = { horizontal: 'center' };

            worksheet.mergeCells('A3:L3');
            worksheet.getCell('A3').value = `Wali Kelas: ${kelasData.wali_kelas_nama || '-'}`;
            worksheet.getCell('A3').font = { size: 11, italic: true };
            worksheet.getCell('A3').alignment = { horizontal: 'center' };

            const headerRow = worksheet.getRow(5);
            headerRow.values = ['No', 'NIS', 'Nama', 'Kelas', 'JK', 'Hadir', 'Terlambat', 'Total Hadir', 'Izin', 'Sakit', 'Alpa', '% Hadir'];
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            headerRow.height = 35;

            worksheet.columns = [
                { width: 5 }, { width: 12 }, { width: 30 }, { width: 10 }, { width: 6 },
                { width: 8 }, { width: 12 }, { width: 12 }, { width: 8 }, { width: 8 },
                { width: 8 }, { width: 10 }
            ];

            muridFormatted.forEach((m, index) => {
                const row = worksheet.addRow([
                    m.no, m.nis, m.nama, m.kelas, m.jenis_kelamin,
                    m.hadir_ontime, m.terlambat, m.hadir_total,
                    m.izin, m.sakit, m.alpa,
                    `${m.persen_hadir}%`
                ]);
                if (index % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            });
        }

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber >= 5) {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' }, left: { style: 'thin' },
                        bottom: { style: 'thin' }, right: { style: 'thin' }
                    };
                });
            }
        });

        const filename = `rekap-absensi-${kelasData.nama_kelas.replace(/\s/g, '-')}-${label.replace(/[^a-z0-9]/gi, '-')}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export rekap error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};