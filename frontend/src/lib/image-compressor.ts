/**
 * Compresses an image file using Canvas API
 * @param file - The image file to compress
 * @param maxWidth - Maximum width of the output image (default: 1200px)
 * @param maxHeight - Maximum height of the output image (default: 1200px)
 * @param quality - JPEG quality from 0 to 1 (default: 0.8)
 * @returns Promise<string> - Base64 encoded compressed image
 */
export async function compressImage(
  file: File | Blob,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression
        // Use JPEG for photos (better compression), PNG for transparency
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(mimeType, quality);
        
        // Log compression stats
        const originalSize = (event.target?.result as string).length;
        const compressedSize = compressedBase64.length;
        const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        console.log(
          `Image compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${savings}% smaller)`
        );
        
        resolve(compressedBase64);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image from a base64 string
 */
export async function compressBase64Image(
  base64: string,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<string> {
  // Convert base64 to blob
  const response = await fetch(base64);
  const blob = await response.blob();
  
  return compressImage(blob, maxWidth, maxHeight, quality);
}

/**
 * Compresses an image and returns a Blob for uploading
 */
export async function compressImageToBlob(
  file: File | Blob,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to Blob
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Log compression stats
              const originalSize = file.size;
              const compressedSize = blob.size;
              const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);
              console.log(
                `Image compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${savings}% smaller)`
              );
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          mimeType,
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

