// SEWA XAI — src/utils/prismaClient.ts
// Enterprise Multi-Tenancy: Prisma Client Extension for Tenant Isolation

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { AsyncLocalStorage } from 'async_hooks';

export const tenantStorage = new AsyncLocalStorage<string>();

const basePrisma = new PrismaClient();

// Enterprise Multi-Tenancy: Implicit RLS via AsyncLocalStorage
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const tenantId = tenantStorage.getStore();
        // Only enforce for known tenant models
        const tenantModels = ['Scan', 'Patient', 'AIResult', 'Doctor', 'Technician', 'Report', 'User'];
        
        if (tenantId && tenantModels.includes(model as string)) {
          const anyArgs = args as any;
          if (['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            anyArgs.where = { ...anyArgs.where, tenantId };
          } else if (['create', 'createMany'].includes(operation)) {
            if (anyArgs.data) {
              if (Array.isArray(anyArgs.data)) {
                anyArgs.data = anyArgs.data.map((d: any) => ({ ...d, tenantId }));
              } else {
                anyArgs.data = { ...anyArgs.data, tenantId };
              }
            }
          }
          
          // Enforce Postgres RLS at the database layer using a connection-bound transaction
          const [, result] = await basePrisma.$transaction([
            basePrisma.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`),
            query(anyArgs)
          ]);
          return result;
        }
        
        return query(args);
      },
    },
  },
});
