import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard } from "../auth/auth.guard";
import { CloudStorageService } from "./cloud-storage.service";

const storage = memoryStorage();
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Controller("uploads")
export class UploadsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudStorage: CloudStorageService
  ) {}

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
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");

    const resourceType = file.mimetype.startsWith("video/") ? "video" : "image";
    const url = await this.cloudStorage.uploadBuffer(file.buffer, {
      folder: "isaac-uploads",
      resourceType,
    });

    return { url };
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

    const imageUrl = await this.cloudStorage.uploadBuffer(file.buffer, {
      folder: "isaac-avatars",
      resourceType: "image",
    });

    const user = await this.prisma.user.update({
      where: { id: req.userId },
      data: { image: imageUrl },
      select: { id: true, image: true },
    });

    return { url: imageUrl, user };
  }
}
