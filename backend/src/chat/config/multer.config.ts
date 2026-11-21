import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { MAX_FILE_SIZE_BYTES } from '../constants/chat.constants';
import { ALLOWED_EXTENSIONS } from '../helper/file.loader';

export const multerOptions: MulterOptions = {
    storage: memoryStorage(),

    fileFilter: (req, file, callback) => {
        const ext = extname(file.originalname).toLowerCase();

        if (ALLOWED_EXTENSIONS.includes(ext)) {
            callback(null, true);
        } else {
            callback(
                new BadRequestException(
                    `Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
                ),
                false,
            );
        }
    },

    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
    },
};
