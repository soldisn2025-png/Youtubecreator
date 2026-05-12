import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { optionalEnv, requiredEnv } from "@/lib/config";

let client: S3Client | undefined;

function r2Client(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${requiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export async function uploadObject(input: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
}) {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: requiredEnv("R2_BUCKET"),
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );
  const baseUrl = optionalEnv("R2_PUBLIC_BASE_URL");
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/${input.key}` : input.key;
}

export async function downloadObject(key: string): Promise<Buffer> {
  const result = await r2Client().send(
    new GetObjectCommand({ Bucket: requiredEnv("R2_BUCKET"), Key: key }),
  );
  const stream = result.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
