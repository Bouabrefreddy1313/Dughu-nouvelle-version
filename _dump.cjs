process.chdir('C:/Users/HP/dughu');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const sessions = await p.session.findMany({ take: 5, orderBy: { expires: 'desc' }, select: { sessionToken: true, userId: true, expires: true } });
  console.log('SESSIONS:', JSON.stringify(sessions, null, 2));
  const users = await p.user.findMany({ select: { id: true, email: true, name: true, username: true, avatar: true, cover: true } });
  console.log('USERS:', JSON.stringify(users, null, 2));
  await p.$disconnect();
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });