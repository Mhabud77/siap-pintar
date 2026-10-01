const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

(async () => {
    try {
        const [users] = await db.query(
            'SELECT username, password FROM users WHERE username = ?',
            ['admin']
        );

        if (users.length === 0) {
            console.log('❌ User admin tidak ditemukan');
            process.exit(1);
        }

        const hashDiDB = users[0].password;
        console.log('Hash di DB:', hashDiDB);
        console.log('Panjang hash:', hashDiDB.length);

        const cocok = await bcrypt.compare('admin123', hashDiDB);
        console.log('Password admin123 cocok?', cocok ? '✅ YA' : '❌ TIDAK');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();