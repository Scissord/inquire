import { utilities as nestWinstonUtilities } from 'nest-winston';
import * as winston from 'winston';

export const buildWinstonLogger = (level: string) =>
  winston.createLogger({
    level,
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonUtilities.format.nestLike('API', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
    ],
  });
