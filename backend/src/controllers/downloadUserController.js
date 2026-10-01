const db = require('../config/database');
const ExcelJS = require('exceljs');

async function getAllUserData(filter = {}) {
    const { role, search, jenis_guru } = filter;

    let query = `
        SELECT 
            u.id, u.username, u.nip, u.password, u.role, u.jenis_guru,
            u.nama_lengkap, u.email, u.no_telepon, u.foto_profil,
            u.created_at, u.updated_at,
            m.nis, m.jenis_kelamin, m.qr_code, m.poin_bulan_ini, m.poin_tahun_ini,
            k.nama_kelas, k.tingkat
        FROM users u
        LEFT JOIN murid m ON m.user_id = u.id
        LEFT JOIN kelas k ON m.kelas_id = k.id
        WHERE 1=1
    `;
    const params = [];

    if (role) { query += ' AND u.role = ?'; params.push(role); }
    if (jenis_guru) { query += ' AND u.jenis_guru = ?'; params.push(jenis_guru); }
    if (search) {
        query += ' AND (u.nama_lengkap LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR m.nis LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY u.role, k.tingkat, k.nama_kelas, u.nama_lengkap';
    const [users] = await db.query(query, params);
    return users;
}

exports.previewDataUser = async (req, res) => {
    try {
        const { role, search, jenis_guru, limit = 50, offset = 0 } = req.query;
        const users = await getAllUserData({ role, search, jenis_guru });
        const total = users.length;
        const paginated = users.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

        const statistik = {
            total,
            admin: users.filter(u => u.role === 'admin').length,
            kepsek: users.filter(u => u.role === 'kepsek').length,
            guru: users.filter(u => u.role === 'guru').length,
            guru_bk: users.filter(u => u.role === 'guru_bk').length,
            murid: users.filter(u => u.role === 'murid').length,
            orangtua: users.filter(u => u.role === 'orangtua').length
        };

        res.json({
            success: true,
            data: paginated,
            statistik,
            pagination: { total, limit: parseInt(limit), offset: parseInt(offset) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.downloadCSV = async (req, res) => {
    try {
        const { role, search, jenis_guru } = req.query;
        const users = await getAllUserData({ role, search, jenis_guru });

        const headers = [
            'ID', 'Username', 'NIP', 'Password Hash', 'Nama Lengkap', 'Role', 'Jenis Guru',
            'Email', 'No. Telepon', 'NIS', 'Jenis Kelamin', 'QR Code', 'Kelas', 'Tingkat',
            'Poin Bulan Ini', 'Poin Tahun Ini', 'Tanggal Daftar', 'Terakhir Update'
        ];

        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        let csv = headers.join(',') + '\n';
        users.forEach(u => {
            const row = [
                u.id, u.username, u.nip, u.password, u.nama_lengkap, u.role, u.jenis_guru || '',
                u.email || '', u.no_telepon || '', u.nis || '', u.jenis_kelamin || '',
                u.qr_code || '', u.nama_kelas || '', u.tingkat || '',
                u.poin_bulan_ini || '', u.poin_tahun_ini || '',
                u.created_at ? new Date(u.created_at).toISOString() : '',
                u.updated_at ? new Date(u.updated_at).toISOString() : ''
            ];
            csv += row.map(escapeCSV).join(',') + '\n';
        });

        const timestamp = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="data-user-${timestamp}.csv"`);
        res.send('\uFEFF' + csv);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.downloadExcel = async (req, res) => {
    try {
        const { role, search, jenis_guru } = req.query;
        const users = await getAllUserData({ role, search, jenis_guru });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'SIAP PINTAR';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Data User');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 8 },
            { header: 'Username', key: 'username', width: 20 },
            { header: 'NIP', key: 'nip', width: 22 },
            { header: 'Password Hash', key: 'password', width: 50 },
            { header: 'Nama Lengkap', key: 'nama_lengkap', width: 30 },
            { header: 'Role', key: 'role', width: 12 },
            { header: 'Jenis Guru', key: 'jenis_guru', width: 15 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'No. Telepon', key: 'no_telepon', width: 15 },
            { header: 'NIS', key: 'nis', width: 12 },
            { header: 'Jenis Kelamin', key: 'jenis_kelamin', width: 14 },
            { header: 'QR Code', key: 'qr_code', width: 20 },
            { header: 'Kelas', key: 'nama_kelas', width: 10 },
            { header: 'Tingkat', key: 'tingkat', width: 8 },
            { header: 'Poin Bulan Ini', key: 'poin_bulan_ini', width: 12 },
            { header: 'Poin Tahun Ini', key: 'poin_tahun_ini', width: 12 },
            { header: 'Tanggal Daftar', key: 'created_at', width: 20 },
            { header: 'Terakhir Update', key: 'updated_at', width: 20 }
        ];

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 25;

        users.forEach(u => {
            worksheet.addRow({
                id: u.id, username: u.username, nip: u.nip,
                password: u.password, nama_lengkap: u.nama_lengkap,
                role: u.role, jenis_guru: u.jenis_guru || '',
                email: u.email || '', no_telepon: u.no_telepon || '',
                nis: u.nis || '', jenis_kelamin: u.jenis_kelamin || '',
                qr_code: u.qr_code || '', nama_kelas: u.nama_kelas || '',
                tingkat: u.tingkat || '', poin_bulan_ini: u.poin_bulan_ini || '',
                poin_tahun_ini: u.poin_tahun_ini || '',
                created_at: u.created_at ? new Date(u.created_at).toLocaleString('id-ID') : '',
                updated_at: u.updated_at ? new Date(u.updated_at).toLocaleString('id-ID') : ''
            });
        });

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.alignment = { vertical: 'middle' };
                if (rowNumber % 2 === 0) {
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                }
            }
        });

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            });
        });

        worksheet.views = [{ state: 'frozen', ySplit: 1 }];
        worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 18 } };

        const statSheet = workbook.addWorksheet('Statistik');
        statSheet.columns = [
            { header: 'Role', key: 'role', width: 20 },
            { header: 'Jumlah', key: 'jumlah', width: 15 }
        ];
        statSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        statSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };

        ['admin', 'kepsek', 'guru', 'guru_bk', 'murid', 'orangtua'].forEach(role => {
            statSheet.addRow({ role, jumlah: users.filter(u => u.role === role).length });
        });
        statSheet.addRow({ role: 'TOTAL', jumlah: users.length });

        const timestamp = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="data-user-${timestamp}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};