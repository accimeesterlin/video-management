import { google, drive_v3, Auth } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
];

export class GoogleDriveService {
  private auth: Auth.GoogleAuth;
  private drive: drive_v3.Drive;

  constructor() {
    this.auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
      scopes: SCOPES,
    });
    this.drive = google.drive({ version: "v3", auth: this.auth });
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderId?: string
  ) {
    try {
      const fileMetadata: drive_v3.Schema$File = {
        name: fileName,
      };

      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const media = {
        mimeType: mimeType,
        body: Buffer.from(fileBuffer),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id,name,webViewLink,webContentLink",
      });

      return response.data;
    } catch (error) {
      console.error("Error uploading file to Google Drive:", error);
      throw error;
    }
  }

  async createFolder(folderName: string, parentFolderId?: string) {
    try {
      const fileMetadata: drive_v3.Schema$File = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: "id,name,webViewLink",
      });

      return response.data;
    } catch (error) {
      console.error("Error creating folder in Google Drive:", error);
      throw error;
    }
  }

  async listFiles(folderId?: string) {
    try {
      const query = folderId ? `'${folderId}' in parents` : "";

      const response = await this.drive.files.list({
        q: query,
        fields:
          "nextPageToken, files(id, name, mimeType, size, createdTime, webViewLink)",
        orderBy: "createdTime desc",
      });

      return response.data.files;
    } catch (error) {
      console.error("Error listing files from Google Drive:", error);
      throw error;
    }
  }

  async listVideoFiles(folderId?: string) {
    try {
      const videoMimeTypes = [
        "video/mp4",
        "video/avi",
        "video/mov",
        "video/wmv",
        "video/flv",
        "video/webm",
        "video/quicktime",
      ];

      const mimeTypeQuery = videoMimeTypes
        .map((type) => `mimeType='${type}'`)
        .join(" or ");
      const folderQuery = folderId ? `'${folderId}' in parents and ` : "";
      const query = `${folderQuery}(${mimeTypeQuery})`;

      const response = await this.drive.files.list({
        q: query,
        fields:
          "nextPageToken, files(id, name, mimeType, size, createdTime, webViewLink, thumbnailLink)",
        orderBy: "createdTime desc",
        pageSize: 50,
      });

      return response.data.files;
    } catch (error) {
      console.error("Error listing video files from Google Drive:", error);
      throw error;
    }
  }

  async downloadFile(fileId: string) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: "media",
      });

      return response.data;
    } catch (error) {
      console.error("Error downloading file from Google Drive:", error);
      throw error;
    }
  }

  async importVideoToS3(fileId: string, s3UploadUrl: string) {
    try {
      // Download file from Google Drive
      const fileData = await this.downloadFile(fileId);

      // Convert file data to Buffer for S3 upload
      const buffer = Buffer.from(fileData as any);

      // Upload to S3
      const s3Response = await fetch(s3UploadUrl, {
        method: "PUT",
        body: buffer,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });

      if (!s3Response.ok) {
        throw new Error(`S3 upload failed: ${s3Response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Error importing video from Google Drive to S3:", error);
      throw error;
    }
  }

  async shareFile(
    fileId: string,
    email: string,
    role: "reader" | "writer" | "commenter" = "reader"
  ) {
    try {
      const response = await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: role,
          type: "user",
          emailAddress: email,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error sharing file on Google Drive:", error);
      throw error;
    }
  }

  async deleteFile(fileId: string) {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
      return true;
    } catch (error) {
      console.error("Error deleting file from Google Drive:", error);
      throw error;
    }
  }

  async getFileMetadata(fileId: string) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields:
          "id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink",
      });

      return response.data;
    } catch (error) {
      console.error("Error getting file metadata from Google Drive:", error);
      throw error;
    }
  }
}

export const googleDriveService = new GoogleDriveService();
