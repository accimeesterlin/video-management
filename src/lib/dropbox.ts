import { Dropbox } from "dropbox";

export class DropboxService {
  private dbx: Dropbox;

  constructor() {
    this.dbx = new Dropbox({
      accessToken: process.env.DROPBOX_ACCESS_TOKEN,
      clientId: process.env.DROPBOX_CLIENT_ID,
      clientSecret: process.env.DROPBOX_CLIENT_SECRET,
    });
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, path: string = "/") {
    try {
      const fullPath = path.endsWith("/")
        ? `${path}${fileName}`
        : `${path}/${fileName}`;

      const response = await this.dbx.filesUpload({
        path: fullPath,
        contents: fileBuffer,
        mode: { ".tag": "add" },
        autorename: true,
      });

      return {
        id: response.result.id,
        name: response.result.name,
        path: response.result.path_lower,
        size: response.result.size,
        server_modified: response.result.server_modified,
      };
    } catch (error) {
      console.error("Error uploading file to Dropbox:", error);
      throw error;
    }
  }

  async listFiles(path: string = "") {
    try {
      const response = await this.dbx.filesListFolder({
        path: path,
        recursive: false,
        include_media_info: true,
        include_deleted: false,
      });

      return response.result.entries.map((entry: any) => ({
        id: entry.id || entry.path_lower,
        name: entry.name,
        path: entry.path_lower,
        type: entry[".tag"],
        size: entry.size,
        modified: entry.server_modified,
        isFolder: entry[".tag"] === "folder",
      }));
    } catch (error) {
      console.error("Error listing files from Dropbox:", error);
      throw error;
    }
  }

  async createFolder(folderName: string, path: string = "/") {
    try {
      const fullPath = path.endsWith("/")
        ? `${path}${folderName}`
        : `${path}/${folderName}`;

      const response = await this.dbx.filesCreateFolderV2({
        path: fullPath,
        autorename: true,
      });

      return {
        id: response.result.metadata.id,
        name: response.result.metadata.name,
        path: response.result.metadata.path_lower,
      };
    } catch (error) {
      console.error("Error creating folder in Dropbox:", error);
      throw error;
    }
  }

  async shareFile(path: string) {
    try {
      const response = await this.dbx.sharingCreateSharedLinkWithSettings({
        path: path,
        settings: {
          requested_visibility: { ".tag": "public" },
          audience: { ".tag": "public" },
          access: { ".tag": "viewer" },
        },
      });

      return {
        url: response.result.url,
        previewUrl: response.result.url.replace("?dl=0", "?raw=1"),
        directUrl: response.result.url
          .replace("dropbox.com", "dl.dropboxusercontent.com")
          .replace("?dl=0", ""),
      };
    } catch (error) {
      console.error("Error sharing file on Dropbox:", error);
      throw error;
    }
  }

  async deleteFile(path: string) {
    try {
      await this.dbx.filesDeleteV2({
        path: path,
      });
      return true;
    } catch (error) {
      console.error("Error deleting file from Dropbox:", error);
      throw error;
    }
  }

  async downloadFile(path: string) {
    try {
      const response = await this.dbx.filesDownload({
        path: path,
      });

      return {
        buffer: (response.result as any).fileBinary,
        metadata: {
          name: response.result.name,
          size: response.result.size,
          modified: response.result.server_modified,
        },
      };
    } catch (error) {
      console.error("Error downloading file from Dropbox:", error);
      throw error;
    }
  }

  async getFileMetadata(path: string) {
    try {
      const response = await this.dbx.filesGetMetadata({
        path: path,
        include_media_info: true,
      });

      return {
        id: "id" in response.result ? response.result.id : "",
        name: response.result.name,
        path: response.result.path_lower,
        size: "size" in response.result ? response.result.size : 0,
        modified:
          "server_modified" in response.result
            ? response.result.server_modified
            : "",
        type: response.result[".tag"],
      };
    } catch (error) {
      console.error("Error getting file metadata from Dropbox:", error);
      throw error;
    }
  }

  async moveFile(fromPath: string, toPath: string) {
    try {
      const response = await this.dbx.filesMoveV2({
        from_path: fromPath,
        to_path: toPath,
        autorename: true,
      });

      return {
        id: "id" in response.result.metadata ? response.result.metadata.id : "",
        name: response.result.metadata.name,
        path: response.result.metadata.path_lower,
      };
    } catch (error) {
      console.error("Error moving file in Dropbox:", error);
      throw error;
    }
  }

  async copyFile(fromPath: string, toPath: string) {
    try {
      const response = await this.dbx.filesCopyV2({
        from_path: fromPath,
        to_path: toPath,
        autorename: true,
      });

      return {
        id: "id" in response.result.metadata ? response.result.metadata.id : "",
        name: response.result.metadata.name,
        path: response.result.metadata.path_lower,
      };
    } catch (error) {
      console.error("Error copying file in Dropbox:", error);
      throw error;
    }
  }
}

export const dropboxService = new DropboxService();
