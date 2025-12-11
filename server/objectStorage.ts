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

// Parse object path in format /<bucket_name>/<object_path>
function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/").filter(p => p.length > 0);
  if (pathParts.length < 1) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[0];
  const objectName = pathParts.slice(1).join("/");

  return { bucketName, objectName };
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  private privateObjectDir: string;

  constructor() {
    // Use PRIVATE_OBJECT_DIR for the new pattern, fallback to OBJECT_STORAGE_BUCKET for backwards compatibility
    this.privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "";
    
    // Backwards compatibility: if PRIVATE_OBJECT_DIR not set, try OBJECT_STORAGE_BUCKET
    if (!this.privateObjectDir && process.env.OBJECT_STORAGE_BUCKET) {
      this.privateObjectDir = `/${process.env.OBJECT_STORAGE_BUCKET}`;
    }
    
    if (!this.privateObjectDir) {
      console.warn("PRIVATE_OBJECT_DIR not set. Object storage will not work until configured.");
    }
  }

  isConfigured(): boolean {
    return !!this.privateObjectDir;
  }

  // Get bucket name and base path from privateObjectDir
  private getBucketAndPath(): { bucketName: string; basePath: string } {
    const { bucketName, objectName } = parseObjectPath(this.privateObjectDir);
    return { bucketName, basePath: objectName };
  }

  // Upload a file buffer to object storage
  async uploadFile(buffer: Buffer, fileName: string, contentType: string = "application/pdf"): Promise<string> {
    if (!this.privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var (format: /bucket-name)."
      );
    }

    const { bucketName, basePath } = this.getBucketAndPath();
    const objectId = randomUUID();
    
    // Build object path: basePath/bank-statements/uuid-filename
    const pathPrefix = basePath ? `${basePath}/` : "";
    const objectName = `${pathPrefix}bank-statements/${objectId}-${fileName}`;

    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    await file.save(buffer, {
      contentType,
      metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Return full path for storage reference
    return `/${bucketName}/${objectName}`;
  }

  // Get a file from object storage
  async getFile(objectPath: string): Promise<File> {
    if (!this.privateObjectDir) {
      throw new ObjectNotFoundError();
    }

    // Handle both old format (just object name) and new format (full path)
    let bucketName: string;
    let objectName: string;

    if (objectPath.startsWith("/")) {
      // New format: /bucket-name/path/to/file
      const parsed = parseObjectPath(objectPath);
      bucketName = parsed.bucketName;
      objectName = parsed.objectName;
    } else {
      // Old format: just the object path, use bucket from privateObjectDir
      const { bucketName: defaultBucket } = this.getBucketAndPath();
      bucketName = defaultBucket;
      objectName = objectPath;
    }

    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }

    return file;
  }

  // Download a file to the response
  async downloadFile(objectPath: string, res: Response): Promise<void> {
    try {
      const file = await this.getFile(objectPath);
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
  async deleteFile(objectPath: string): Promise<void> {
    if (!this.privateObjectDir) {
      throw new Error("PRIVATE_OBJECT_DIR not set.");
    }

    const file = await this.getFile(objectPath);
    await file.delete({ ignoreNotFound: true });
  }

  // Get a signed URL for downloading
  async getSignedDownloadUrl(objectPath: string, expiresInMinutes: number = 60): Promise<string> {
    const file = await this.getFile(objectPath);

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
  }
}
