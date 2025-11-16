
import React, { useState, useCallback, useMemo } from 'react';
import { Document, DocumentVersion, Folder } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import Header from './components/Header';
import DocumentList from './components/DocumentList';
import UploadModal from './components/UploadModal';
import DocumentDetailModal from './components/DocumentDetailModal';
import CreateFolderModal from './components/CreateFolderModal';
import { PlusIcon } from './components/icons/PlusIcon';
import { FolderPlusIcon } from './components/icons/FolderPlusIcon';
import { useTranslation } from './hooks/useTranslation';
import { sampleDocuments } from './sampleData';

const App: React.FC = () => {
  const [documents, setDocuments] = useLocalStorage<Document[]>('documents', sampleDocuments);
  const [folders, setFolders] = useLocalStorage<Folder[]>('folders', []);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [documentToUpdateId, setDocumentToUpdateId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleOpenUploadModalForNew = useCallback(() => {
    setDocumentToUpdateId(null);
    setSelectedDocument(null);
    setUploadModalOpen(true);
  }, []);
  
  const handleOpenUploadModalForVersion = useCallback((docId: string) => {
    setDocumentToUpdateId(docId);
    setSelectedDocument(null);
    setUploadModalOpen(true);
  }, []);

  const handleOpenDetailModal = useCallback((doc: Document) => {
    setSelectedDocument(doc);
    setDetailModalOpen(true);
  }, []);

  const handleAddDocument = useCallback((name: string, folderId: string | null, version: Omit<DocumentVersion, 'versionId' | 'uploadedAt'>) => {
    const newDocument: Document = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      versions: [{ ...version, versionId: crypto.randomUUID(), uploadedAt: new Date().toISOString() }],
      folderId,
    };
    setDocuments(prevDocs => [...prevDocs, newDocument]);
    setUploadModalOpen(false);
  }, [setDocuments]);

  const handleAddVersion = useCallback((docId: string, version: Omit<DocumentVersion, 'versionId' | 'uploadedAt'>) => {
    setDocuments(prevDocs => 
      prevDocs.map(doc => {
        if (doc.id === docId) {
          const newVersion: DocumentVersion = {
            ...version,
            versionId: crypto.randomUUID(),
            uploadedAt: new Date().toISOString()
          };
          return { ...doc, versions: [newVersion, ...doc.versions] };
        }
        return doc;
      })
    );
    setUploadModalOpen(false);
    setDocumentToUpdateId(null);
  }, [setDocuments]);

  const handleDeleteDocument = useCallback((docId: string) => {
    setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
  }, [setDocuments]);

  const handleAddFolder = useCallback((name: string) => {
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    };
    setFolders(prevFolders => [...prevFolders, newFolder]);
    setCreateFolderModalOpen(false);
  }, [setFolders]);

  const currentFolder = useMemo(() => folders.find(f => f.id === currentFolderId), [folders, currentFolderId]);
  const documentsInView = useMemo(() => {
    if (currentFolderId) {
      return documents.filter(doc => doc.folderId === currentFolderId);
    }
    return documents.filter(doc => !doc.folderId);
  }, [documents, currentFolderId]);


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <DocumentList 
          documents={documents}
          documentsInView={documentsInView}
          folders={folders}
          currentFolder={currentFolder}
          onSelectFolder={setCurrentFolderId}
          onAddVersion={handleOpenUploadModalForVersion}
          onViewDetails={handleOpenDetailModal}
          onDelete={handleDeleteDocument}
        />
      </main>

      <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 flex flex-col items-center space-y-4">
        <button
          onClick={() => setCreateFolderModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
          aria-label={t('aria.createNewFolder')}
        >
          <FolderPlusIcon className="w-7 h-7" />
        </button>
        <button
          onClick={handleOpenUploadModalForNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50"
          aria-label={t('aria.addNewDocument')}
        >
          <PlusIcon className="w-8 h-8" />
        </button>
      </div>

      {isUploadModalOpen && (
        <UploadModal 
          isOpen={isUploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onAddDocument={handleAddDocument}
          onAddVersion={handleAddVersion}
          documentToUpdate={documents.find(d => d.id === documentToUpdateId) || null}
          folders={folders}
          currentFolderId={currentFolderId}
        />
      )}

      {isCreateFolderModalOpen && (
        <CreateFolderModal
          isOpen={isCreateFolderModalOpen}
          onClose={() => setCreateFolderModalOpen(false)}
          onAddFolder={handleAddFolder}
        />
      )}

      {isDetailModalOpen && selectedDocument && (
        <DocumentDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          document={selectedDocument}
        />
      )}
    </div>
  );
};

export default App;