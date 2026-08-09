import env from "../../config/env.js";

import { MediaService } from "./application/media.service.js";
import { LocalMediaProvider } from "./infrastructure/local-media.provider.js";
import { PrismaMediaStore } from "./infrastructure/prisma-media.store.js";
import { S3MediaProvider } from "./infrastructure/s3-media.provider.js";

const store = new PrismaMediaStore();

const provider =
    env.mediaProvider === "s3"
        ? new S3MediaProvider({
              bucket: env.s3Bucket,
              region: env.s3Region,
              publicApiUrl: env.publicApiUrl,
              ...(env.s3Endpoint ? { endpoint: env.s3Endpoint } : {}),
              ...(env.s3AccessKeyId
                  ? { accessKeyId: env.s3AccessKeyId }
                  : {}),
              ...(env.s3SecretAccessKey
                  ? { secretAccessKey: env.s3SecretAccessKey }
                  : {}),
          })
        : new LocalMediaProvider(
              env.mediaLocalRoot,
              env.publicApiUrl,
          );

export const mediaModule = {
    service: new MediaService(store, provider),
};
