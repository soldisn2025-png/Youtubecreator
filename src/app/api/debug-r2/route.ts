import { NextResponse } from "next/server";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { createUploadUrl } from "@/services/storage";
import { requiredEnv } from "@/lib/config";

// Temporary diagnostic endpoint — remove after fixing upload
export async function GET() {
  const results: Record<string, unknown> = {
    env: {
      R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID ? "set" : "MISSING",
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID
        ? process.env.R2_ACCESS_KEY_ID.slice(0, 6) + "..."
        : "MISSING",
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? "set" : "MISSING",
      R2_BUCKET: process.env.R2_BUCKET ?? "MISSING",
    },
  };

  // Test 1: Can we reach the bucket with these credentials?
  try {
    const { S3Client } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${requiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
      },
      requestChecksumCalculation: "WHEN_REQUIRED" as never,
      responseChecksumValidation: "WHEN_REQUIRED" as never,
    });
    await client.send(new HeadBucketCommand({ Bucket: requiredEnv("R2_BUCKET") }));
    results.credentialTest = "PASS — credentials are valid";
  } catch (e: unknown) {
    results.credentialTest =
      "FAIL — " + (e instanceof Error ? e.message : String(e));
  }

  // Test 2: Generate a presigned URL and inspect it for checksum params
  try {
    const url = await createUploadUrl({ key: "debug-test.txt", contentType: "text/plain" });
    const hasChecksum =
      url.includes("x-amz-checksum") || url.includes("x-amz-sdk-checksum");
    results.presignedUrl = {
      checksumParamsPresent: hasChecksum,
      verdict: hasChecksum
        ? "BAD — checksum params still in URL (R2 will reject)"
        : "GOOD — no checksum params",
      urlPreview: url.slice(0, 120) + "...",
    };
  } catch (e: unknown) {
    results.presignedUrl =
      "FAIL — could not generate URL: " + (e instanceof Error ? e.message : String(e));
  }

  return NextResponse.json(results, { status: 200 });
}
