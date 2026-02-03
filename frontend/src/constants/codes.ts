export const BusinessCodes = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  INVALID: 'INVALID',
} as const;

// Тип из объекта
export type BusinessCode = (typeof BusinessCodes)[keyof typeof BusinessCodes];
