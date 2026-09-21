import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error('Uso: npm run auth:hash -- "TuClaveSegura"');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log(hash);
