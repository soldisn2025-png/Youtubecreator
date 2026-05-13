import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ renderJobId: string }> },
) {
  try {
    await requireUserId();
    const { renderJobId } = await context.params;

    const renderJob = await prisma.renderJob.findFirstOrThrow({ where: { id: renderJobId } });
    if (renderJob.status !== "complete" || !renderJob.outputR2Key) {
      return NextResponse.json({ error: "Video not ready." }, { status: 404 });
    }

    const s3Url = renderJob.outputR2Key;

    // Parse bucket + key from the S3 URL
    // Formats: https://bucket.s3.region.amazonaws.com/key  OR  https://s3.region.amazonaws.com/bucket/key
    let bucket: string, key: string;
    const url = new URL(s3Url);
    if (url.hostname.endsWith(".amazonaws.com") && url.hostname.includes(".s3.")) {
      bucket = url.hostname.split(".s3.")[0];
      key = url.pathname.slice(1);
    } else {
      const parts = url.pathname.slice(1).split("/");
      bucket = parts[0];
      key = parts.slice(1).join("/");
    }

    const region = (process.env.REMOTION_AWS_REGION ?? "us-east-1") as string;
    const s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
      },
    });

    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: 'attachment; filename="video.mp4"',
        ResponseContentType: "video/mp4",
      }),
      { expiresIn: 3600 },
    );

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("Download route error:", error);
    return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });
  }
}
