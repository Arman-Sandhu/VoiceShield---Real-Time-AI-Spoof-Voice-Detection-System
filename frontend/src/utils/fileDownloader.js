import { registerPlugin, Capacitor } from '@capacitor/core';

const NativeDownloader = registerPlugin('AndroidDownloader');

export async function downloadFileToDevice(blobOrString, fileName, mimeType = 'application/octet-stream') {
  if (!blobOrString || !fileName) return false;

  const isNative = Capacitor.isNativePlatform() || (typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.());

  if (isNative) {
    try {
      let base64Data = '';
      if (typeof blobOrString === 'string') {
        const bytes = new TextEncoder().encode(blobOrString);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      } else if (blobOrString instanceof Blob) {
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result;
            if (typeof res === 'string') {
              const commaIdx = res.indexOf(',');
              resolve(commaIdx !== -1 ? res.slice(commaIdx + 1) : res);
            } else {
              reject(new Error('FileReader did not return string'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blobOrString);
        });
      }

      if (NativeDownloader?.downloadFile) {
        const res = await NativeDownloader.downloadFile({
          fileName,
          base64Data,
          mimeType
        });
        if (res && res.success) {
          return true;
        }
      } else if (window.Capacitor?.Plugins?.AndroidDownloader?.downloadFile) {
        const res = await window.Capacitor.Plugins.AndroidDownloader.downloadFile({
          fileName,
          base64Data,
          mimeType
        });
        if (res && res.success) {
          return true;
        }
      }
    } catch (err) {
      console.warn('Native Android downloader exception:', err);
    }
  }

  try {
    const blob = typeof blobOrString === 'string'
      ? new Blob([blobOrString], { type: mimeType })
      : blobOrString;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch (err) {
    console.error('Browser file download failed:', err);
    return false;
  }
}

