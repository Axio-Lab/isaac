import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { resolveUploadsDir } from "./uploads/uploads-path";

async function bootstrap() {
  resolveUploadsDir();

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-User-Email",
      "X-Telegram-Bot-Api-Secret-Token",
      "X-Slack-Signature",
      "X-Slack-Request-Timestamp",
      "X-Discord-Secret",
      "X-Whatsapp-Secret",
    ],
  });

  app.setGlobalPrefix("api");

  const port = parseInt(process.env.PORT || "8080", 10);
  await app.listen(port);
  console.log(`[Isaac] Backend running on port ${port}`);
}

bootstrap();
