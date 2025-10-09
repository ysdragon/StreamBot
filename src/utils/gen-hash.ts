import * as bcrypt from 'bcrypt';
import argon2 from 'argon2';

const password = process.argv[2];
const hashType = process.argv[3] || 'argon2';

if (!password) {
	console.error('Usage: bun/node run gen-hash <password> [type]');
    console.error('\tExample: bun/node run gen-hash mySecurePassword123 argon2');
	console.error('\tExample: bun/node run gen-hash mySecurePassword123 bcrypt');
	console.error('\nSupported types: argon2 (default), bcrypt');
	process.exit(1);
}

if (hashType !== 'argon2' && hashType !== 'bcrypt') {
	console.error(`Error: Invalid hash type "${hashType}"`);
	console.error('Supported types: argon2, bcrypt');
	process.exit(1);
}

let hash: string;

if (hashType === 'argon2') {
	hash = await argon2.hash(password, {
		type: argon2.argon2id,
		memoryCost: 65536, // 64 MB
		timeCost: 3,
		parallelism: 4
	});
	console.log('\n✅ Argon2 hash generated successfully!\n');
} else {
	const saltRounds = 10;
	hash = bcrypt.hashSync(password, saltRounds);
	console.log('\n✅ Bcrypt hash generated successfully!\n');
}

const escapedHash = hash.replace(/\$/g, '\\$'); 
console.log('Add this to your .env file:');
console.log(`SERVER_PASSWORD = "${escapedHash}"`);
console.log('\nRaw hash:');
console.log(escapedHash);
