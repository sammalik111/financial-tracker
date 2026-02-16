// src/lib/logger.ts
import winston from 'winston';

const isProd = process.env.NODE_ENV === 'production';

const fmt = isProd
  ? winston.format.combine(winston.format.timestamp(), winston.format.json())
  : winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...m }) =>
        `${timestamp} ${level}: ${message}${Object.keys(m).length ? ' ' + JSON.stringify(m) : ''}`)
    );

const transports: winston.transport[] = [new winston.transports.Console({ format: fmt })];

if (isProd) {
  try {
    const WCW = require('winston-cloudwatch');
    transports.push(new WCW({
      logGroupName: process.env.CLOUDWATCH_LOG_GROUP ?? '/jobsignal/app',
      logStreamName: `server-${new Date().toISOString().slice(0, 10)}`,
      awsRegion: process.env.AWS_REGION ?? 'us-east-1',
      jsonMessage: true,
    }));
  } catch { /* fallback to console */ }
}

export const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  defaultMeta: { service: 'jobsignal' },
  transports,
  exitOnError: false,
});
