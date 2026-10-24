import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const path = new URL('../.env', import.meta.url);
let env = readFileSync(path, 'utf8');
for (const name of ['JWT_SECRET', 'CSRF_SECRET']) {
  const pattern = new RegExp(`^${name}=(.*)$`, 'm');
  const match = env.match(pattern);
  if (match?.[1]?.trim()) continue;
  const line = `${name}=${randomBytes(48).toString('base64url')}`;
  env = match ? env.replace(pattern, line) : `${env}\n${line}\n`;
}
writeFileSync(path, env);
console.log('Đã cấu hình secret xác thực cục bộ; không hiển thị giá trị.');
