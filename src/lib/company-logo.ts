export const COMPANY_LOGO_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon";
export const COMPANY_LOGO_MAX_BYTES = 512 * 1024;

export function readLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Please choose an image file (PNG, JPG, WEBP, GIF, or ICO)."));
  }

  if (file.size > COMPANY_LOGO_MAX_BYTES) {
    return Promise.reject(new Error("Logo must be 512 KB or smaller."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read the logo file."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read the logo file."));
    reader.readAsDataURL(file);
  });
}
