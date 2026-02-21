import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const prismaClientSingleton = () => {
  // Pass the path to your database file here
  const adapter = new PrismaBetterSqlite3({ 
    url: 'file:./dev.db' 
  });
  
  return new PrismaClient({ adapter });
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

export default prisma