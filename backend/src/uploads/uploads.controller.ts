import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { Response } from "express";
import { randomUUID } from "crypto";
import { extname, join } from "path";
import { existsSync } from "fs";

const UPLOADS_DIR = join(__dirname, "..", "..", "uploads");

const storage = diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase() || ".bin";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Controller("api/uploads")
export class UploadsController {
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
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    return { url: `/api/uploads/${file.filename}` };
  }

  @Get(":filename")
  serve(@Param("filename") filename: string, @Res() res: Response) {
    if (/[/\\]/.test(filename)) throw new BadRequestException("Invalid filename");
    const filePath = join(UPLOADS_DIR, filename);
    if (!existsSync(filePath)) throw new NotFoundException("File not found");
    res.sendFile(filePath);
  }
}
