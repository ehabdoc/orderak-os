// Returns the number of users in the database.
// Used by docker-entrypoint.sh to decide whether to seed.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const count = await prisma.user.count();
console.log(count);
await prisma.$disconnect();
