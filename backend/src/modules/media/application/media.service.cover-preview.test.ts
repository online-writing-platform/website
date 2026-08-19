import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import type { MediaStorageProvider, MediaStore } from "./media.ports.js";

import { MediaService } from "./media.service.js";

void test("uploading a cover for a draft story must return a URL usable for owner preview", async () => {
    const ownerId = "11111111-1111-4111-8111-111111111111";

    const storyId = "22222222-2222-4222-8222-222222222222";

    const pngBytes = await sharp({
        create: {
            width: 800,
            height: 1200,
            channels: 3,
            background: {
                r: 255,
                g: 255,
                b: 255,
            },
        },
    })
        .png()
        .toBuffer();

    let storedAssetId = "";

    const store: MediaStore = {
        findOwnedStory: (receivedOwnerId, receivedStoryId) => {
            assert.equal(receivedOwnerId, ownerId);

            assert.equal(receivedStoryId, storyId);

            return Promise.resolve({
                id: storyId,

                coverAssetId: null,
            });
        },

        attachStoryCover: (input) => {
            storedAssetId = input.assetId;

            return Promise.resolve({
                publicUrl: input.publicUrl,

                previousAsset: null,
            });
        },

        findPublicAsset: () => Promise.resolve(null),

        findOwnedAsset: (receivedOwnerId, receivedAssetId) => {
            assert.equal(receivedOwnerId, ownerId);

            assert.equal(receivedAssetId, storedAssetId);

            return Promise.resolve({
                provider: "LOCAL",

                objectKey: `covers/${receivedAssetId}.png`,

                mimeType: "image/png",
            });
        },
    };

    const provider: MediaStorageProvider = {
        provider: "LOCAL",

        put: (input) => {
            storedAssetId = input.assetId;

            return Promise.resolve({
                objectKey: `covers/${input.assetId}.png`,

                publicUrl: `http://localhost:3000/api/v1/media/public/${input.assetId}`,

                ownerUrl: `http://localhost:3000/api/v1/media/owned/${input.assetId}`,
            });
        },

        delete: () => Promise.resolve(),

        read: () => Promise.resolve(pngBytes),
    };

    const service = new MediaService(store, provider);

    const uploaded = await service.uploadStoryCover(ownerId, storyId, pngBytes);

    assert.equal(uploaded.assetId, storedAssetId);

    assert.ok(uploaded.url.length > 0, "Upload must return a cover URL.");

    assert.equal(
        uploaded.url.includes("/api/v1/media/public/"),
        false,
        "A draft cover upload must not return the public-only media URL as the author's preview URL.",
    );

    assert.equal(
        uploaded.url.includes("/api/v1/media/owned/"),
        true,
        "A draft cover upload must return the authenticated owner media URL.",
    );
});
