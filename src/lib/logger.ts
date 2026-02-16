// src/lib/logger.ts
import winston from 'winston';

const isProd = process.env.NODE_ENV === 'production';
const logGroup = process.env.CLOUDWATCH_LOG_GROUP ?? '/financial-tracker/app';
const logStream = `server-${new Date().toISOString().slice(0, 10)}`;

const jsonFmt = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const prettyFmt = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const m = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} ${level}: ${message}${m}`;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({ format: isProd ? jsonFmt : prettyFmt }),
];

if (isProd) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const WCW = require('winston-cloudwatch');
    transports.push(new WCW({
      logGroupName: logGroup,
      logStreamName: logStream,
      awsRegion: process.env.AWS_REGION ?? 'us-east-1',
      jsonMessage: true,
      retentionInDays: 30,
    }));
  } catch { /* fall back to console */ }
}

export const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  defaultMeta: { service: 'financial-tracker', env: process.env.NODE_ENV },
  transports,
  exitOnError: false,
});
