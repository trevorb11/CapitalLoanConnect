// Object Storage Service for Replit App Storage
// Uses the official @replit/object-storage package with base64 encoding for binary files
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
  // Uses base64 encoding since uploadFromBytes has issues with binary data
  async uploadFile(buffer: Buffer, fileName: string, _contentType: string = "application/pdf"): Promise<string> {
    const objectId = randomUUID();
    const objectName = `bank-statements/${objectId}-${fileName}`;

    // Encode buffer as base64 for storage (uploadFromBytes has issues with binary data)
    const base64Content = buffer.toString("base64");
    
    // Upload as text (base64 encoded)
    const result = await this.client.uploadFromText(objectName, base64Content);

    if (!result.ok) {
      throw new Error(`Upload failed: ${result.error?.message || "Unknown error"}`);
    }

    console.log(`[OBJECT STORAGE] Uploaded ${objectName} (${buffer.length} bytes, ${base64Content.length} base64 chars)`);
    return objectName;
  }

  // Check if a file exists
  async fileExists(objectName: string): Promise<boolean> {
    const result = await this.client.exists(objectName);
    return result.ok && result.value === true;
  }

  // Download a file to the response
  async downloadFile(objectName: string, res: Response, originalFileName?: string): Promise<void> {
    try {
      // Check if file exists first
      const exists = await this.fileExists(objectName);
      if (!exists) {
        if (!res.headersSent) {
          res.status(404).json({ error: "File not found" });
        }
        return;
      }

      // Download as text (base64 encoded)
      const result = await this.client.downloadAsText(objectName);
      
      if (!result.ok) {
        throw new Error(`Download failed: ${result.error?.message || "Unknown error"}`);
      }

      // Decode from base64 back to binary
      const binaryBuffer = Buffer.from(result.value, "base64");

      // Set all headers at once
      const filename = originalFileName || objectName.split("/").pop() || "document.pdf";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", binaryBuffer.length.toString());
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Cache-Control", "private, max-age=3600");

      // Send the binary buffer and end
      res.end(binaryBuffer);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Get file buffer (for creating archives)
  async getFileBuffer(objectName: string): Promise<Buffer> {
    const exists = await this.fileExists(objectName);
    if (!exists) {
      throw new ObjectNotFoundError();
    }

    const result = await this.client.downloadAsText(objectName);
    if (!result.ok) {
      throw new Error(`Download failed: ${result.error?.message || "Unknown error"}`);
    }

    // Decode from base64 back to binary
    return Buffer.from(result.value, "base64");
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
