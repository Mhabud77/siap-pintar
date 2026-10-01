const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

// ============================================
// KONFIGURASI
// ============================================
const PASSWORD_DEFAULT = 'spensago@123';  // Password standar semua murid
const CSV_FILE = path.join(__dirname, 'data-murid.csv');
const TAHUN_AJARAN = '2026/2027';

// ============================================
// FUNGSI BANTU
// ============================================

// Baca file CSV
function bacaCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

// Buat username dari nama + NIS (biar unik)
function buatUsername(nama, nis) {
    // Ambil nama belakang, lowercase, hilangkan spasi
    const namaBelakang = nama.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    // Ambil 5 digit NIS utuh
    const nisAkhir = String(nis).slice(-5);
    return `${namaBelakang}${nisAkhir}`;
}

// Buat email dari username
function buatEmail(username) {
    return `${username}@murid.sekolah.sch.id`;
}

// Buat QR code dari NIS
function buatQRCode(nis) {
    return `Spensago-${nis}`;
}

// ============================================
// MAIN
// ============================================
(async () => {
    try {
        console.log('=== SEED MURID ===\n');

        // 1. Cek file CSV
        if (!fs.existsSync(CSV_FILE)) {
            console.error(`❌ File tidak ditemukan: ${CSV_FILE}`);
            console.error('   Buat file data-murid.csv di folder backend/');
            process.exit(1);
        }

        // 2. Baca CSV
        console.log('📖 Membaca file CSV...');
        const dataMurid = await bacaCSV(CSV_FILE);
        console.log(`✅ ${dataMurid.length} baris terbaca\n`);

        // 3. Hash password sekali
        console.log('🔐 Membuat hash password...');
        const hashPassword = bcrypt.hashSync(PASSWORD_DEFAULT, 10);
        console.log(`✅ Hash siap\n`);

        // 4. Ambil mapping kelas (nama_kelas -> id)
        console.log('📚 Mengambil data kelas...');
        const [kelasRows] = await db.query('SELECT id, nama_kelas FROM kelas');
        const kelasMap = {};
        kelasRows.forEach(k => {
            kelasMap[k.nama_kelas] = k.id;
        });
        console.log(`✅ ${Object.keys(kelasMap).length} kelas ditemukan\n`);

        // 5. Insert murid satu per satu
        console.log('👨‍🎓 Memasukkan data murid...\n');
        let berhasil = 0;
        let gagal = 0;
        let dilewati = 0;

        for (let i = 0; i < dataMurid.length; i++) {
            const row = dataMurid[i];
            const nama = (row.nama || '').trim();
            const kelas = (row.kelas || '').trim().toUpperCase();
            const nis = (row.nis || '').trim();
            const jk = (row.jenis_kelamin || '').trim().toUpperCase();

            // Validasi
            if (!nama || !kelas || !nis) {
                console.log(`⚠️  Baris ${i + 2}: data tidak lengkap, dilewati`);
                dilewati++;
                continue;
            }

            // Cek kelas ada
            if (!kelasMap[kelas]) {
                console.log(`⚠️  Baris ${i + 2}: kelas "${kelas}" tidak ada, dilewati`);
                dilewati++;
                continue;
            }

            const kelasId = kelasMap[kelas];
            const username = buatUsername(nama, nis);
            const email = buatEmail(username);
            const qrCode = buatQRCode(nis);

            try {
                // Insert user
                const [userResult] = await db.query(
                    `INSERT INTO users (username, password, role, nama_lengkap, email) 
                     VALUES (?, ?, 'murid', ?, ?)`,
                    [username, hashPassword, nama, email]
                );

                const userId = userResult.insertId;

                // Insert murid
                await db.query(
                    `INSERT INTO murid (user_id, nis, kelas_id, qr_code, poin_bulan_ini, poin_tahun_ini) 
                     VALUES (?, ?, ?, ?, 100, 0)`,
                    [userId, nis, kelasId, qrCode]
                );

                console.log(`✅ [${i + 1}/${dataMurid.length}] ${nama} (${kelas}) - ${username}`);
                berhasil++;

            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    console.log(`⚠️  [${i + 1}/${dataMurid.length}] ${nama} - duplikat, dilewati`);
                    dilewati++;
                } else {
                    console.log(`❌ [${i + 1}/${dataMurid.length}] ${nama} - ${err.message}`);
                    gagal++;
                }
            }
        }

        // 6. Ringkasan
        console.log('\n=== SELESAI ===');
        console.log(`✅ Berhasil: ${berhasil}`);
        console.log(`⚠️  Dilewati: ${dilewati}`);
        console.log(`❌ Gagal   : ${gagal}`);
        console.log(`📊 Total   : ${dataMurid.length}`);

        process.exit(0);

    } catch (err) {
        console.error('❌ Error fatal:', err.message);
        console.error(err);
        process.exit(1);
    }
})();