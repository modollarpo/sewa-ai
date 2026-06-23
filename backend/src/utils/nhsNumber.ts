/**
 * Validate NHS Number using Modulus 11 algorithm
 * @param nhsNumber The NHS Number to validate (string or number)
 * @returns true if valid, false otherwise
 * @see https://www.datadictionary.nhs.uk/data_dictionary/attributes/n/nhs/nhs_number_de.asp
 */
export function validateNhsNumber(nhsNumber: string | number): boolean {
  // Convert to string and remove any non-digit characters
  const cleaned = String(nhsNumber).replace(/\D/g, '');
  
  // Must be exactly 10 digits long
  if (cleaned.length !== 10) {
    return false;
  }
  
  // Extract the first 9 digits and the 10th (check digit)
  const digits = cleaned.split('').map(Number);
  const checkDigit = digits[9];
  const firstNine = digits.slice(0, 9);
  
  // Calculate weighted sum: multiply each digit by 10 - index (10 down to 2)
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += firstNine[i] * (10 - i);
  }
  
  // Calculate remainder when sum divided by 11
  const remainder = sum % 11;
  const expectedCheckDigit = remainder === 0 ? 0 : 11 - remainder;
  
  // Special case: if expectedCheckDigit is 11, number is invalid
  if (expectedCheckDigit === 11) {
    return false;
  }
  
  // Check if calculated check digit matches the 10th digit
  return expectedCheckDigit === checkDigit;
}

/**
 * Format NHS Number with spaces for readability (e.g., "123 456 7890")
 * @param nhsNumber The NHS Number to format
 * @returns Formatted string or original if invalid
 */
export function formatNhsNumber(nhsNumber: string | number): string {
  const cleaned = String(nhsNumber).replace(/\D/g, '');
  if (cleaned.length !== 10) {
    return String(nhsNumber);
  }
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
}
