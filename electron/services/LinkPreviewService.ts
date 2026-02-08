import { net } from 'electron';
import { ClipboardItemMetadata } from '../types';

export class LinkPreviewService {
    /**
     * Fetches metadata for a given URL.
     * Returns a partial metadata object (title, image, description).
     * Timeout is short (3s) to avoid hanging.
     */
    static async fetchMetadata(url: string): Promise<Partial<ClipboardItemMetadata>> {
        return new Promise((resolve) => {
            try {
                const request = net.request({
                    url,
                    method: 'GET'
                });

                let data = '';

                request.on('response', (response) => {
                    // Only process HTML responses
                    const contentType = response.headers['content-type'];
                    if (!contentType || !Array.isArray(contentType) || !contentType[0].includes('text/html')) {
                        request.abort();
                        resolve({});
                        return;
                    }

                    response.on('data', (chunk) => {
                        data += chunk.toString();
                        // Stop if we have enough data (e.g. 50KB) to likely contain the <head>
                        if (data.length > 50000) {
                            request.abort();
                            resolve(LinkPreviewService.parseMetadata(data, url));
                        }
                    });

                    response.on('end', () => {
                        resolve(LinkPreviewService.parseMetadata(data, url));
                    });

                    response.on('error', () => resolve({}));
                });

                request.on('error', (err) => {
                    console.warn('[LinkPreview] Request failed:', url, err.message);
                    resolve({});
                });

                // Set timeout
                setTimeout(() => {
                    request.abort();
                    resolve({});
                }, 3000);

                request.end();
            } catch (e) {
                resolve({});
            }
        });
    }

    private static parseMetadata(html: string, url: string): Partial<ClipboardItemMetadata> {
        const metadata: Partial<ClipboardItemMetadata> = {};

        try {
            // Simple regex extraction (cheaper/safer than DOM parser in main process)
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
            const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            const descriptionMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
            const ogDescriptionMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

            metadata.openGraphValues = { // We'll add this to types.ts
                title: ogTitleMatch?.[1] || titleMatch?.[1],
                image: ogImageMatch?.[1],
                description: ogDescriptionMatch?.[1] || descriptionMatch?.[1],
                url: url
            };

        } catch (e) {
            // Ignore
        }

        return metadata;
    }
}
