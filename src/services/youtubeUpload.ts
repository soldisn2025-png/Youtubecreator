import { google } from "googleapis";
import { Readable } from "stream";
import { decryptSecret } from "@/lib/crypto";

export async function uploadPrivateYoutubeVideo(input: {
  encryptedRefreshToken: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  video: Buffer;
  title: string;
  description: string;
  tags: string[];
}) {
  const oauth2Client = new google.auth.OAuth2(
    input.clientId,
    input.clientSecret,
    input.redirectUri,
  );
  oauth2Client.setCredentials({
    refresh_token: decryptSecret(input.encryptedRefreshToken),
  });
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: input.title,
        description: input.description,
        tags: input.tags.map((tag) => tag.replace(/^#/, "")),
        categoryId: "27",
      },
      status: {
        privacyStatus: "private",
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: Readable.from(input.video),
    },
  });
  return response.data.id;
}
