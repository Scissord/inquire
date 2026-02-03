import {
  BusinessCodes,
  BusinessCode,
  HttpStatus,
  HttpStatusCode,
} from '@/constants';

export const BusinessMessages: Record<BusinessCode, string> = {
  [BusinessCodes.SUCCESS]: 'Операция успешно выполнена',
  [BusinessCodes.ERROR]: 'Произошла ошибка',
  [BusinessCodes.INVALID]: 'Некорректные данные',
};

export const HttpMessages: Record<HttpStatusCode, string> = {
  [HttpStatus.OK]: 'Success',
  [HttpStatus.CREATED]: 'Created',
  [HttpStatus.BAD_REQUEST]: 'Invalid request body',
  [HttpStatus.UNAUTHORIZED]: 'Validation error',
  [HttpStatus.FORBIDDEN]: 'Access denied',
  [HttpStatus.INTERNAL_ERROR]: 'Internal Server Error',
};
