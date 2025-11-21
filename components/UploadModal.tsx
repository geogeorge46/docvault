
import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import { Document, DocumentVersion, Folder } from '../types';
import { XIcon } from './icons/XIcon';
import { FileIcon } from './icons/FileIcon';
import { useTranslation } from '../hooks/useTranslation';
import { compressImage, fileToBase64 } from '../utils/compressionUtils';
import { TrashIcon } from './icons/TrashIcon';

// Declare types for external libraries loaded via CDN
declare global {
    interface Window {
        jspdf: any;
        JSZip: any;
    }
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDocument: (name: string, folderId: string | null, version: Omit<DocumentVersion, 'versionId' | 'uploadedAt'>) => void;
  onAddVersion: (docId: string, version: Omit<DocumentVersion, 'versionId' | 'uploadedAt'>) => void;
  documentToUpdate: Document | null;
  folders: Folder[];
  currentFolderId: string | null;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onAddDocument, onAddVersion, documentToUpdate, folders, currentFolderId }) => {
  const [docName, setDocName] = useState('');
  const [versionNotes, setVersionNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
        setDocName(documentToUpdate?.name || '');
        setVersionNotes('');
        setFiles([]);
        setError(null);
        setSelectedFolderId(currentFolderId);
        setIsProcessing(false);
    }
  }, [isOpen, documentToUpdate, currentFolderId]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        setError(null);
    }
  };

  const removeFile = (index: number) => {
      setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateBasic = () => {
      if (files.length === 0) {
          setError(t('uploadModal.errorNoFile'));
          return false;
      }
      if (!documentToUpdate && !docName.trim()) {
          setError(t('uploadModal.errorNoName'));
          return false;
      }
      return true;
  };

  const saveDocument = (fileDataUrl: string, fileName: string, fileType: string) => {
      const newVersionData = {
          fileDataUrl,
          fileName,
          fileType,
          versionNotes: versionNotes.trim(),
      };

      if (documentToUpdate) {
          onAddVersion(documentToUpdate.id, newVersionData);
      } else {
          onAddDocument(docName.trim(), selectedFolderId, newVersionData);
      }
      onClose();
  };

  const handleSaveDefault = async () => {
    if (!validateBasic()) return;

    setIsProcessing(true);
    setError(null);

    try {
        // CASE 1: Single File
        if (files.length === 1) {
            const file = files[0];
            let fileDataUrl: string;
            let fileType = file.type;

            if (file.type.startsWith('image/')) {
                // Uses updated aggressive defaults (0.5 quality, 1024px max)
                fileDataUrl = await compressImage(file);
                // If png was converted to jpeg inside compressImage
                if (fileDataUrl.startsWith('data:image/jpeg')) {
                    fileType = 'image/jpeg';
                }
            } else {
                fileDataUrl = await fileToBase64(file);
            }
            saveDocument(fileDataUrl, file.name, fileType);
        } 
        // CASE 2: Multiple Files (All Images -> PDF)
        else {
            const allImages = files.every(f => f.type.startsWith('image/'));
            if (!allImages) {
                setError("Cannot merge mixed file types. Please use 'Save as ZIP'.");
                setIsProcessing(false);
                return;
            }

            // Generate PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'pt', 'a4');
            const a4Width = 595.28;
            const a4Height = 841.89;

            for (let i = 0; i < files.length; i++) {
                if (i > 0) pdf.addPage();
                
                // Compress each image before adding to PDF using aggressive defaults
                const imgData = await compressImage(files[i]);
                
                const img = new Image();
                img.src = imgData;
                await new Promise(resolve => { img.onload = resolve; });

                const ratio = Math.min(a4Width / img.width, a4Height / img.height);
                const pdfImgWidth = img.width * ratio;
                const pdfImgHeight = img.height * ratio;
                const x = (a4Width - pdfImgWidth) / 2;
                const y = (a4Height - pdfImgHeight) / 2;

                // Add image with 'FAST' compression hint to jsPDF
                pdf.addImage(imgData, 'JPEG', x, y, pdfImgWidth, pdfImgHeight, undefined, 'FAST');
            }

            const pdfDataUrl = pdf.output('datauristring');
            const finalName = documentToUpdate 
                ? `${documentToUpdate.name}_merged.pdf` 
                : `${docName.trim()}.pdf`;
            
            saveDocument(pdfDataUrl, finalName, 'application/pdf');
        }
    } catch (err) {
        console.error(err);
        setError(t('uploadModal.errorReadingFile'));
    } finally {
        setIsProcessing(false);
    }
  };

  const handleSaveZip = async () => {
      if (!validateBasic()) return;
      
      setIsProcessing(true);
      setError(null);

      try {
          const zip = new window.JSZip();
          
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              let base64Data = '';
              let fileName = file.name;

              if (file.type.startsWith('image/')) {
                  // Compress image using updated aggressive defaults
                  const dataUrl = await compressImage(file);
                  base64Data = dataUrl.split(',')[1];
                  // Ensure extension matches the compressed output (usually jpeg)
                  if (dataUrl.startsWith('data:image/jpeg') && !fileName.toLowerCase().endsWith('.jpg') && !fileName.toLowerCase().endsWith('.jpeg')) {
                      fileName = fileName.substring(0, fileName.lastIndexOf('.')) + '.jpg';
                  }
              } else {
                  const dataUrl = await fileToBase64(file);
                  base64Data = dataUrl.split(',')[1];
              }

              // Handle duplicate names in zip
              let finalFileName = fileName;
              let counter = 1;
              while (zip.file(finalFileName)) {
                  const dotIndex = fileName.lastIndexOf('.');
                  if (dotIndex !== -1) {
                      finalFileName = `${fileName.substring(0, dotIndex)}_${counter}${fileName.substring(dotIndex)}`;
                  } else {
                      finalFileName = `${fileName}_${counter}`;
                  }
                  counter++;
              }

              zip.file(finalFileName, base64Data, { base64: true });
          }

          // Enable DEFLATE compression
          const zipBase64 = await zip.generateAsync({ 
              type: 'base64',
              compression: 'DEFLATE',
              compressionOptions: {
                  level: 6
              }
          });
          const zipDataUrl = `data:application/zip;base64,${zipBase64}`;
          
          const finalName = documentToUpdate 
              ? `${documentToUpdate.name}_archive.zip` 
              : `${docName.trim()}.zip`;

          saveDocument(zipDataUrl, finalName, 'application/zip');

      } catch (err) {
          console.error(err);
          setError(t('uploadModal.errorReadingFile'));
      } finally {
          setIsProcessing(false);
      }
  };
  
  const allImages = files.length > 0 && files.every(f => f.type.startsWith('image/'));
  const isMixed = files.length > 1 && !allImages;

  if (!isOpen) return null;
  
  const dropzoneBaseClasses = "mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors duration-200";
  const dropzoneInactiveClasses = "border-slate-300";
  const dropzoneActiveClasses = "border-indigo-500 bg-indigo-50";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold">{documentToUpdate ? t('uploadModal.titleUpdate', { docName: documentToUpdate.name }) : t('uploadModal.titleNew')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XIcon className="w-6 h-6" /></button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto">
          {!documentToUpdate && (
            <>
              <div>
                <label htmlFor="docName" className="block text-sm font-medium text-slate-700 mb-1">{t('uploadModal.docNameLabel')}</label>
                <input 
                  id="docName" 
                  type="text" 
                  value={docName} 
                  onChange={e => setDocName(e.target.value)} 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('uploadModal.docNamePlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="folderSelect" className="block text-sm font-medium text-slate-700 mb-1">{t('folders.assignTo')}</label>
                <select
                    id="folderSelect"
                    value={selectedFolderId || ''}
                    onChange={e => setSelectedFolderId(e.target.value || null)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">{t('folders.none')}</option>
                    {folders.map(folder => (
                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                </select>
              </div>
            </>
          )}
          
          {/* Dropzone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('uploadModal.uploadFileLabel')}</label>
            <div 
              className={`${dropzoneBaseClasses} ${isDragging ? dropzoneActiveClasses : dropzoneInactiveClasses}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="space-y-1 text-center">
                <FileIcon className="mx-auto h-12 w-12 text-slate-400" />
                <div className="flex text-sm text-slate-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span>{files.length > 0 ? t('uploadModal.addMoreFiles') : t('uploadModal.uploadFile')}</span>
                    <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        className="sr-only" 
                        onChange={handleFileChange} 
                        multiple
                    />
                  </label>
                  {files.length === 0 && <p className="pl-1">{t('uploadModal.dragAndDrop')}</p>}
                </div>
                <p className="text-xs text-slate-500">{t('uploadModal.fileTypes')}</p>
              </div>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
             <div className="space-y-2">
                 <p className="text-sm font-medium text-slate-700">{t('uploadModal.selectedFiles')}</p>
                 <ul className="border border-slate-200 rounded-md divide-y divide-slate-200 max-h-32 overflow-y-auto">
                     {files.map((f, i) => (
                         <li key={i} className="px-3 py-2 flex justify-between items-center text-sm bg-slate-50">
                             <span className="truncate text-slate-600 max-w-[80%]">{f.name}</span>
                             <button onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100" aria-label={t('uploadModal.remove')}>
                                 <TrashIcon className="w-4 h-4" />
                             </button>
                         </li>
                     ))}
                 </ul>
             </div>
          )}

          <div>
            <label htmlFor="versionNotes" className="block text-sm font-medium text-slate-700 mb-1">{t('uploadModal.versionNotesLabel')}</label>
            <textarea
              id="versionNotes"
              rows={3}
              value={versionNotes}
              onChange={e => setVersionNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={t('uploadModal.versionNotesPlaceholder')}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="px-6 py-4 bg-slate-50 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 hover:bg-slate-100 transition-colors" disabled={isProcessing}>{t('uploadModal.cancel')}</button>
          
          {/* Save as ZIP Button */}
          <button 
            onClick={handleSaveZip}
            disabled={isProcessing || files.length === 0}
            className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
             {t('uploadModal.saveZip')}
          </button>

          {/* Default Save (Single or PDF) */}
          <button 
            onClick={handleSaveDefault} 
            disabled={isProcessing || isMixed || files.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
          >
             {isProcessing && (
               <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
             )}
             {isProcessing 
                ? t('uploadModal.compressing') 
                : (files.length > 1 ? t('uploadModal.savePdf') : t('uploadModal.save'))
             }
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
