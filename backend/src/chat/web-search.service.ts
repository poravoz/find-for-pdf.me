
import {
    Injectable,
    InternalServerErrorException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { tavily } from '@tavily/core';

@Injectable()
export class WebSearchService {
    private readonly logger = new Logger(WebSearchService.name);
    private readonly tavilyClient;

    constructor(
        private readonly configService: ConfigService,
    ) {
        this.tavilyClient = tavily({
            apiKey: this.configService.getOrThrow<string>(
                'TAVILY_API_KEY',
            ),
        });
    }

    async search(query: string) {
        const searchQuery = query?.trim();

        if (!searchQuery) {
            throw new BadRequestException(
                'Search query cannot be empty',
            );
        }

        if (searchQuery.length > 1500) {
            throw new BadRequestException(
                'Search query exceeds the maximum length',
            );
        }

        try {
            this.logger.log(`Searching Tavily: ${searchQuery}`);

            const response = await this.tavilyClient.search(
                searchQuery,
                {
                    searchDepth: 'basic',
                    maxResults: 5,
                },
            );

            this.logger.log(
                `Tavily returned ${response.results.length} results`,
            );

            return response.results.map((result) => ({
                title: result.title,
                url: result.url,
                content: result.content,
            }));
        } catch (error) {
            this.logger.error(
                'Tavily search failed',
                error instanceof Error
                    ? error.stack
                    : String(error),
            );

            throw new InternalServerErrorException(
                'Failed to search the web',
            );
        }
    }
}
