import 'reflect-metadata';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { optionalEnv } from './env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(
    express.json({
      verify: (req: express.Request & { rawBody?: string }, _res, buffer) => {
        req.rawBody = buffer.toString('utf8');
      }
    })
  );
  app.use(
    express.urlencoded({
      extended: true,
      verify: (req: express.Request & { rawBody?: string }, _res, buffer) => {
        req.rawBody = buffer.toString('utf8');
      }
    })
  );
  app.enableCors({ origin: optionalEnv('WEB_ORIGIN', 'http://localhost:3000') });
  const port = Number(optionalEnv('API_PORT', '4000'));
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

void bootstrap();
