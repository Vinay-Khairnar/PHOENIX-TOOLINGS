import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.customer.findMany();
  console.log(c);
}
main().catch(console.error);
