const db = require('../config/database');
const { kirimNotifikasiWA } = require('../services/whatsappService');

// ============================================
// HELPER: Ambil pengaturan dari database
// ============================================
async function getPengaturan() {
    try {
        const [rows] = await db.query('SELECT * FROM pengaturan_absensi');
        const pengaturan = {};
        rows.forEach(r => { pengaturan[r.nama_pengaturan] = r.nilai; });
        return pengaturan;
    } catch (err) {
        // Fallback kalau tabel belum ada
        return {
            jam_buka_absen_datang: '05:00',
            jam_tutup_absen_datang: '08:00',
            jam_buka_absen_pulang: '12:00',
            jam_tutup_absen_pulang: '17:00',
            jam_reset_harian: '00:00'
        };
    }
}

function toMenit(str) {
    if (!str) return 0;
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
}

async function isDalamJamAbsenDatang() {
    const pengaturan = await getPengaturan();
    const now = new Date();
    const menitSekarang = now.getHours() * 60 + now.getMinutes();
    const buka = toMenit(pengaturan.jam_buka_absen_datang);
    const tutup = toMenit(pengaturan.jam_tutup_absen_datang);
    return menitSekarang >= buka && menitSekarang <= tutup;
}

async function isDalamJamAbsenPulang() {
    const pengaturan = await getPengaturan();
    const now = new Date();
    const menitSekarang = now.getHours() * 60 + now.getMinutes();
    const buka = toMenit(pengaturan.jam_buka_absen_pulang);
    const tutup = toMenit(pengaturan.jam_tutup_absen_pulang);
    return menitSekarang >= buka && menitSekarang <= tutup;
}

function isDalamJamAbsen() {
    const now = new Date();
    const jam = now.getHours();
    return jam >= JAM_ABSEN.MULAI && jam < JAM_ABSEN.AKHIR;
}

function getTanggalHariIni() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

function getWaktuSekarang() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

const KONFIGURASI = {
    SEBELUM_630: { poin: 10, status: 'hadir' },
    ANTARA_630_645: { poin: 5, status: 'hadir' },
    ANTARA_645_700: { poin: 1, status: 'hadir' },
    SETELAH_700: { poin: -5, status: 'terlambat' }
};

