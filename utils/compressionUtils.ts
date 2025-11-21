
/**
 * Compresses an image file by resizing it and adjusting quality.
 * Returns a Promise that resolves to the Base64 Data URL.
 */
export const compressImage = (file: File, quality = 0.5, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = URL.createObjectURL(file);

        image.onload = () => {
            // Release the object URL
            URL.revokeObjectURL(image.src);

            let width = image.width;
            let height = image.height;

            // Calculate new dimensions while maintaining aspect ratio
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Draw image to canvas
            ctx.drawImage(image, 0, 0, width, height);

            // Convert to Base64 JPEG with specified quality
            // We force JPEG to use the quality parameter effectively.
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
        };

        image.onerror = (error) => {
            URL.revokeObjectURL(image.src);
            reject(error);
        };
    });
};

/**
 * Simple helper to convert a File to Base64 without compression (for PDFs, etc).
 */
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};
