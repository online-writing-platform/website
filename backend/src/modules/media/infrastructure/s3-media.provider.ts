import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";

import type {
    MediaStorageProvider,
    StoredObject,
} from "../application/media.ports.js";

export class S3MediaProvider implements MediaStorageProvider {
    public readonly provider = "S3" as const;

    private readonly client: S3Client;

    public constructor(
        private readonly config: {
            bucket: string;
            region: string;
            endpoint?: string;
            publicApiUrl: string;
            accessKeyId?: string;
            secretAccessKey?: string;
        },
    ) {
        this.client = new S3Client({
            region: config.region,

            ...(config.endpoint
                ? {
                      endpoint: config.endpoint,

                      forcePathStyle: true,
                  }
                : {}),

            ...(config.accessKeyId && config.secretAccessKey
                ? {
                      credentials: {
                          accessKeyId: config.accessKeyId,

                          secretAccessKey: config.secretAccessKey,
                      },
                  }
                : {}),
        });
    }

    public async put(input: {
        assetId: string;
        bytes: Buffer;
        mimeType: string;
        extension: string;
    }): Promise<StoredObject> {
        const objectKey = `covers/${input.assetId}.${input.extension}`;

        await this.client.send(
            new PutObjectCommand({
                Bucket: this.config.bucket,

                Key: objectKey,

                Body: input.bytes,

                ContentType: input.mimeType,

                CacheControl: "public, max-age=31536000, immutable",
            }),
        );

        return {
            objectKey,

            publicUrl: `${this.config.publicApiUrl}/api/v1/media/public/${input.assetId}`,

            ownerUrl: `${this.config.publicApiUrl}/api/v1/media/owned/${input.assetId}`,
        };
    }

    public async delete(objectKey: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.config.bucket,

                Key: objectKey,
            }),
        );
    }

    public async read(objectKey: string): Promise<Buffer | null> {
        try {
            const result = await this.client.send(
                new GetObjectCommand({
                    Bucket: this.config.bucket,

                    Key: objectKey,
                }),
            );

            if (!result.Body) {
                return null;
            }

            const bytes = await result.Body.transformToByteArray();

            return Buffer.from(bytes);
        } catch (error) {
            const name =
                typeof error === "object" && error !== null && "name" in error
                    ? String(error.name)
                    : "";

            if (name === "NoSuchKey" || name === "NotFound") {
                return null;
            }

            throw error;
        }
    }
}
