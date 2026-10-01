const bcrypt = require('bcryptjs');

const password = 'guru@12345';
const hash = bcrypt.hashSync(password, 10);

console.log(hash);