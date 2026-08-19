export interface StoredObject {
    objectKey: string;
    publicUrl: string;
    ownerUrl: string;
}

export interface MediaStorageProvider {
    readonly provider: "LOCAL" | "S3";

    put(input: {
        assetId: string;
        bytes: Buffer;
        mimeType: string;
        extension: string;
    }): Promise<StoredObject>;

    delete(objectKey: string): Promise<void>;

    read?(objectKey: string): Promise<Buffer | null>;
}

export interface MediaStore {
    findOwnedStory(
        ownerId: string,
        storyId: string,
    ): Promise<{
        id: string;
        coverAssetId: string | null;
    } | null>;

    attachStoryCover(input: {
        assetId: string;
        ownerId: string;
        storyId: string;
        provider: "LOCAL" | "S3";
        objectKey: string;
        publicUrl: string;
        mimeType: string;
        byteSize: number;
        width: number;
        height: number;
    }): Promise<{
        publicUrl: string;

        previousAsset: {
            id: string;
            provider: "LOCAL" | "S3";
            objectKey: string;
        } | null;
    }>;

    findPublicAsset(assetId: string): Promise<{
        provider: "LOCAL" | "S3";
        objectKey: string;
        mimeType: string;
    } | null>;

    findOwnedAsset(
        ownerId: string,
        assetId: string,
    ): Promise<{
        provider: "LOCAL" | "S3";
        objectKey: string;
        mimeType: string;
    } | null>;
}
