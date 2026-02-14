import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import cookieParser from 'cookie-parser';
import { graphqlUploadExpress } from 'graphql-upload';
import * as express from 'express';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new LoggingInterceptor());

    app.enableCors({
        origin: [
            'http://localhost:4000', 
            'https://cuben.info', 
            'http://72.61.119.128:4000' 
        ],
        credentials: true,
    });

    app.use(graphqlUploadExpress({ maxFileSize: 15000000, maxFiles: 10 }));
    app.use('/uploads', express.static('./uploads'));

    // DIQQAT: '0.0.0.0' qo'shish Docker uchun shart!
    const port = process.env.PORT_API ?? 5007;
    await app.listen(port, '0.0.0.0'); 
    
    console.log(`Server is running on port ${port} and accepting external connections.`);
}
bootstrap();