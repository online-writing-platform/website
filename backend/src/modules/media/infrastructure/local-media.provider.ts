import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

import path from "node:path";

import type {
    MediaStorageProvider,
    StoredObject,
} from "../application/media.ports.js";

function safePath(root: string, objectKey: string): string {
    const fullPath = path.resolve(root, objectKey);

    const normalizedRoot = path.resolve(root) + path.sep;

    if (!fullPath.startsWith(normalizedRoot)) {
        throw new Error("Unsafe media object key.");
    }

    return fullPath;
}

export class LocalMediaProvider implements MediaStorageProvider {
    public readonly provider = "LOCAL" as const;

    public constructor(
        private readonly root: string,
        private readonly publicApiUrl: string,
    ) {}

    public async put(input: {
        assetId: string;
        bytes: Buffer;
        mimeType: string;
        extension: string;
    }): Promise<StoredObject> {
        await mkdir(this.root, {
            recursive: true,
        });

        const objectKey = `covers/${input.assetId}.${input.extension}`;

        const filePath = safePath(this.root, objectKey);

        await mkdir(path.dirname(filePath), {
            recursive: true,
        });

        await writeFile(filePath, input.bytes, {
            flag: "wx",
        });

        return {
            objectKey,

            publicUrl: `${this.publicApiUrl}/api/v1/media/public/${input.assetId}`,

            ownerUrl: `${this.publicApiUrl}/api/v1/media/owned/${input.assetId}`,
        };
    }

    public async delete(objectKey: string): Promise<void> {
        await rm(safePath(this.root, objectKey), {
            force: true,
        });
    }

    public async read(objectKey: string): Promise<Buffer | null> {
        try {
            return await readFile(safePath(this.root, objectKey));
        } catch (error) {
            const code =
                typeof error === "object" && error !== null && "code" in error
                    ? String(error.code)
                    : "";

            if (code === "ENOENT") {
                return null;
            }

            throw error;
        }
    }
}
