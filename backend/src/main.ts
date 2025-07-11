import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS ayarları
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  });
  
  await app.listen(3000);
  console.log('WebRTC Signaling Server running on port 3000');
}
bootstrap(); 