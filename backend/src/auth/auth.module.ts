import { Module, Global } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard } from "./auth.guard";

@Global()
@Module({
  providers: [PrismaService, AuthGuard],
  exports: [PrismaService, AuthGuard],
})
export class AuthModule {}
