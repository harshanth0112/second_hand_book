import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

export class ImageService {
  static async uploadImage(buffer, folder = 'book-exchange/listings') {
    if (!env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary is not configured');
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          transformation: [{ width: 800, crop: 'limit' }],
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );
      stream.end(buffer);
    });
  }

  static async deleteImage(publicIdOrUrl) {
    if (!env.CLOUDINARY_CLOUD_NAME) {
      return;
    }

    let publicId = publicIdOrUrl;
    if (publicIdOrUrl.includes('res.cloudinary.com')) {
      const matches = publicIdOrUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
      if (matches && matches[1]) {
        publicId = matches[1];
      }
    }

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error('[ImageService] Failed to delete image from Cloudinary:', err.message);
    }
  }
}

