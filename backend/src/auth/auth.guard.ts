import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const email = request.headers["x-user-email"] || request.query?.["email"];

    if (!email || typeof email !== "string") {
      throw new UnauthorizedException("Missing X-User-Email header");
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException("Email not verified");
    }

    request.user = user;
    request.userId = user.id;
    return true;
  }
}
