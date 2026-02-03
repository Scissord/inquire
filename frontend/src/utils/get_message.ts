import { BusinessMessages, HttpMessages } from '@/constants';

export function getMessage(code: string | number) {
  if (
    typeof code === 'string' &&
    BusinessMessages[code as keyof typeof BusinessMessages]
  ) {
    return BusinessMessages[code as keyof typeof BusinessMessages];
  }
  if (
    typeof code === 'number' &&
    HttpMessages[code as keyof typeof HttpMessages]
  ) {
    return HttpMessages[code as keyof typeof HttpMessages];
  }
  return 'Неизвестная ошибка';
}
