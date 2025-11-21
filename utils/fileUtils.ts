
export const getFileSizeFromBase64 = (base64String: string): number => {
  if (!base64String || !base64String.includes(',')) return 0;
  const base64 = base64String.substring(base64String.indexOf(',') + 1);
  const padding = (base64.endsWith('==')) ? 2 : (base64.endsWith('=')) ? 1 : 0;
  return (base64.length * 3 / 4) - padding;
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
