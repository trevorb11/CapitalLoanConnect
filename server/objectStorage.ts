// Object Storage Service for Replit App Storage
// Uses the official @replit/object-storage package
import { Client } from "@replit/object-storage";
import { Response } from "express";
import { randomUUID } from "crypto";

// Create a singleton client instance
const objectStorageClient = new Client();

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service
export class ObjectStorageService {
  private client: Client;

  constructor() {
    this.client = objectStorageClient;
  }

  isConfigured(): boolean {
    // The @replit/object-storage client is always configured when running on Replit
    return true;
  }

  // Upload a file buffer to object storage
  async uploadFile(buffer: Buffer, fileName: string, _contentType: string = "application/pdf"): Promise<string> {
    const objectId = randomUUID();
    const objectName = `bank-statements/${objectId}-${fileName}`;

    // Upload the buffer as bytes
    const result = await this.client.uploadFromBytes(objectName, buffer);

    if (!result.ok) {
      throw new Error(`Upload failed: ${result.error?.message || "Unknown error"}`);
    }

    return objectName;
  }

  // Check if a file exists
  async fileExists(objectName: string): Promise<boolean> {
    const result = await this.client.exists(objectName);
    return result.ok && result.value === true;
  }

  // Download a file to the response
  async downloadFile(objectName: string, res: Response): Promise<void> {
    try {
      // Check if file exists first
      const exists = await this.fileExists(objectName);
      if (!exists) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      // Download the file as bytes
      const result = await this.client.downloadAsBytes(objectName);
      
      if (!result.ok) {
        throw new Error(`Download failed: ${result.error?.message || "Unknown error"}`);
      }

      // Set headers
      res.set({
        "Content-Type": "application/pdf",
        "Content-Length": result.value.length.toString(),
        "Cache-Control": "private, max-age=3600",
      });

      // Send the buffer
      const buf = result.value as unknown as Uint8Array;
      res.send(Buffer.from(buf));
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
    const result = await this.client.delete(objectName);
    if (!result.ok) {
      console.warn(`Delete failed for ${objectName}: ${result.error?.message}`);
    }
  }

  // Get a download URL (returns object name for use with download endpoint)
  async getSignedDownloadUrl(objectName: string, _expiresInMinutes: number = 60): Promise<string> {
    return objectName;
  }
}
