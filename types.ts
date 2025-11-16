

export interface DocumentVersion {
  versionId: string;
  fileDataUrl: string;
  fileName: string;
  fileType: string;
  uploadedAt: string; // ISO string date
  versionNotes: string;
}

export interface Document {
  id: string;
  name: string;
  createdAt: string; // ISO string date
  versions: DocumentVersion[];
  folderId?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string; // ISO string date
}