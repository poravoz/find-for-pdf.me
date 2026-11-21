import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

export const AVATAR_CONFIG = {
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    callback: (
      error: Error | null,
      acceptFile: boolean,
    ) => void,
  ) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          'Можно загружать только JPEG, PNG или WebP',
        ),
        false,
      );
    }

    callback(null, true);
  },
};
