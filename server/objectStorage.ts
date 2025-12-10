// Object Storage Service for Replit App Storage
// Used for persistent file storage (bank statements, etc.)
import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.OBJECT_STORAGE_BUCKET || "";
    if (!this.bucketName) {
      console.warn("OBJECT_STORAGE_BUCKET not set. Object storage will not work until configured.");
    }
  }

  isConfigured(): boolean {
    return !!this.bucketName;
  }

  // Upload a file buffer to object storage
  async uploadFile(buffer: Buffer, fileName: string, contentType: string = "application/pdf"): Promise<string> {
    if (!this.bucketName) {
      throw new Error(
        "OBJECT_STORAGE_BUCKET not set. Create a bucket in 'Object Storage' " +
          "tool and set OBJECT_STORAGE_BUCKET env var."
      );
    }

    const objectId = randomUUID();
    const objectName = `bank-statements/${objectId}-${fileName}`;

    const bucket = objectStorageClient.bucket(this.bucketName);
    const file = bucket.file(objectName);

    await file.save(buffer, {
      contentType,
      metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });

    return objectName;
  }

  // Get a file from object storage
  async getFile(objectName: string): Promise<File> {
    if (!this.bucketName) {
      throw new ObjectNotFoundError();
    }

    const bucket = objectStorageClient.bucket(this.bucketName);
    const file = bucket.file(objectName);

    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }

    return file;
  }

  // Download a file to the response
  async downloadFile(objectName: string, res: Response): Promise<void> {
    try {
      const file = await this.getFile(objectName);
      const [metadata] = await file.getMetadata();

      res.set({
        "Content-Type": metadata.contentType || "application/pdf",
        "Content-Length": metadata.size?.toString() || "",
        "Cache-Control": "private, max-age=3600",
      });

      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "File not found" });
      } else if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Delete a file from object storage
  async deleteFile(objectName: string): Promise<void> {
    if (!this.bucketName) {
      throw new Error("OBJECT_STORAGE_BUCKET not set.");
    }

    const bucket = objectStorageClient.bucket(this.bucketName);
    const file = bucket.file(objectName);

    await file.delete({ ignoreNotFound: true });
  }

  // Get a signed URL for downloading
  async getSignedDownloadUrl(objectName: string, expiresInMinutes: number = 60): Promise<string> {
    const file = await this.getFile(objectName);

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
  }
}
