import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  try {
    console.log('Iniciando backend Nutri-Track...');
    const app = await NestFactory.create(AppModule);
    app.enableCors({
      origin: 'http://localhost:3002', // Permitir peticiones desde el frontend
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.listen(3001, '0.0.0.0'); // Escuchar en todas las interfaces
    console.log('Nutri-Track backend escuchando en http://localhost:3001');
  } catch (error) {
    console.error('Error crítico al iniciar el backend:', error);
    process.exit(1);
  }
}

process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
});

bootstrap();
