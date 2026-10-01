const express = require('express');
const cors = require('cors');
process.env.TZ = 'Asia/Jakarta';
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/authRoutes');
const absensiRoutes = require('./routes/absensiRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/absensi', absensiRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Selamat datang di API SIAP PINTAR',
        version: '1.0.0'
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server',
        error: err.message
    });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';   // ← listen di semua network interface

app.listen(PORT, HOST, () => {
    console.log(`🚀 Server berjalan di:`);
    console.log(`   - http://localhost:${PORT}`);
    console.log(`   - http://192.168.1.10:${PORT}  ← IP Anda (ganti sesuai ipconfig)`);
});
const perilakuRoutes = require('./routes/perilakuRoutes');
app.use('/api/perilaku', perilakuRoutes);
const misiRoutes = require('./routes/misiRoutes');
app.use('/api/misi', misiRoutes);
const leaderboardRoutes = require('./routes/leaderboardRoutes');
app.use('/api/leaderboard', leaderboardRoutes);
const laporanRoutes = require('./routes/laporanRoutes');
app.use('/api/laporan', laporanRoutes);
const muridRoutes = require('./routes/muridRoutes');
app.use('/api/murid', muridRoutes);
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);
const kelasRoutes = require('./routes/kelasRoutes');
app.use('/api/kelas', kelasRoutes);
const konfigurasiRoutes = require('./routes/konfigurasiRoutes');
app.use('/api/konfigurasi', konfigurasiRoutes);
const waliKelasRoutes = require('./routes/waliKelasRoutes');
app.use('/api/wali-kelas', waliKelasRoutes);
const catatanRoutes = require('./routes/catatanRoutes');
app.use('/api/catatan', catatanRoutes);
const dataSekolahRoutes = require('./routes/dataSekolahRoutes');
app.use('/api/data-sekolah', dataSekolahRoutes);
const dataKelasRoutes = require('./routes/dataKelasRoutes');
app.use('/api/data-kelas', dataKelasRoutes);
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
const adminDataRoutes = require('./routes/adminDataRoutes');
app.use('/api/admin-data', adminDataRoutes);
const profilRoutes = require('./routes/profilRoutes');
app.use('/api/profil', profilRoutes);
const muridDashboardRoutes = require('./routes/muridDashboardRoutes');
app.use('/api/murid-dashboard', muridDashboardRoutes);
const bkRoutes = require('./routes/bkRoutes');
app.use('/api/bk', bkRoutes);
const downloadUserRoutes = require('./routes/downloadUserRoutes');
app.use('/api/download-user', downloadUserRoutes);
const qrCodeRoutes = require('./routes/qrCodeRoutes');
app.use('/api/qr-code', qrCodeRoutes);
const rekapAbsensiRoutes = require('./routes/rekapAbsensiRoutes');
app.use('/api/rekap-absensi', rekapAbsensiRoutes);
const orangtuaRoutes = require('./routes/orangtuaRoutes');
app.use('/api/orangtua', orangtuaRoutes);
const pengaturanRoutes = require('./routes/pengaturanRoutes');
app.use('/api/pengaturan', pengaturanRoutes);