// ============================================
// CEK STATUS JAM ABSEN
// ============================================
exports.cekStatusJam = async (req, res) => {
    try {
        const now = new Date();
        const jam = now.getHours();
        const menit = now.getMinutes();

        const dalamJam = isDalamJamAbsen();
        const tanggal = getTanggalHariIni();
        const waktu = getWaktuSekarang();

        let status_pesan = '';
        if (jam < JAM_ABSEN.MULAI) {
            const selisihJam = JAM_ABSEN.MULAI - jam - (menit > 0 ? 1 : 0);
            const selisihMenit = menit > 0 ? 60 - menit : 0;
            status_pesan = `Absensi belum dibuka. Dibuka pukul ${String(JAM_ABSEN.MULAI).padStart(2, '0')}:00 (dalam ${selisihJam} jam ${selisihMenit} menit)`;
        } else if (jam >= JAM_ABSEN.AKHIR) {
            status_pesan = `Absensi sudah ditutup. Dibuka besok pukul ${String(JAM_ABSEN.MULAI).padStart(2, '0')}:00`;
        } else {
            status_pesan = `Absensi dibuka sampai pukul ${String(JAM_ABSEN.AKHIR).padStart(2, '0')}:00`;
        }

        res.json({
            success: true,
            data: {
                jam_sekarang: waktu,
                tanggal: tanggal,
                dalam_jam_absen: dalamJam,
                jam_mulai: `${String(JAM_ABSEN.MULAI).padStart(2, '0')}:00`,
                jam_akhir: `${String(JAM_ABSEN.AKHIR).padStart(2, '0')}:00`,
                status_pesan
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// SCAN QR CODE
// ============================================
exports.scanQR = async (req, res) => {
    try {
        const { qr_code } = req.body;

        if (!qr_code) {
            return res.status(400).json({ success: false, message: 'QR Code harus disertakan' });
        }

        if (!(await isDalamJamAbsenDatang())) {
            const pengaturan = await getPengaturan();
            return res.status(400).json({
                success: false,
                message: `Absensi datang hanya bisa dilakukan pukul ${pengaturan.jam_buka_absen_datang} - ${pengaturan.jam_tutup_absen_datang}`,
                di_luar_jam: true
            });
        }

        const [murid] = await db.query(`
            SELECT m.*, u.nama_lengkap, k.nama_kelas
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.qr_code = ?
        `, [qr_code]);

        if (murid.length === 0) {
            return res.status(404).json({ success: false, message: 'QR Code tidak valid atau murid tidak ditemukan' });
        }

        const muridData = murid[0];
        const now = new Date();
        const jam = now.getHours();
        const menit = now.getMinutes();
        const waktuSekarang = getWaktuSekarang();
        const tanggal = getTanggalHariIni();

        const [existing] = await db.query(
            'SELECT id FROM absensi WHERE murid_id = ? AND tanggal = ?',
            [muridData.id, tanggal]
        );

        if (existing.length > 0) {
            const [absensiLama] = await db.query(
                'SELECT * FROM absensi WHERE murid_id = ? AND tanggal = ?',
                [muridData.id, tanggal]
            );

            return res.status(400).json({
                success: false,
                message: `${muridData.nama_lengkap} sudah absen hari ini`,
                sudah_absen: true,
                data: {
                    nama: muridData.nama_lengkap,
                    nis: muridData.nis,
                    kelas: muridData.nama_kelas,
                    foto_profil: muridData.foto_profil,
                    waktu_absen: absensiLama[0]?.jam_datang || '-',
                    status: absensiLama[0]?.status || '-',
                    poin: absensiLama[0]?.poin_didapat || 0,
                    keterangan: absensiLama[0]?.keterangan || 'Sudah absen sebelumnya'
                }
            });
        }

        let poin, status;
        const menitTotal = jam * 60 + menit;

        if (menitTotal < 6 * 60 + 30) {
            poin = KONFIGURASI.SEBELUM_630.poin;
            status = KONFIGURASI.SEBELUM_630.status;
        } else if (menitTotal < 6 * 60 + 45) {
            poin = KONFIGURASI.ANTARA_630_645.poin;
            status = KONFIGURASI.ANTARA_630_645.status;
        } else if (menitTotal < 7 * 60) {
            poin = KONFIGURASI.ANTARA_645_700.poin;
            status = KONFIGURASI.ANTARA_645_700.status;
        } else {
            poin = KONFIGURASI.SETELAH_700.poin;
            status = KONFIGURASI.SETELAH_700.status;
        }

        await db.query(`
            INSERT INTO absensi (murid_id, tanggal, jam_datang, status, poin_didapat)
            VALUES (?, ?, ?, ?, ?)
        `, [muridData.id, tanggal, waktuSekarang, status, poin]);

        await db.query(`
            UPDATE murid 
            SET poin_bulan_ini = poin_bulan_ini + ?,
                poin_tahun_ini = poin_tahun_ini + ?
            WHERE id = ?
        `, [poin, poin, muridData.id]);

        const [currentPoin] = await db.query(
            'SELECT poin_bulan_ini, poin_tahun_ini FROM murid WHERE id = ?',
            [muridData.id]
        );

        await db.query(`
            INSERT INTO log_poin 
            (murid_id, sumber, poin_perubahan, poin_sebelum, poin_sesudah, keterangan)
            VALUES (?, 'absensi', ?, ?, ?, ?)
        `, [
            muridData.id, poin,
            currentPoin[0].poin_bulan_ini - poin,
            currentPoin[0].poin_bulan_ini,
            `Absensi ${status} pukul ${waktuSekarang}`
        ]);

        let keteranganStatus = '';
        if (status === 'hadir') {
            if (menitTotal < 6 * 60 + 30) {
                keteranganStatus = 'Datang sangat tepat waktu (sebelum 06:30)';
            } else if (menitTotal < 6 * 60 + 45) {
                keteranganStatus = 'Datang tepat waktu (06:30 - 06:45)';
            } else {
                keteranganStatus = 'Datang hampir terlambat (06:45 - 07:00)';
            }
        } else if (status === 'terlambat') {
            keteranganStatus = 'Terlambat datang ke sekolah (setelah 07:00)';
        }

        if (muridData.orangtua_id) {
            try {
                const [orangtua] = await db.query(
                    'SELECT no_telepon FROM users WHERE id = ?',
                    [muridData.orangtua_id]
                );
                if (orangtua.length > 0 && orangtua[0].no_telepon) {
                    const pesan = `📋 *NOTIFIKASI ABSENSI*\n\n` +
                        `Ananda *${muridData.nama_lengkap}* (${muridData.nama_kelas})\n` +
                        `Telah hadir di sekolah\n\n` +
                        `🕐 Waktu: ${waktuSekarang}\n` +
                        `📊 Status: ${status.toUpperCase()}\n` +
                        `⭐ Poin: ${poin > 0 ? '+' : ''}${poin}`;
                    await kirimNotifikasiWA(orangtua[0].no_telepon, pesan);
                }
            } catch (waError) {
                console.error('WA error:', waError.message);
            }
        }

        res.json({
            success: true,
            message: 'Absensi berhasil',
            data: {
                murid_id: muridData.id,
                nama: muridData.nama_lengkap,
                nis: muridData.nis,
                kelas: muridData.nama_kelas,
                foto_profil: muridData.foto_profil,
                waktu: waktuSekarang,
                tanggal: tanggal,
                status: status,
                keterangan_status: keteranganStatus,
                poin: poin,
                poin_sebelum: currentPoin[0].poin_bulan_ini - poin,
                poin_sesudah: currentPoin[0].poin_bulan_ini,
                poin_bulan_ini: currentPoin[0].poin_bulan_ini,
                poin_tahun_ini: currentPoin[0].poin_tahun_ini,
                is_late: status === 'terlambat',
                is_ontime: status === 'hadir',
                sudah_absen: false
            }
        });

    } catch (error) {
        console.error('Scan QR error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// HELPER: Dapatkan tanggal lokal (WIB) dalam format YYYY-MM-DD
// ============================================
function getTanggalLokal() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ============================================
// GET ABSENSI HARI INI
// ============================================
exports.getAbsensiHariIni = async (req, res) => {
    try {
        const tanggal = getTanggalLokal();
        const [absensi] = await db.query(`
            SELECT a.*, u.nama_lengkap as nama, k.nama_kelas as kelas,
                   m.nis, m.jenis_kelamin
            FROM absensi a
            JOIN murid m ON a.murid_id = m.id
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE a.tanggal = ?
            ORDER BY a.jam_datang DESC
        `, [tanggal]);

        res.json({ success: true, data: absensi, tanggal });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET STATISTIK ABSENSI HARI INI
// % HADIR = (HADIR + TERLAMBAT) / TOTAL MURID × 100% (0-100%)
// ============================================
exports.getStatistikAbsensiHariIni = async (req, res) => {
    try {
        const tanggal = getTanggalLokal();

        // Total murid
        const [total] = await db.query('SELECT COUNT(*) as total FROM murid');

        // Statistik absensi hari ini
        const [stat] = await db.query(`
            SELECT 
                COUNT(*) as total_absen,
                SUM(CASE WHEN status = 'hadir' THEN 1 ELSE 0 END) as hadir,
                SUM(CASE WHEN status = 'terlambat' THEN 1 ELSE 0 END) as terlambat,
                SUM(CASE WHEN status = 'izin' THEN 1 ELSE 0 END) as izin,
                SUM(CASE WHEN status = 'sakit' THEN 1 ELSE 0 END) as sakit,
                SUM(CASE WHEN status = 'alpa' THEN 1 ELSE 0 END) as alpa
            FROM absensi
            WHERE tanggal = ?
        `, [tanggal]);

        const data = stat[0] || {};

        // ============================================
        // KONVERSI KE NUMBER (PENTING!)
        // ============================================
        const hadir = parseInt(data.hadir) || 0;
        const terlambat = parseInt(data.terlambat) || 0;
        const izin = parseInt(data.izin) || 0;
        const sakit = parseInt(data.sakit) || 0;
        const alpa = parseInt(data.alpa) || 0;
        const totalAbsen = parseInt(data.total_absen) || 0;
        const totalMurid = parseInt(total[0].total) || 0;

        // Hitung total_hadir = hadir + terlambat (sekarang number, bukan string)
        const totalHadir = hadir + terlambat;

        // Hitung persen hadir
        const persenHadir = totalMurid > 0
            ? Math.round((totalHadir / totalMurid) * 100)
            : 0;

        res.json({
            success: true,
            data: {
                total_murid: totalMurid,
                total_absen: totalAbsen,
                belum_absen: totalMurid - totalAbsen,
                hadir: hadir,
                terlambat: terlambat,
                izin: izin,
                sakit: sakit,
                alpa: alpa,
                total_hadir: totalHadir,
                persen_hadir: persenHadir
            }
        });
    } catch (error) {
        console.error('Get statistik absensi error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET MURID BELUM ABSEN HARI INI
// ============================================
exports.getMuridBelumAbsen = async (req, res) => {
    try {
        const { kelas_id, search } = req.query;
        const tanggal = getTanggalLokal();

        let query = `
            SELECT 
                m.id, m.nis,
                u.nama_lengkap,
                u.foto_profil,
                k.nama_kelas,
                k.id AS kelas_id,
                k.tingkat
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.id NOT IN (
                SELECT murid_id FROM absensi WHERE tanggal = ?
            )
        `;
        const params = [tanggal];

        if (kelas_id && kelas_id !== '' && kelas_id !== 'undefined') {
            query += ' AND m.kelas_id = ?';
            params.push(parseInt(kelas_id));
        }
        if (search && search.trim() !== '') {
            query += ' AND (u.nama_lengkap LIKE ? OR m.nis LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY k.tingkat, k.nama_kelas, u.nama_lengkap';

        const [murid] = await db.query(query, params);

        res.json({ success: true, data: murid, total: murid.length, tanggal });
    } catch (error) {
        console.error('Get murid belum absen error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// ABSENSI MANUAL
// ============================================
exports.absensiManual = async (req, res) => {
    try {
        const { murid_id, status, keterangan } = req.body;

        if (!murid_id || !status) {
            return res.status(400).json({ success: false, message: 'Murid dan status harus diisi' });
        }
        if (!['hadir', 'terlambat', 'izin', 'sakit', 'alpa'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status tidak valid' });
        }

        const statusBolehKapanSaja = ['izin', 'sakit', 'alpa'].includes(status);
        if (!statusBolehKapanSaja && !(await isDalamJamAbsenDatang())) {
            const pengaturan = await getPengaturan();
            return res.status(400).json({
                success: false,
                message: `Absensi hadir/terlambat hanya bisa pukul ${pengaturan.jam_buka_absen_datang} - ${pengaturan.jam_tutup_absen_datang}`,
                di_luar_jam: true
            });
        }

        const [murid] = await db.query(`
            SELECT m.*, u.nama_lengkap, k.nama_kelas
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.id = ?
        `, [murid_id]);

        if (murid.length === 0) {
            return res.status(404).json({ success: false, message: 'Murid tidak ditemukan' });
        }

        const muridData = murid[0];
        const waktuSekarang = getWaktuSekarang();
        const tanggal = getTanggalLokal();

        const [existing] = await db.query(
            'SELECT id FROM absensi WHERE murid_id = ? AND tanggal = ?',
            [muridData.id, tanggal]
        );
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: `${muridData.nama_lengkap} sudah absen hari ini` });
        }

        let poin = 0;
        if (status === 'hadir') poin = 5;
        else if (status === 'terlambat') poin = -5;
        else if (status === 'alpa') poin = -10;

        await db.query(`
            INSERT INTO absensi (murid_id, tanggal, jam_datang, status, poin_didapat, keterangan)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [muridData.id, tanggal, waktuSekarang, status, poin, keterangan || 'Absensi manual']);

        if (poin !== 0) {
            await db.query(`
                UPDATE murid 
                SET poin_bulan_ini = poin_bulan_ini + ?,
                    poin_tahun_ini = poin_tahun_ini + ?
                WHERE id = ?
            `, [poin, poin, muridData.id]);

            const [currentPoin] = await db.query(
                'SELECT poin_bulan_ini FROM murid WHERE id = ?',
                [muridData.id]
            );

            await db.query(`
                INSERT INTO log_poin 
                (murid_id, sumber, poin_perubahan, poin_sebelum, poin_sesudah, keterangan)
                VALUES (?, 'absensi', ?, ?, ?, ?)
            `, [
                muridData.id, poin,
                currentPoin[0].poin_bulan_ini - poin,
                currentPoin[0].poin_bulan_ini,
                `Absensi manual: ${status}`
            ]);
        }

        res.json({
            success: true,
            message: `Absensi manual ${muridData.nama_lengkap} (${status}) berhasil`,
            data: {
                nama: muridData.nama_lengkap,
                kelas: muridData.nama_kelas,
                status, poin, waktu: waktuSekarang
            }
        });
    } catch (error) {
        console.error('Absensi manual error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// ABSENSI MASSAL
// ============================================
exports.absensiMassal = async (req, res) => {
    try {
        const { murid_ids, status, keterangan } = req.body;

        if (!murid_ids || !Array.isArray(murid_ids) || murid_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Pilih minimal 1 murid' });
        }
        if (!status || !['hadir', 'terlambat', 'izin', 'sakit', 'alpa'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status tidak valid' });
        }

        const statusBolehKapanSaja = ['izin', 'sakit', 'alpa'].includes(status);
        if (!statusBolehKapanSaja && tipe === 'datang' && !(await isDalamJamAbsenDatang())) {
            const pengaturan = await getPengaturan();
            return res.status(400).json({
                success: false,
                message: `Absensi datang hanya bisa pukul ${pengaturan.jam_buka_absen_datang} - ${pengaturan.jam_tutup_absen_datang}`,
                di_luar_jam: true
            });
        }
        if (tipe === 'pulang' && !(await isDalamJamAbsenPulang())) {
            const pengaturan = await getPengaturan();
            return res.status(400).json({
                success: false,
                message: `Absensi pulang hanya bisa pukul ${pengaturan.jam_buka_absen_pulang} - ${pengaturan.jam_tutup_absen_pulang}`,
                di_luar_jam: true
            });
        }

        const waktuSekarang = getWaktuSekarang();
        const tanggal = getTanggalLokal();

        let poin = 0;
        if (status === 'hadir') poin = 5;
        else if (status === 'terlambat') poin = -5;
        else if (status === 'alpa') poin = -10;

        const hasil = { berhasil: [], gagal: [], dilewati: [] };

        for (const murid_id of murid_ids) {
            try {
                const [murid] = await db.query(`
                    SELECT m.*, u.nama_lengkap, k.nama_kelas
                    FROM murid m
                    JOIN users u ON m.user_id = u.id
                    JOIN kelas k ON m.kelas_id = k.id
                    WHERE m.id = ?
                `, [murid_id]);

                if (murid.length === 0) {
                    hasil.gagal.push({ murid_id, alasan: 'Murid tidak ditemukan' });
                    continue;
                }

                const muridData = murid[0];

                const [existing] = await db.query(
                    'SELECT id FROM absensi WHERE murid_id = ? AND tanggal = ?',
                    [muridData.id, tanggal]
                );
                if (existing.length > 0) {
                    hasil.dilewati.push({ murid_id: muridData.id, nama: muridData.nama_lengkap, alasan: 'Sudah absen hari ini' });
                    continue;
                }

                await db.query(`
                    INSERT INTO absensi (murid_id, tanggal, jam_datang, status, poin_didapat, keterangan)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [muridData.id, tanggal, waktuSekarang, status, poin, keterangan || 'Absensi massal']);

                if (poin !== 0) {
                    await db.query(`
                        UPDATE murid 
                        SET poin_bulan_ini = poin_bulan_ini + ?,
                            poin_tahun_ini = poin_tahun_ini + ?
                        WHERE id = ?
                    `, [poin, poin, muridData.id]);

                    const [currentPoin] = await db.query(
                        'SELECT poin_bulan_ini FROM murid WHERE id = ?',
                        [muridData.id]
                    );

                    await db.query(`
                        INSERT INTO log_poin 
                        (murid_id, sumber, poin_perubahan, poin_sebelum, poin_sesudah, keterangan)
                        VALUES (?, 'absensi', ?, ?, ?, ?)
                    `, [
                        muridData.id, poin,
                        currentPoin[0].poin_bulan_ini - poin,
                        currentPoin[0].poin_bulan_ini,
                        `Absensi massal: ${status}`
                    ]);
                }

                hasil.berhasil.push({ murid_id: muridData.id, nama: muridData.nama_lengkap, kelas: muridData.nama_kelas, poin });
            } catch (err) {
                hasil.gagal.push({ murid_id, alasan: err.message });
            }
        }

        res.json({
            success: true,
            message: `Absensi massal selesai: ${hasil.berhasil.length} berhasil, ${hasil.dilewati.length} dilewati, ${hasil.gagal.length} gagal`,
            data: hasil
        });
    } catch (error) {
        console.error('Absensi massal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET ABSENSI BY MURID
// ============================================
exports.getAbsensiByMurid = async (req, res) => {
    try {
        const { murid_id } = req.params;
        const { bulan, tahun } = req.query;

        let query = `
            SELECT a.*, k.nama_kelas
            FROM absensi a
            JOIN murid m ON a.murid_id = m.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE a.murid_id = ?
        `;
        const params = [murid_id];

        if (bulan && tahun) {
            query += ' AND MONTH(a.tanggal) = ? AND YEAR(a.tanggal) = ?';
            params.push(bulan, tahun);
        }
        query += ' ORDER BY a.tanggal DESC';

        const [absensi] = await db.query(query, params);
        res.json({ success: true, data: absensi });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET DETAIL KATEGORI ABSENSI
// ============================================
exports.getDetailKategoriAbsensi = async (req, res) => {
    try {
        const { kategori } = req.params;
        const { kelas_id } = req.query;
        const tanggal = getTanggalHariIni();

        let query = '';
        let params = [];

        if (kategori === 'total') {
            query = `
                SELECT m.id, m.nis, m.poin_bulan_ini, m.jenis_kelamin,
                       u.nama_lengkap, u.foto_profil, k.nama_kelas, k.id AS kelas_id
                FROM murid m
                JOIN users u ON m.user_id = u.id
                JOIN kelas k ON m.kelas_id = k.id
                WHERE 1=1
            `;
            if (kelas_id) { query += ' AND m.kelas_id = ?'; params.push(kelas_id); }
            query += ' ORDER BY k.tingkat, k.nama_kelas, u.nama_lengkap';
        }
        else if (kategori === 'sudah_absen') {
            query = `
                SELECT m.id, m.nis, u.nama_lengkap, u.foto_profil, k.nama_kelas, k.id AS kelas_id,
                       a.jam_datang, a.status, a.poin_didapat, a.keterangan
                FROM absensi a
                JOIN murid m ON a.murid_id = m.id
                JOIN users u ON m.user_id = u.id
                JOIN kelas k ON m.kelas_id = k.id
                WHERE a.tanggal = ?
            `;
            params.push(tanggal);
            if (kelas_id) { query += ' AND m.kelas_id = ?'; params.push(kelas_id); }
            query += ' ORDER BY k.tingkat, k.nama_kelas, a.jam_datang DESC';
        }
        else if (kategori === 'belum_absen') {
            query = `
                SELECT m.id, m.nis, m.poin_bulan_ini, m.jenis_kelamin,
                       u.nama_lengkap, u.foto_profil, k.nama_kelas, k.id AS kelas_id
                FROM murid m
                JOIN users u ON m.user_id = u.id
                JOIN kelas k ON m.kelas_id = k.id
                WHERE m.id NOT IN (SELECT murid_id FROM absensi WHERE tanggal = ?)
            `;
            params.push(tanggal);
            if (kelas_id) { query += ' AND m.kelas_id = ?'; params.push(kelas_id); }
            query += ' ORDER BY k.tingkat, k.nama_kelas, u.nama_lengkap';
        }
        else if (kategori === 'hadir') {
            query = `
                SELECT m.id, m.nis, u.nama_lengkap, u.foto_profil, k.nama_kelas, k.id AS kelas_id,
                       a.jam_datang, a.status, a.poin_didapat, a.keterangan
                FROM absensi a
                JOIN murid m ON a.murid_id = m.id
                JOIN users u ON m.user_id = u.id
                JOIN kelas k ON m.kelas_id = k.id
                WHERE a.tanggal = ? AND a.status = 'hadir'
            `;
            params.push(tanggal);
            if (kelas_id) { query += ' AND m.kelas_id = ?'; params.push(kelas_id); }
            query += ' ORDER BY k.tingkat, k.nama_kelas, a.jam_datang DESC';
        }
        else if (kategori === 'terlambat') {
            query = `
                SELECT m.id, m.nis, u.nama_lengkap, u.foto_profil, k.nama_kelas, k.id AS kelas_id,
                       a.jam_datang, a.status, a.poin_didapat, a.keterangan
                FROM absensi a
                JOIN murid m ON a.murid_id = m.id
                JOIN users u ON m.user_id = u.id
                JOIN kelas k ON m.kelas_id = k.id
                WHERE a.tanggal = ? AND a.status = 'terlambat'
            `;
            params.push(tanggal);
            if (kelas_id) { query += ' AND m.kelas_id = ?'; params.push(kelas_id); }
            query += ' ORDER BY k.tingkat, k.nama_kelas, a.jam_datang DESC';
        }
        else if (kategori === 'izin_sakit') {
            query = `
                SELECT m.id, m.nis, u.nama_lengkap, u.foto_profil, k.nama_kelas, k.id AS kelas_id,
                       a.jam_datang, a.status, a.poin_didapat, a.keterangan
                FROM absensi a
                JOIN murid m ON a.murid_id = m.id
                JOIN users u ON m.user_id = u.id
                JOIN kelas k ON m.kelas_id = k.id
                WHERE a.tanggal = ? AND a.status IN ('izin', 'sakit')
            `;
            params.push(tanggal);
            if (kelas_id) { query += ' AND m.kelas_id = ?'; params.push(kelas_id); }
            query += ' ORDER BY k.tingkat, k.nama_kelas, u.nama_lengkap';
        }
        else if (kategori === 'persen_hadir') {
            const [data] = await db.query(`
                SELECT 
                    k.id AS kelas_id,
                    k.nama_kelas,
                    k.tingkat,
                    COUNT(DISTINCT m.id) AS total_murid,
                    COUNT(DISTINCT CASE WHEN a.status IN ('hadir', 'terlambat') THEN a.murid_id END) AS total_hadir,
                    LEAST(100, ROUND(
                        COUNT(DISTINCT CASE WHEN a.status IN ('hadir', 'terlambat') THEN a.murid_id END) * 100.0 / 
                        NULLIF(COUNT(DISTINCT m.id), 0), 
                        1
                    )) AS persen_hadir
                FROM kelas k
                LEFT JOIN murid m ON k.id = m.kelas_id
                LEFT JOIN absensi a ON m.id = a.murid_id AND a.tanggal = ?
                GROUP BY k.id, k.nama_kelas, k.tingkat
                HAVING total_murid > 0
                ORDER BY persen_hadir DESC
            `, [tanggal]);

            const dataFixed = data.map(d => ({
                ...d,
                persen_hadir: Math.min(100, Math.max(0, parseFloat(d.persen_hadir) || 0))
            }));

            return res.json({
                success: true,
                data: dataFixed,
                kategori: 'persen_hadir',
                tanggal
            });
        }
        else {
            return res.status(400).json({ success: false, message: 'Kategori tidak valid' });
        }

        const [data] = await db.query(query, params);

        res.json({
            success: true,
            data: data,
            kategori,
            total: data.length,
            tanggal
        });
    } catch (error) {
        console.error('Get detail kategori error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ... (kode sebelumnya)

// ============================================
// SCAN QR CODE UNTUK PULANG
// ============================================
exports.scanQRPulang = async (req, res) => {
    try {
        const { qr_code } = req.body;

        if (!qr_code) {
            return res.status(400).json({ success: false, message: 'QR Code harus disertakan' });
        }

        // Cari murid berdasarkan QR code
        const [murid] = await db.query(`
            SELECT m.*, u.nama_lengkap, k.nama_kelas
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE m.qr_code = ?
        `, [qr_code]);

        if (murid.length === 0) {
            return res.status(404).json({ success: false, message: 'QR Code tidak valid' });
        }

        const muridData = murid[0];
        const now = new Date();
        const jam = now.getHours();
        const menit = now.getMinutes();
        const waktuSekarang = `${jam.toString().padStart(2, '0')}:${menit.toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        const tanggal = getTanggalLokal();

        // Cek apakah murid sudah absen datang hari ini
        const [absensiHariIni] = await db.query(
            'SELECT id, jam_pulang FROM absensi WHERE murid_id = ? AND tanggal = ?',
            [muridData.id, tanggal]
        );

        if (absensiHariIni.length === 0) {
            return res.status(400).json({
                success: false,
                message: `${muridData.nama_lengkap} belum melakukan absensi datang hari ini.`
            });
        }

        // Cek apakah sudah absen pulang
        if (absensiHariIni[0].jam_pulang) {
            return res.status(400).json({
                success: false,
                message: `${muridData.nama_lengkap} sudah melakukan absensi pulang hari ini.`
            });
        }

        // Tentukan status pulang berdasarkan rentang waktu 13:00 - 19:00
        let statusPulang;
        const menitTotal = jam * 60 + menit;

        if (menitTotal >= 13 * 60 && menitTotal <= 19 * 60) {
            statusPulang = 'tepat_waktu';
        } else {
            statusPulang = 'terlambat_pulang';
        }

        // Update absensi dengan jam_pulang dan status_pulang
        await db.query(`
            UPDATE absensi
            SET jam_pulang = ?, status_pulang = ?
            WHERE id = ?
        `, [waktuSekarang, statusPulang, absensiHariIni[0].id]);

        // Kirim notifikasi WA ke orang tua (opsional)
        if (muridData.orangtua_id) {
            try {
                const [orangtua] = await db.query(
                    'SELECT no_telepon FROM users WHERE id = ?',
                    [muridData.orangtua_id]
                );
                if (orangtua.length > 0 && orangtua[0].no_telepon) {
                    const { kirimNotifikasiWA } = require('../services/whatsappService');
                    const pesan = `📤 *NOTIFIKASI PULANG*\n\n` +
                        `Ananda *${muridData.nama_lengkap}* (${muridData.nama_kelas})\n` +
                        `Telah pulang dari sekolah\n\n` +
                        `🕐 Waktu: ${waktuSekarang}\n` +
                        `📊 Status: ${statusPulang === 'tepat_waktu' ? 'Tepat Waktu' : 'Terlambat Pulang'}\n\n` +
                        `_SIAP PINTAR - Sistem Informasi Sekolah_`;
                    await kirimNotifikasiWA(orangtua[0].no_telepon, pesan);
                }
            } catch (waError) {
                console.error('WA error:', waError.message);
            }
        }

        res.json({
            success: true,
            message: 'Absensi pulang berhasil',
            data: {
                nama: muridData.nama_lengkap,
                kelas: muridData.nama_kelas,
                waktu: waktuSekarang,
                status: statusPulang
            }
        });

    } catch (error) {
        console.error('Scan QR pulang error:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
    }
};

// ============================================
// GET ABSENSI HARI INI (UPDATE: TAMPILKAN JAM PULANG)
// ============================================
exports.getAbsensiHariIni = async (req, res) => {
    try {
        const tanggal = getTanggalLokal();

        const [absensi] = await db.query(`
            SELECT a.*, u.nama_lengkap as nama, k.nama_kelas as kelas
            FROM absensi a
            JOIN murid m ON a.murid_id = m.id
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE a.tanggal = ?
            ORDER BY a.jam_datang DESC
        `, [tanggal]);

        res.json({ success: true, data: absensi });
    } catch (error) {
        console.error('Get absensi error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET STATUS JAM ABSENSI
// ============================================
exports.getStatusJamAbsensi = async (req, res) => {
    try {
        const pengaturan = await getPengaturan();
        const now = new Date();
        const menitSekarang = now.getHours() * 60 + now.getMinutes();

        const datangBuka = toMenit(pengaturan.jam_buka_absen_datang);
        const datangTutup = toMenit(pengaturan.jam_tutup_absen_datang);
        const datangAktif = menitSekarang >= datangBuka && menitSekarang <= datangTutup;

        const pulangBuka = toMenit(pengaturan.jam_buka_absen_pulang);
        const pulangTutup = toMenit(pengaturan.jam_tutup_absen_pulang);
        const pulangAktif = menitSekarang >= pulangBuka && menitSekarang <= pulangTutup;

        res.json({
            success: true,
            data: {
                jam_sekarang: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                datang: {
                    buka: pengaturan.jam_buka_absen_datang,
                    tutup: pengaturan.jam_tutup_absen_datang,
                    aktif: datangAktif,
                    keterangan: datangAktif
                        ? 'Absensi datang DIBUKA'
                        : `Absensi datang ${menitSekarang < datangBuka ? 'belum dibuka' : 'sudah ditutup'}`
                },
                pulang: {
                    buka: pengaturan.jam_buka_absen_pulang,
                    tutup: pengaturan.jam_tutup_absen_pulang,
                    aktif: pulangAktif,
                    keterangan: pulangAktif
                        ? 'Absensi pulang DIBUKA'
                        : `Absensi pulang ${menitSekarang < pulangBuka ? 'belum dibuka' : 'sudah ditutup'}`
                }
            }
        });
    } catch (error) {
        console.error('Get status jam error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// ABSENSI MASSAL (BANYAK MURID SEKALIGUS)
// ============================================
exports.absensiMassal = async (req, res) => {
    try {
        const { murid_ids, status, keterangan, tipe = 'datang' } = req.body;
        // tipe: 'datang' atau 'pulang'

        if (!murid_ids || !Array.isArray(murid_ids) || murid_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Pilih minimal 1 murid'
            });
        }

        if (!['hadir', 'terlambat', 'izin', 'sakit', 'alpa'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status tidak valid'
            });
        }

        const now = new Date();
        const tanggal = now.toISOString().split('T')[0];
        const waktuSekarang = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

        let berhasil = 0;
        let dilewati = 0;
        let gagal = 0;
        const detail = [];

        for (const murid_id of murid_ids) {
            try {
                // Cek murid ada
                const [murid] = await db.query(`
                    SELECT m.*, u.nama_lengkap, k.nama_kelas
                    FROM murid m
                    JOIN users u ON m.user_id = u.id
                    JOIN kelas k ON m.kelas_id = k.id
                    WHERE m.id = ?
                `, [murid_id]);

                if (murid.length === 0) {
                    gagal++;
                    detail.push({ murid_id, status: 'gagal', alasan: 'Murid tidak ditemukan' });
                    continue;
                }

                const muridData = murid[0];

                // Cek sudah absen
                const [existing] = await db.query(
                    'SELECT id, jam_pulang FROM absensi WHERE murid_id = ? AND tanggal = ?',
                    [muridData.id, tanggal]
                );

                if (tipe === 'datang') {
                    // ABSENSI DATANG
                    if (existing.length > 0) {
                        dilewati++;
                        detail.push({ murid_id, nama: muridData.nama_lengkap, status: 'dilewati', alasan: 'Sudah absen' });
                        continue;
                    }

                    let poin = 0;
                    if (status === 'hadir') poin = 5;
                    else if (status === 'terlambat') poin = -5;
                    else if (status === 'alpa') poin = -10;

                    await db.query(`
                        INSERT INTO absensi (murid_id, tanggal, jam_datang, status, poin_didapat, keterangan)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [muridData.id, tanggal, waktuSekarang, status, poin, keterangan || 'Absensi massal']);

                    if (poin !== 0) {
                        await db.query(`
                            UPDATE murid 
                            SET poin_bulan_ini = poin_bulan_ini + ?,
                                poin_tahun_ini = poin_tahun_ini + ?
                            WHERE id = ?
                        `, [poin, poin, muridData.id]);
                    }

                    berhasil++;
                    detail.push({ murid_id, nama: muridData.nama_lengkap, status: 'berhasil', poin });

                } else {
                    // ABSENSI PULANG
                    if (existing.length === 0) {
                        gagal++;
                        detail.push({ murid_id, nama: muridData.nama_lengkap, status: 'gagal', alasan: 'Belum absen datang' });
                        continue;
                    }

                    if (existing[0].jam_pulang) {
                        dilewati++;
                        detail.push({ murid_id, nama: muridData.nama_lengkap, status: 'dilewati', alasan: 'Sudah absen pulang' });
                        continue;
                    }

                    // Tentukan status pulang
                    const jam = now.getHours();
                    const menit = now.getMinutes();
                    const menitTotal = jam * 60 + menit;
                    let statusPulang;

                    if (menitTotal >= 13 * 60 && menitTotal <= 19 * 60) {
                        statusPulang = 'tepat_waktu';
                    } else {
                        statusPulang = 'terlambat_pulang';
                    }

                    await db.query(`
                        UPDATE absensi
                        SET jam_pulang = ?, status_pulang = ?
                        WHERE id = ?
                    `, [waktuSekarang, statusPulang, existing[0].id]);

                    berhasil++;
                    detail.push({ murid_id, nama: muridData.nama_lengkap, status: 'berhasil', status_pulang: statusPulang });
                }

            } catch (err) {
                console.error(`Error murid_id ${murid_id}:`, err.message);
                gagal++;
                detail.push({ murid_id, status: 'gagal', alasan: err.message });
            }
        }

        res.json({
            success: true,
            message: `Absensi massal: ${berhasil} berhasil, ${dilewati} dilewati, ${gagal} gagal`,
            data: {
                tipe,
                total: murid_ids.length,
                berhasil,
                dilewati,
                gagal,
                detail
            }
        });

    } catch (error) {
        console.error('Absensi massal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};