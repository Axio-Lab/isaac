import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  Req,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { Response } from "express";
import { randomUUID } from "crypto";
import { extname, join } from "path";
import { existsSync } from "fs";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard } from "../auth/auth.guard";

const UPLOADS_DIR = join(__dirname, "..", "..", "uploads");

const storage = diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase() || ".bin";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Controller("uploads")
export class UploadsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage,
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("video/")) {
          return cb(new BadRequestException("Only image and video files are allowed"), false);
        }
        cb(null, true);
      },
    })
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    return { url: `/api/uploads/${file.filename}` };
  }

  @Post("avatar")
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage,
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
          return cb(new BadRequestException("Only image files are allowed"), false);
        }
        cb(null, true);
      },
    })
  )
  async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    const relativeUrl = `/api/uploads/${file.filename}`;
    const baseUrl = (process.env.API_URL || "").replace(/\/+$/, "");
    const imageUrl = baseUrl ? `${baseUrl}${relativeUrl}` : relativeUrl;

    const user = await this.prisma.user.update({
      where: { id: req.userId },
      data: { image: imageUrl },
      select: { id: true, image: true },
    });

    return { url: imageUrl, user };
  }

  @Get(":filename")
  serve(@Param("filename") filename: string, @Res() res: Response) {
    if (/[/\\]/.test(filename)) throw new BadRequestException("Invalid filename");
    const filePath = join(UPLOADS_DIR, filename);
    if (!existsSync(filePath)) throw new NotFoundException("File not found");
    res.sendFile(filePath);
  }
}
