// Object Storage Service for Replit App Storage
// Uses Replit's sidecar API for bucket access
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

// Sign a URL using the Replit sidecar
async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to sign object URL (${response.status}): ${errorText}`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
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

// The object storage service
export class ObjectStorageService {
  private privateObjectDir: string;

  constructor() {
    this.privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "";
    
    // Backwards compatibility
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

  private getBucketAndPath(): { bucketName: string; basePath: string } {
    const { bucketName, objectName } = parseObjectPath(this.privateObjectDir);
    return { bucketName, basePath: objectName };
  }

  // Upload a file buffer to object storage using signed URL
  async uploadFile(buffer: Buffer, fileName: string, contentType: string = "application/pdf"): Promise<string> {
    if (!this.privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var (format: /bucket-name)."
      );
    }

    const { bucketName, basePath } = this.getBucketAndPath();
    const objectId = randomUUID();
    
    const pathPrefix = basePath ? `${basePath}/` : "";
    const objectName = `${pathPrefix}bank-statements/${objectId}-${fileName}`;

    // Get a signed URL for uploading
    const signedUrl = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 300, // 5 minutes
    });

    // Upload the file using the signed URL
    const uploadResponse = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed (${uploadResponse.status}): ${errorText}`);
    }

    // Return full path for storage reference
    return `/${bucketName}/${objectName}`;
  }

  // Get a file from object storage
  async getFile(objectPath: string): Promise<File> {
    if (!this.privateObjectDir) {
      throw new ObjectNotFoundError();
    }

    let bucketName: string;
    let objectName: string;

    if (objectPath.startsWith("/")) {
      const parsed = parseObjectPath(objectPath);
      bucketName = parsed.bucketName;
      objectName = parsed.objectName;
    } else {
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

  // Download a file to the response using signed URL
  async downloadFile(objectPath: string, res: Response): Promise<void> {
    try {
      let bucketName: string;
      let objectName: string;

      if (objectPath.startsWith("/")) {
        const parsed = parseObjectPath(objectPath);
        bucketName = parsed.bucketName;
        objectName = parsed.objectName;
      } else {
        const { bucketName: defaultBucket } = this.getBucketAndPath();
        bucketName = defaultBucket;
        objectName = objectPath;
      }

      // Get a signed URL for downloading
      const signedUrl = await signObjectURL({
        bucketName,
        objectName,
        method: "GET",
        ttlSec: 3600, // 1 hour
      });

      // Fetch the file and pipe to response
      const fileResponse = await fetch(signedUrl);
      
      if (!fileResponse.ok) {
        if (fileResponse.status === 404) {
          res.status(404).json({ error: "File not found" });
          return;
        }
        throw new Error(`Failed to download: ${fileResponse.status}`);
      }

      res.set({
        "Content-Type": fileResponse.headers.get("content-type") || "application/pdf",
        "Content-Length": fileResponse.headers.get("content-length") || "",
        "Cache-Control": "private, max-age=3600",
      });

      // Stream the response body
      const reader = fileResponse.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };

      await pump();
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

    let bucketName: string;
    let objectName: string;

    if (objectPath.startsWith("/")) {
      const parsed = parseObjectPath(objectPath);
      bucketName = parsed.bucketName;
      objectName = parsed.objectName;
    } else {
      const { bucketName: defaultBucket } = this.getBucketAndPath();
      bucketName = defaultBucket;
      objectName = objectPath;
    }

    const signedUrl = await signObjectURL({
      bucketName,
      objectName,
      method: "DELETE",
      ttlSec: 300,
    });

    await fetch(signedUrl, { method: "DELETE" });
  }

  // Get a signed URL for downloading
  async getSignedDownloadUrl(objectPath: string, expiresInMinutes: number = 60): Promise<string> {
    let bucketName: string;
    let objectName: string;

    if (objectPath.startsWith("/")) {
      const parsed = parseObjectPath(objectPath);
      bucketName = parsed.bucketName;
      objectName = parsed.objectName;
    } else {
      const { bucketName: defaultBucket } = this.getBucketAndPath();
      bucketName = defaultBucket;
      objectName = objectPath;
    }

    return signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec: expiresInMinutes * 60,
    });
  }
}
