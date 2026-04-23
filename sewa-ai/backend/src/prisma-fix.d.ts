declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: any);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $on(event: string, callback: (e: any) => void): void;
    [key: string]: any;
  }
}
