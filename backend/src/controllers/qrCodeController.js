const db = require('../config/database');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Folder untuk simpan QR Code
const qrDir = path.join(__dirname, '../../uploads/qrcode');
if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
}

// ============================================
// GENERATE QR CODE MASSAL UNTUK SEMUA MURID
// ============================================
exports.generateAllQR = async (req, res) => {
    try {
        const [muridList] = await db.query(`
            SELECT m.id, m.nis, m.qr_code, u.nama_lengkap, k.nama_kelas
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            ORDER BY k.tingkat, k.nama_kelas, u.nama_lengkap
        `);

        let berhasil = 0;
        let gagal = 0;
        let dilewati = 0;

        for (const murid of muridList) {
            try {
                const qrString = murid.qr_code || `MURID-${murid.nis}`;
                const qrFile = path.join(qrDir, `qr-${murid.nis}.png`);

                if (fs.existsSync(qrFile)) {
                    dilewati++;
                    continue;
                }

                await QRCode.toFile(qrFile, qrString, {
                    width: 800,
                    margin: 2,
                    color: { dark: '#000000', light: '#FFFFFF' },
                    errorCorrectionLevel: 'H'
                });

                if (!murid.qr_code) {
                    await db.query(
                        'UPDATE murid SET qr_code = ? WHERE id = ?',
                        [qrString, murid.id]
                    );
                }

                berhasil++;
            } catch (err) {
                console.error(`Gagal generate QR untuk ${murid.nama_lengkap}:`, err.message);
                gagal++;
            }
        }

        res.json({
            success: true,
            message: `Generate selesai: ${berhasil} berhasil, ${dilewati} dilewati, ${gagal} gagal`,
            data: { total: muridList.length, berhasil, dilewati, gagal }
        });
    } catch (error) {
        console.error('Generate all QR error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GENERATE QR CODE PER KELAS
// ============================================
exports.generateQRPerKelas = async (req, res) => {
    try {
        const { kelas_id } = req.params;

        const [muridList] = await db.query(`
            SELECT m.id, m.nis, m.qr_code, u.nama_lengkap
            FROM murid m
            JOIN users u ON m.user_id = u.id
            WHERE m.kelas_id = ?
        `, [kelas_id]);

        let berhasil = 0;
        let gagal = 0;
        let dilewati = 0;

        for (const murid of muridList) {
            try {
                const qrString = murid.qr_code || `MURID-${murid.nis}`;
                const qrFile = path.join(qrDir, `qr-${murid.nis}.png`);

                if (fs.existsSync(qrFile)) {
                    dilewati++;
                    continue;
                }

                await QRCode.toFile(qrFile, qrString, {
                    width: 800,
                    margin: 2,
                    errorCorrectionLevel: 'H'
                });

                if (!murid.qr_code) {
                    await db.query(
                        'UPDATE murid SET qr_code = ? WHERE id = ?',
                        [qrString, murid.id]
                    );
                }

                berhasil++;
            } catch (err) {
                gagal++;
            }
        }

        res.json({
            success: true,
            message: `Kelas: ${berhasil} berhasil, ${dilewati} dilewati, ${gagal} gagal`,
            data: { total: muridList.length, berhasil, dilewati, gagal }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GENERATE QR MASSAL DENGAN SSE (PROGRESS REAL-TIME)
// ============================================
exports.generateAllQRStream = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        const [muridList] = await db.query(`
            SELECT m.id, m.nis, m.qr_code, u.nama_lengkap, k.nama_kelas
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            ORDER BY k.tingkat, k.nama_kelas, u.nama_lengkap
        `);

        const total = muridList.length;

        sendEvent({ type: 'start', total, message: `Mulai generate ${total} QR Code...` });

        let berhasil = 0;
        let gagal = 0;
        let dilewati = 0;
        let current = 0;

        for (const murid of muridList) {
            current++;
            try {
                const qrString = murid.qr_code || `MURID-${murid.nis}`;
                const qrFile = path.join(qrDir, `qr-${murid.nis}.png`);

                if (fs.existsSync(qrFile)) {
                    dilewati++;
                } else {
                    await QRCode.toFile(qrFile, qrString, {
                        width: 800,
                        margin: 2,
                        errorCorrectionLevel: 'H'
                    });

                    if (!murid.qr_code) {
                        await db.query(
                            'UPDATE murid SET qr_code = ? WHERE id = ?',
                            [qrString, murid.id]
                        );
                    }

                    berhasil++;
                }

                sendEvent({
                    type: 'progress',
                    current,
                    total,
                    berhasil,
                    dilewati,
                    gagal,
                    percent: Math.round((current / total) * 100),
                    nama: murid.nama_lengkap,
                    kelas: murid.nama_kelas
                });
            } catch (err) {
                gagal++;
                sendEvent({
                    type: 'error',
                    current,
                    total,
                    nama: murid.nama_lengkap,
                    message: err.message
                });
            }
        }

        sendEvent({
            type: 'done',
            total,
            berhasil,
            dilewati,
            gagal,
            message: `Selesai! ${berhasil} berhasil, ${dilewati} dilewati, ${gagal} gagal`
        });

        res.end();
    } catch (error) {
        console.error('Generate QR stream error:', error);
        sendEvent({ type: 'error', message: error.message });
        res.end();
    }
};

// ============================================
// GENERATE QR PER KELAS DENGAN SSE
// ============================================
exports.generateQRPerKelasStream = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        const { kelas_id } = req.params;

        const [muridList] = await db.query(`
            SELECT m.id, m.nis, m.qr_code, u.nama_lengkap
            FROM murid m
            JOIN users u ON m.user_id = u.id
            WHERE m.kelas_id = ?
        `, [kelas_id]);

        const total = muridList.length;

        sendEvent({ type: 'start', total, message: `Mulai generate ${total} QR Code...` });

        let berhasil = 0;
        let gagal = 0;
        let dilewati = 0;
        let current = 0;

        for (const murid of muridList) {
            current++;
            try {
                const qrString = murid.qr_code || `MURID-${murid.nis}`;
                const qrFile = path.join(qrDir, `qr-${murid.nis}.png`);

                if (fs.existsSync(qrFile)) {
                    dilewati++;
                } else {
                    await QRCode.toFile(qrFile, qrString, {
                        width: 800,
                        margin: 2,
                        errorCorrectionLevel: 'H'
                    });

                    if (!murid.qr_code) {
                        await db.query(
                            'UPDATE murid SET qr_code = ? WHERE id = ?',
                            [qrString, murid.id]
                        );
                    }

                    berhasil++;
                }

                sendEvent({
                    type: 'progress',
                    current,
                    total,
                    berhasil,
                    dilewati,
                    gagal,
                    percent: Math.round((current / total) * 100),
                    nama: murid.nama_lengkap
                });
            } catch (err) {
                gagal++;
                sendEvent({
                    type: 'error',
                    current,
                    total,
                    nama: murid.nama_lengkap,
                    message: err.message
                });
            }
        }

        sendEvent({
            type: 'done',
            total,
            berhasil,
            dilewati,
            gagal,
            message: `Selesai! ${berhasil} berhasil, ${dilewati} dilewati, ${gagal} gagal`
        });

        res.end();
    } catch (error) {
        console.error('Generate QR stream error:', error);
        sendEvent({ type: 'error', message: error.message });
        res.end();
    }
};

// ============================================
// GET QR IMAGE SEBAGAI BASE64
// ============================================
exports.getQRImage = async (req, res) => {
    try {
        const { nis } = req.params;
        const qrString = `MURID-${nis}`;

        const dataURL = await QRCode.toDataURL(qrString, {
            width: 800,
            margin: 2,
            errorCorrectionLevel: 'H'
        });

        res.json({
            success: true,
            data: { nis, qr_string: qrString, qr_image: dataURL }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET DATA KARTU SISWA
// ============================================
exports.getKartuSiswa = async (req, res) => {
    try {
        const { kelas_id } = req.query;

        let query = `
            SELECT 
                m.id, m.nis, m.qr_code,
                u.nama_lengkap, u.foto_profil,
                k.nama_kelas, k.tingkat, k.id AS kelas_id
            FROM murid m
            JOIN users u ON m.user_id = u.id
            JOIN kelas k ON m.kelas_id = k.id
            WHERE 1=1
        `;
        const params = [];

        if (kelas_id) {
            query += ' AND m.kelas_id = ?';
            params.push(kelas_id);
        }

        query += ' ORDER BY k.tingkat, k.nama_kelas, u.nama_lengkap';

        const [murid] = await db.query(query, params);

        const [kelasList] = await db.query(
            'SELECT id, nama_kelas, tingkat FROM kelas ORDER BY tingkat, nama_kelas'
        );

        res.json({
            success: true,
            data: murid.map(m => ({
                id: m.id,
                nis: m.nis,
                nama_lengkap: m.nama_lengkap,
                foto_profil: m.foto_profil,
                nama_kelas: m.nama_kelas,
                tingkat: m.tingkat,
                kelas_id: m.kelas_id,
                qr_url: m.qr_code ? `/uploads/qrcode/qr-${m.nis}.png` : null
            })),
            kelas_list: kelasList
        });

    } catch (error) {
        console.error('Get kartu siswa error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET STATISTIK QR CODE
// ============================================
exports.getStatistikQR = async (req, res) => {
    try {
        const [total] = await db.query('SELECT COUNT(*) as total FROM murid');
        const totalMurid = parseInt(total[0].total) || 0;

        let fileCount = 0;
        if (fs.existsSync(qrDir)) {
            const files = fs.readdirSync(qrDir);
            fileCount = files.filter(f => f.endsWith('.png')).length;
        }

        const [denganQR] = await db.query(
            'SELECT COUNT(*) as total FROM murid WHERE qr_code IS NOT NULL'
        );
        const muridPunyaQR = parseInt(denganQR[0].total) || 0;

        res.json({
            success: true,
            data: {
                total_murid: totalMurid,
                file_qr_tergenerate: fileCount,
                murid_punya_qr_code: muridPunyaQR,
                belum_tergenerate: totalMurid - fileCount
            }
        });
    } catch (error) {
        console.error('Get statistik QR error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// HAPUS SEMUA FILE QR
// ============================================
exports.hapusSemuaQR = async (req, res) => {
    try {
        if (fs.existsSync(qrDir)) {
            const files = fs.readdirSync(qrDir);
            let deleted = 0;

            files.forEach(f => {
                if (f.endsWith('.png')) {
                    fs.unlinkSync(path.join(qrDir, f));
                    deleted++;
                }
            });

            res.json({
                success: true,
                message: `${deleted} file QR berhasil dihapus`
            });
        } else {
            res.json({ success: true, message: 'Tidak ada file QR' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
