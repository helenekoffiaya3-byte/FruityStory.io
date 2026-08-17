import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const videos = getStore({ name: "fruitystory-videos", consistency: "strong" });

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const key = event.queryStringParameters?.key?.trim();
  if (!key || !key.startsWith("videos/")) return { statusCode: 400, body: "Invalid video key" };

  const data = await videos.get(key, { type: "arrayBuffer" });
  if (!data) return { statusCode: 404, body: "Video not found" };

  return {
    statusCode: 200,
    isBase64Encoded: true,
    headers: {
      "Content-Type": "video/mp4",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    },
    body: Buffer.from(data).toString("base64"),
  };
};
