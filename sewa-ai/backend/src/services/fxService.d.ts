export declare function getRates(): Promise<Record<string, number>>;
export declare function convertFromGBP(gbpAmount: number, toCurrency: string): Promise<number>;
export declare function convertToGBP(amount: number, fromCurrency: string): Promise<number>;
