/**
 * Image Utilities
 * Compress images to base64 for Firestore storage
 */

const ImageUtils = (() => {
  /**
   * Compress image to specified quality
   * @param {File} file - Image file
   * @param {number} maxWidth - Max width in pixels
   * @param {number} maxHeight - Max height in pixels
   * @param {number} quality - Compression quality (0-1)
   * @returns {Promise<string>} Base64 string
   */
  async function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate scaling
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

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Get base64 with compression
          const base64 = canvas.toDataURL('image/jpeg', quality);
          resolve(base64);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Compress image for menu items (smaller size)
   * @param {File} file - Image file
   * @returns {Promise<string>} Base64 string
   */
  async function compressMenuImage(file) {
    return compressImage(file, 600, 600, 0.8);
  }

  /**
   * Compress image for receipts (larger, higher quality)
   * @param {File} file - Image file
   * @returns {Promise<string>} Base64 string
   */
  async function compressReceiptImage(file) {
    return compressImage(file, 1200, 1200, 0.75);
  }

  /**
   * Check if file is valid image
   * @param {File} file - File to check
   * @returns {boolean} True if valid image
   */
  function isValidImage(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    return validTypes.includes(file.type) && file.size < 10 * 1024 * 1024; // Max 10MB
  }

  /**
   * Get human-readable file size
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  return {
    compressImage,
    compressMenuImage,
    compressReceiptImage,
    isValidImage,
    formatFileSize
  };
})();
