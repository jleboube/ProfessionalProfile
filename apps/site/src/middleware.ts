import type { MiddlewareHandler } from 'astro';
import fs from 'fs/promises';
import path from 'path';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);
  
  // Serve uploaded images
  if (url.pathname.startsWith('/uploads/')) {
    const filename = url.pathname.replace('/uploads/', '');
    const filepath = path.join('/uploads', filename);
    
    try {
      const file = await fs.readFile(filepath);
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.webp') contentType = 'image/webp';
      
      return new Response(file, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    } catch {
      // File not found, continue with normal routing
    }
  }
  
  return next();
};