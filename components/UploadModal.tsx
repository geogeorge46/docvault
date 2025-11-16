import React, { useState, useCallback, ChangeEvent } from 'react';
import { Document, DocumentVersion } from '../types';
import { XIcon } from './icons/XIcon';
import { FileIcon } from './icons/FileIcon';
import { useTranslation } from '../hooks/useTranslation';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDocument: (name: string, version: Omit<DocumentVersion, 'versionId' | 'uploadedAt'>) => void;
  onAddVersion: (docId: string, version: Omit<DocumentVersion, 'versionId' | 'uploadedAt'>) => void;
  documentToUpdate: Document | null;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onAddDocument, onAddVersion, documentToUpdate }) => {
  const [docName, setDocName] = useState(documentToUpdate?.name || '');
  const [versionNotes, setVersionNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useTranslation();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Necessary to allow drop
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        setFile(e.dataTransfer.files[0]);
        setError(null);
    }
  };

  const handleSubmit = useCallback(() => {
    if (!file) {
      setError(t('uploadModal.errorNoFile'));
      return;
    }
    if (!documentToUpdate && !docName.trim()) {
        setError(t('uploadModal.errorNoName'));
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileDataUrl = e.target?.result as string;
      if (!fileDataUrl) {
          setError(t('uploadModal.errorReadFile'));
          return;
      }
      const newVersionData = {
          fileDataUrl,
          fileName: file.name,
          fileType: file.type,
          versionNotes: versionNotes.trim(),
      };

      if (documentToUpdate) {
        onAddVersion(documentToUpdate.id, newVersionData);
      } else {
        onAddDocument(docName.trim(), newVersionData);
      }
      onClose();
    };
    reader.onerror = () => {
        setError(t('uploadModal.errorReadingFile'));
    };
    reader.readAsDataURL(file);
  }, [file, docName, versionNotes, documentToUpdate, onAddDocument, onAddVersion, onClose, t]);
  
  if (!isOpen) return null;
  
  const dropzoneBaseClasses = "mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors duration-200";
  const dropzoneInactiveClasses = "border-slate-300 dark:border-slate-600";
  const dropzoneActiveClasses = "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold">{documentToUpdate ? t('uploadModal.titleUpdate', { docName: documentToUpdate.name }) : t('uploadModal.titleNew')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><XIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          {!documentToUpdate && (
            <div>
              <label htmlFor="docName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('uploadModal.docNameLabel')}</label>
              <input 
                id="docName" 
                type="text" 
                value={docName} 
                onChange={e => setDocName(e.target.value)} 
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={t('uploadModal.docNamePlaceholder')}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('uploadModal.uploadFileLabel')}</label>
            <div 
              className={`${dropzoneBaseClasses} ${isDragging ? dropzoneActiveClasses : dropzoneInactiveClasses}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="space-y-1 text-center">
                <FileIcon className="mx-auto h-12 w-12 text-slate-400" />
                <div className="flex text-sm text-slate-600 dark:text-slate-400">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-slate-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span>{file ? t('uploadModal.changeFile') : t('uploadModal.uploadFile')}</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                  </label>
                  {!file && <p className="pl-1">{t('uploadModal.dragAndDrop')}</p>}
                </div>
                {file ? (
                    <p className="text-sm text-slate-500">{file.name}</p>
                ) : (
                    <p className="text-xs text-slate-500">{t('uploadModal.fileTypes')}</p>
                )}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="versionNotes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('uploadModal.versionNotesLabel')}</label>
            <textarea
              id="versionNotes"
              rows={3}
              value={versionNotes}
              onChange={e => setVersionNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={t('uploadModal.versionNotesPlaceholder')}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">{t('uploadModal.cancel')}</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:ring-offset-slate-800 transition-colors">{t('uploadModal.save')}</button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
