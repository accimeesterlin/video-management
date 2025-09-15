// @ts-expect-error - No type declarations available for @vimeo/vimeo
import { Vimeo } from "@vimeo/vimeo";

interface VimeoUploadOptions {
  name: string;
  description?: string;
  privacy?: Record<string, unknown>;
}

interface VimeoRequestOptions {
  method?: string;
  path: string;
  query?: Record<string, unknown>;
}

interface VimeoClient {
  upload: (
    buffer: Buffer,
    options: VimeoUploadOptions,
    onComplete: (uri: string) => void,
    onProgress: (uploaded: number, total: number) => void,
    onError: (error: Error) => void
  ) => void;
  request: (
    options: VimeoRequestOptions | string,
    callback: (error: Error | null, body: unknown) => void
  ) => void;
}

export class VimeoService {
  private client: VimeoClient;

  constructor() {
    this.client = new Vimeo(
      process.env.VIMEO_CLIENT_ID,
      process.env.VIMEO_CLIENT_SECRET,
      process.env.VIMEO_ACCESS_TOKEN
    );
  }

  async uploadVideo(videoBuffer: Buffer, name: string, description?: string) {
    return new Promise((resolve, reject) => {
      this.client.upload(
        videoBuffer,
        {
          name: name,
          description: description || "",
          privacy: {
            view: "anybody",
          },
        },
        (uri: string) => {
          console.log("Upload complete:", uri);
          resolve({
            uri: uri,
            videoId: uri.split("/").pop(),
            embedUrl: `https://player.vimeo.com/video/${uri.split("/").pop()}`,
            viewUrl: `https://vimeo.com/${uri.split("/").pop()}`,
          });
        },
        (bytes_uploaded: number, bytes_total: number) => {
          const percentage = ((bytes_uploaded / bytes_total) * 100).toFixed(2);
          console.log(`Upload progress: ${percentage}%`);
        },
        (error: Error) => {
          console.error("Upload error:", error);
          reject(error);
        }
      );
    });
  }

  async getVideo(videoId: string) {
    return new Promise((resolve, reject) => {
      this.client.request(
        `/videos/${videoId}`,
        (error: Error | null, body: unknown) => {
          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        }
      );
    });
  }

  async updateVideo(
    videoId: string,
    data: {
      name?: string;
      description?: string;
      privacy?: Record<string, unknown>;
    }
  ) {
    return new Promise((resolve, reject) => {
      this.client.request(
        {
          method: "PATCH",
          path: `/videos/${videoId}`,
          query: data,
        },
        (error: Error | null, body: unknown) => {
          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        }
      );
    });
  }

  async deleteVideo(videoId: string) {
    return new Promise((resolve, reject) => {
      this.client.request(
        {
          method: "DELETE",
          path: `/videos/${videoId}`,
        },
        (error: Error | null, body: unknown) => {
          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        }
      );
    });
  }

  async getUserVideos(userId?: string, page = 1, per_page = 25) {
    const path = userId ? `/users/${userId}/videos` : "/me/videos";

    return new Promise((resolve, reject) => {
      this.client.request(
        {
          method: "GET",
          path: path,
          query: {
            page: page,
            per_page: per_page,
            sort: "date",
            direction: "desc",
          },
        },
        (error: Error | null, body: unknown) => {
          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        }
      );
    });
  }

  async createAlbum(name: string, description?: string) {
    return new Promise((resolve, reject) => {
      this.client.request(
        {
          method: "POST",
          path: "/me/albums",
          query: {
            name: name,
            description: description || "",
            sort: "date",
          },
        },
        (error: Error | null, body: unknown) => {
          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        }
      );
    });
  }

  async addVideoToAlbum(albumId: string, videoId: string) {
    return new Promise((resolve, reject) => {
      this.client.request(
        {
          method: "PUT",
          path: `/albums/${albumId}/videos/${videoId}`,
        },
        (error: Error | null, body: unknown) => {
          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        }
      );
    });
  }

  async getEmbedCode(videoId: string, width = 640, height = 360) {
    const video = (await this.getVideo(videoId)) as Record<string, unknown>;

    return {
      iframe: `<iframe src="https://player.vimeo.com/video/${videoId}" width="${width}" height="${height}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`,
      responsive: `<div style="padding:${((height / width) * 100).toFixed(
        2
      )}% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/${videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>`,
      url: `https://player.vimeo.com/video/${videoId}`,
      videoData: video,
    };
  }
}

export const vimeoService = new VimeoService();
