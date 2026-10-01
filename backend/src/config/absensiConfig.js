// ============================================
// KONFIGURASI JAM ABSENSI
// ============================================
module.exports = {
    // Absensi Datang
    datang: {
        buka: '05:00',       // Jam buka absensi datang
        tutup: '08:00',      // Jam tutup absensi datang
        // Rentang poin
        sebelum630: { poin: 10, batas: '06:30' },
        antara630_645: { poin: 5, batas: '06:45' },
        antara645_700: { poin: 1, batas: '07:00' },
        setelah700: { poin: -5 }  // terlambat
    },
    
    // Absensi Pulang
    pulang: {
        buka: '13:00',       // Jam buka absensi pulang
        tutup: '19:00'       // Jam tutup absensi pulang
    }
};