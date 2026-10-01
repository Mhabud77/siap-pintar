const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

// ============================================
// KONFIGURASI
// ============================================
const PASSWORD_DEFAULT = 'orangtua123';
const CSV_FILE = path.join(__dirname, 'data-orangtua.csv');

// ============================================
// BACA CSV
// ============================================
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

// ============================================
// GENERATE USERNAME DARI NIS
// ============================================
function buatUsername(nis) {
    // Bersihkan NIS dari karakter non-angka
    const nisBersih = String(nis).replace(/[^0-9]/g, '');
    return `ortu_${nisBersih}`;
}

// ============================================
// MAIN
// ============================================
(async () => {
    try {
        console.log('=== SEED ORANG TUA (1 ANAK = 1 ORANG TUA) ===\n');

        // 1. Cek file CSV
        if (!fs.existsSync(CSV_FILE)) {
            console.error(`❌ File tidak ditemukan: ${CSV_FILE}`);
            process.exit(1);
        }

        // 2. Baca CSV
        console.log('📖 Membaca file CSV...');
        const dataOrangtua = await bacaCSV(CSV_FILE);
        console.log(`✅ ${dataOrangtua.length} baris terbaca\n`);

        // 3. Hash password sekali
        console.log('🔐 Membuat hash password...');
        const hashPassword = bcrypt.hashSync(PASSWORD_DEFAULT, 10);
        console.log(`✅ Hash siap\n`);

        // 4. Proses
        console.log('👨‍👩‍👧 Memasukkan data orang tua...\n');
        let berhasil = 0;
        let dilewati = 0;
        let gagal = 0;
        let relasiBerhasil = 0;
        let nisTidakDitemukan = 0;

        for (let i = 0; i < dataOrangtua.length; i++) {
            const row = dataOrangtua[i];
            const nama = (row.nama_lengkap || '').trim();
            const noTelepon = (row.no_telepon || '').trim();
            const email = (row.email || '').trim();
            const nisAnak = (row.nis_anak || '').trim();

            // Validasi
            if (!nama || !nisAnak) {
                console.log(`⚠️  Baris ${i + 2}: data tidak lengkap (nama/nis), dilewati`);
                dilewati++;
                continue;
            }

            // Generate username dari NIS
            const username = buatUsername(nisAnak);

            try {
                // Cek murid ada berdasarkan NIS
                const [murid] = await db.query(
                    'SELECT id, orangtua_id FROM murid WHERE nis = ?',
                    [nisAnak]
                );

                if (murid.length === 0) {
                    console.log(`❌ [${i + 1}/${dataOrangtua.length}] NIS ${nisAnak} tidak ditemukan di database`);
                    nisTidakDitemukan++;
                    continue;
                }

                const muridData = murid[0];

                // Cek apakah username sudah ada (untuk kasus re-run)
                const [existingUser] = await db.query(
                    'SELECT id FROM users WHERE username = ?',
                    [username]
                );

                let orangtuaId;

                if (existingUser.length > 0) {
                    orangtuaId = existingUser[0].id;
                    console.log(`⚠️  [${i + 1}/${dataOrangtua.length}] ${username} sudah ada, dilewati insert`);
                    dilewati++;
                } else {
                    // Insert orang tua
                    const [result] = await db.query(`
                        INSERT INTO users (username, password, role, nama_lengkap, email, no_telepon)
                        VALUES (?, ?, 'orangtua', ?, ?, ?)
                    `, [username, hashPassword, nama, email || null, noTelepon || null]);

                    orangtuaId = result.insertId;
                    console.log(`✅ [${i + 1}/${dataOrangtua.length}] ${nama} (${username})`);
                    berhasil++;
                }

                // Cek apakah murid sudah punya orang tua
                if (muridData.orangtua_id) {
                    console.log(`   ⚠️  Murid NIS ${nisAnak} sudah punya orang tua, relasi dilewati`);
                    continue;
                }

                // Update orangtua_id di murid
                await db.query(
                    'UPDATE murid SET orangtua_id = ? WHERE id = ?',
                    [orangtuaId, muridData.id]
                );
                console.log(`   🔗 Terhubung ke murid NIS ${nisAnak}`);
                relasiBerhasil++;

            } catch (err) {
                console.error(`❌ [${i + 1}/${dataOrangtua.length}] ${username} - ${err.message}`);
                gagal++;
            }
        }

        // 5. Ringkasan
        console.log('\n=== SELESAI ===');
        console.log(`✅ Orang tua berhasil dibuat : ${berhasil}`);
        console.log(`🔗 Relasi murid berhasil     : ${relasiBerhasil}`);
        console.log(`⚠️  Dilewati                 : ${dilewati}`);
        console.log(`❌ NIS tidak ditemukan       : ${nisTidakDitemukan}`);
        console.log(`❌ Gagal                     : ${gagal}`);
        console.log(`📊 Total data                : ${dataOrangtua.length}`);

        // 6. Cek total murid belum punya orang tua
        const [totalBelum] = await db.query(
            'SELECT COUNT(*) AS total FROM murid WHERE orangtua_id IS NULL'
        );
        console.log(`\n📋 Murid belum punya orang tua: ${totalBelum[0].total}`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error fatal:', err.message);
        console.error(err);
        process.exit(1);
    }
})();