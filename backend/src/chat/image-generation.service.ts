import {
    Injectable,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'node:crypto';
import { StorageService } from './storage.service';
import { ComfyImageInfo } from './interfaces/file-generation.interface';

@Injectable()
export class ImageGenerationService {
    private readonly comfyUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly storageService: StorageService,
    ) {
        this.comfyUrl = this.configService.getOrThrow<string>(
            'COMFYUI_BASE_URL',
        );
    }
    async generateImage(prompt: string) {
        if (!prompt?.trim()) {
            throw new BadRequestException('Prompt is required');
        }
    
        try {
            const promptId = await this.sendWorkflow(prompt);
            const imageInfo = await this.waitForImage(promptId);
            const imageBuffer = await this.downloadImage(imageInfo);
    
            const fileName = `generated-images/${randomUUID()}.png`;
    
            await this.storageService.uploadFile(
                fileName,
                imageBuffer,
                'image/png',
            );
    
            const downloadUrl =
                await this.storageService.getDownloadUrl(fileName);
    
            return {
                fileName,
                downloadUrl,
                imageBuffer,
            };
        } catch (error) {
            console.error('Image generation error:', error);
    
            throw new InternalServerErrorException(
                'Failed to generate image',
            );
        }
    }

    private async sendWorkflow(prompt: string): Promise<string> {
        const workflow = this.createWorkflow(prompt);
    
        const response = await firstValueFrom(
            this.httpService.post(
                `${this.comfyUrl}/prompt`,
                { prompt: workflow },
            ),
        );
    
        return response.data.prompt_id;
    }

    private createWorkflow(prompt: string) {
        return {
            '1': {
                inputs: {
                    ckpt_name: 'v1-5-pruned-emaonly.safetensors',
                },
                class_type: 'CheckpointLoaderSimple',
            },
            '3': {
                inputs: {
                    text: prompt,
                    clip: ['1', 1],
                },
                class_type: 'CLIPTextEncode',
            },
            '4': {
                inputs: {
                    text: 'blurry, low quality, distorted, ugly, bad anatomy',
                    clip: ['1', 1],
                },
                class_type: 'CLIPTextEncode',
            },
            '5': {
                inputs: {
                    width: 512,
                    height: 512,
                    batch_size: 1,
                },
                class_type: 'EmptyLatentImage',
            },
            '6': {
                inputs: {
                    samples: ['7', 0],
                    vae: ['1', 2],
                },
                class_type: 'VAEDecode',
            },
            '7': {
                inputs: {
                    seed: Math.floor(Math.random() * 1000000000000000),
                    steps: 20,
                    cfg: 8,
                    sampler_name: 'euler',
                    scheduler: 'simple',
                    denoise: 1,
                    model: ['1', 0],
                    positive: ['3', 0],
                    negative: ['4', 0],
                    latent_image: ['5', 0],
                },
                class_type: 'KSampler',
            },
            '10': {
                inputs: {
                    filename_prefix: 'AIStudio',
                    images: ['6', 0],
                },
                class_type: 'SaveImage',
            },
        };
    }

    private async waitForImage(
        promptId: string,
    ): Promise<ComfyImageInfo> {
        for (let i = 0; i < 120; i++) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
    
            const response = await firstValueFrom(
                this.httpService.get(
                    `${this.comfyUrl}/history/${promptId}`,
                ),
            );
    
            const imageInfo =
                response.data[promptId]?.outputs?.['10']?.images?.[0];
    
            if (imageInfo) {
                return imageInfo;
            }
        }
    
        throw new Error('Image generation timeout');
    }

    private async downloadImage(
        imageInfo: ComfyImageInfo,
    ): Promise<Buffer> {
        const response = await firstValueFrom(
            this.httpService.get(`${this.comfyUrl}/view`, {
                params: {
                    filename: imageInfo.filename,
                    subfolder: imageInfo.subfolder,
                    type: imageInfo.type,
                },
                responseType: 'arraybuffer',
            }),
        );
    
        return Buffer.from(response.data);
    }
}
