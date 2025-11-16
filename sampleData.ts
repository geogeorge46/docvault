import { Document } from './types';

// 1x1 black pixel JPEG
const sampleImageDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';

// "Hello World!" PDF
const samplePdfDataUrl = 'data:application/pdf;base64,JVBERi0xLjcgCiXi48/TIAoxIDAgb2JqIAo8PCAKL1R5cGUgL0NhdGFsb2cgCi9QYWdlcyAyIDAgUiAKPj4gCmVuZG9iagogMiAwIG9iagggCjw8IAovVHlwZSAvUGFnZXMgCi9LaWRzIFsgMyAwIFIgXSAKL0NvdW50IDEgCi9NZWRpYUJveCBbIDAgMCA1ODkuOTIgODQxLjkyIF0gCj4+IAplbmRvYmoKMyAwIG9iagogCjw8IAovVHlwZSAvUGFnZSAKL1BhcmVudCAyIDAgUiAKL1Jlc291cmNlcyA8PCAKL0ZvbnQgPDwgCi9GMSA0IDAgUiAKPj4gCj4+IAovQ29udGVudHMgNSAwIFIgCj4+IAplbmRvYmoKCjQgMCBvYmoKPDwgCi9UeXBlIC9Gb250IAovU3VidHlwZSAvVHlwZTEgCi9CYXNlRm9udCAvSGVsdmV0aWNhIAo+PiAKZW5kb2JqCjUgMCBvYmoKPDwgCi9MZW5ndGggNDggCj4+IApzdHJlYW0gCkJUCjcwIDc1MCUgdGQgCi9GMSAxMiBUZiAKKEhlbGxvIFdvcmxkISkgVGogCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE5IDAwMDAwIG4gCjAwMDAwMDAwNzkgMDAwMDAgbiAKMDAwMDAwMDE4MyAwMDAwMCBuIAowMDAwMDAwMzE2IDAwMDAwIG4gCjAwMDAwMDA0MDMgMDAwMDAgbiAKdHJhaWxlciAKPDwgCi9TaXplIDYgCi9Sb290IDEgMCBSIAo+PiAKc3RhcnR4cmVmCjQ5MQolJUVPRgo=';

const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);

export const sampleDocuments: Document[] = [
  {
    id: 'sample-doc-1',
    name: 'Sample PDF Document',
    createdAt: yesterday.toISOString(),
    versions: [
      {
        versionId: 'sample-version-1',
        fileDataUrl: samplePdfDataUrl,
        fileName: 'HelloWorld.pdf',
        fileType: 'application/pdf',
        uploadedAt: yesterday.toISOString(),
        versionNotes: 'This is an initial sample PDF document.',
      },
    ],
  },
  {
    id: 'sample-doc-2',
    name: 'Sample Image',
    createdAt: now.toISOString(),
    versions: [
      {
        versionId: 'sample-version-2',
        fileDataUrl: sampleImageDataUrl,
        fileName: 'Pixel.jpg',
        fileType: 'image/jpeg',
        uploadedAt: now.toISOString(),
        versionNotes: 'This is a sample image file.',
      },
    ],
  },
];
