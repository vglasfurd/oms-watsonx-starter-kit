import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { AppConfigService } from './app/core/app-config.service';
import { SwaggerModule } from '@nestjs/swagger';
import { authMiddleware } from './app/security/auth-middleware';

const appConfigSvc = AppConfigService.INSTANCE;
const { server } = appConfigSvc.getApplicationConfiguration();

async function bootstrap() {
  const app = await (server.https
    ? NestFactory.create(AppModule, { httpsOptions: server.httpsOptions })
    : NestFactory.create(AppModule));

  if (!server.securityDisabled) {
    app.use(authMiddleware);
  }

  const document = appConfigSvc.getOpenApiDocument();
  SwaggerModule.setup('api', app, document);
  await app.listen(server.port, process.env.SERVER_HOSTNAME || '0.0.0.0');
}
bootstrap();
