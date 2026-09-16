import { Module } from '@nestjs/common';
import {
  WinstonModule,
  utilities as nestWinstonUtilities,
} from 'nest-winston';
import * as winston from 'winston';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format:
            process.env.NODE_ENV === 'production'
              ? winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.json(),
                )
              : winston.format.combine(
                  winston.format.timestamp(),
                  nestWinstonUtilities.format.nestLike('Nest', {
                    prettyPrint: true,
                  }),
                ),
        }),
      ],
    }),
  ],
})
export class LoggerModule {}
