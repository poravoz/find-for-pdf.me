import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { STORAGE_CONFIG } from './config/storage.config';

@Injectable()
export class StorageService {
    private readonly s3: S3Client;
    private readonly bucketName: string;

    constructor(private readonly configService: ConfigService) {
        this.bucketName = this.configService.get<string>(
            'R2_BUCKET_NAME',
        )!;

        this.s3 = new S3Client({
            region: STORAGE_CONFIG.REGION,
            endpoint: this.configService.get<string>('R2_ENDPOINT'),
            credentials: {
                accessKeyId: this.configService.get<string>(
                    'R2_ACCESS_KEY_ID',
                )!,
                secretAccessKey: this.configService.get<string>(
                    'R2_SECRET_ACCESS_KEY',
                )!,
            },
        });
    }

    async uploadFile(
        fileName: string,
        fileBuffer: Buffer,
        contentType: string,
    ): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: fileName,
            Body: fileBuffer,
            ContentType: contentType,
        });

        await this.s3.send(command);

        return fileName;
    }

    async getDownloadUrl(fileName: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: fileName,
        });

        return getSignedUrl(this.s3, command, {
            expiresIn: STORAGE_CONFIG.DOWNLOAD_URL_EXPIRES_IN,
        });
    }

    async getExistingFileNames(): Promise<string[]> {
        const fileNames: string[] = [];
        let continuationToken: string | undefined;
    
        do {
            const command = new ListObjectsV2Command({
                Bucket: this.bucketName,
                ContinuationToken: continuationToken,
            });
    
            const response = await this.s3.send(command);
    
            for (const object of response.Contents || []) {
                if (object.Key) {
                    fileNames.push(object.Key);
                }
            }
    
            continuationToken = response.NextContinuationToken;
        } while (continuationToken);
    
        return fileNames;
    }

    async deleteFile(fileName: string): Promise<void> {
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
        });
      
        await this.s3.send(command);
    }
    
    getFileFolder(fileName: string): string {
        const extension = fileName.split('.').pop()?.toLowerCase();
    
        switch (extension) {
            case 'pdf':
            case 'txt':
            case 'doc':
            case 'docx':
                return 'documents';
    
            case 'ppt':
            case 'pptx':
                return 'presentations';
    
            case 'xls':
            case 'xlsx':
            case 'csv':
                return 'spreadsheets';
    
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'webp':
                return 'images';
    
            default:
                return 'other';
        }
    }
}
