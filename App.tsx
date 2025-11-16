
import React, { useState, useCallback, useMemo, useEffect } from 'react';
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

// --- Crypto Utilities ---
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const base64ToArrayBuffer = (base64: string) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const masterKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    masterKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

const encryptData = async (data: string, key: CryptoKey): Promise<{ iv: Uint8Array; encryptedData: ArrayBuffer; }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    textEncoder.encode(data)
  );
  return { iv, encryptedData };
};

const decryptData = async (encryptedData: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> => {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encryptedData
  );
  return textDecoder.decode(decrypted);
};

// --- Auth Modal Component ---
const KeyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
);
  
interface AuthModalProps {
    isSetup: boolean;
    onUnlock: (password: string) => Promise<boolean>;
}
  
const AuthModal: React.FC<AuthModalProps> = ({ isSetup, onUnlock }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;
        setIsLoading(true);
        setError('');
        const success = await onUnlock(password);
        if (!success) {
            setError(t('authModal.error'));
        }
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-100 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-sm">
                <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
                        <KeyIcon className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        {isSetup ? t('authModal.titleSetup') : t('authModal.titleUnlock')}
                    </h2>
                    <p className="text-slate-500 mt-2 text-sm">
                        {isSetup ? t('authModal.descriptionSetup') : t('authModal.descriptionUnlock')}
                    </p>
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="password" className="sr-only">{t('authModal.passwordLabel')}</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                                placeholder={t('authModal.passwordLabel')}
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-wait"
                        >
                            {isLoading ? '...' : (isSetup ? t('authModal.setupButton') : t('authModal.unlockButton'))}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
  
interface EncryptedData {
    salt: string;
    iv: string;
    data: string;
}

const App: React.FC = () => {
    const [storedData, setStoredData] = useLocalStorage<EncryptedData | null>('docuvault_data', null);
    
    const [documents, setDocuments] = useState<Document[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);

    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isCreateFolderModalOpen, setCreateFolderModalOpen] = useState(false);
    const [documentToUpdateId, setDocumentToUpdateId] = useState<string | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const { t } = useTranslation();

    useEffect(() => {
        if (!masterKey || !isUnlocked) return;

        const saveData = async () => {
            const dataToEncrypt = JSON.stringify({ documents, folders });
            const { iv, encryptedData } = await encryptData(dataToEncrypt, masterKey);
            
            // Use functional update to avoid depending on `storedData` in the dependency array
            setStoredData(currentData => {
                if (!currentData?.salt) {
                    console.error("Cannot save data: salt is missing.");
                    return currentData;
                }
                return {
                    salt: currentData.salt,
                    iv: arrayBufferToBase64(iv.buffer),
                    data: arrayBufferToBase64(encryptedData),
                };
            });
        };
        
        saveData().catch(console.error);
    }, [documents, folders, masterKey, isUnlocked, setStoredData]);


    const handleUnlock = useCallback(async (password: string): Promise<boolean> => {
        if (!storedData) { // Setup mode
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const key = await deriveKey(password, salt);
            
            const initialData = { documents: sampleDocuments, folders: [] };
            const dataToEncrypt = JSON.stringify(initialData);
            const { iv, encryptedData } = await encryptData(dataToEncrypt, key);
            
            setStoredData({
                salt: arrayBufferToBase64(salt.buffer),
                iv: arrayBufferToBase64(iv.buffer),
                data: arrayBufferToBase64(encryptedData),
            });
            
            setDocuments(initialData.documents);
            setFolders(initialData.folders);
            setMasterKey(key);
            setIsUnlocked(true);
            return true;
        } else { // Unlock mode
            try {
                const salt = new Uint8Array(base64ToArrayBuffer(storedData.salt));
                const iv = new Uint8Array(base64ToArrayBuffer(storedData.iv));
                const encrypted = base64ToArrayBuffer(storedData.data);
                
                const key = await deriveKey(password, salt);
                const decryptedString = await decryptData(encrypted, key, iv);
                const decryptedData = JSON.parse(decryptedString);

                setDocuments(decryptedData.documents || []);
                setFolders(decryptedData.folders || []);
                setMasterKey(key);
                setIsUnlocked(true);
                return true;
            } catch (error) {
                console.error("Decryption failed:", error);
                return false;
            }
        }
    }, [storedData, setStoredData]);


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
    }, []);

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
    }, []);

    const handleDeleteDocument = useCallback((docId: string) => {
        setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
    }, []);

    const handleAddFolder = useCallback((name: string) => {
        const newFolder: Folder = {
            id: crypto.randomUUID(),
            name,
            createdAt: new Date().toISOString(),
        };
        setFolders(prevFolders => [...prevFolders, newFolder]);
        setCreateFolderModalOpen(false);
    }, []);

    const currentFolder = useMemo(() => folders.find(f => f.id === currentFolderId), [folders, currentFolderId]);
    const documentsInView = useMemo(() => {
        if (currentFolderId) {
            return documents.filter(doc => doc.folderId === currentFolderId);
        }
        return documents.filter(doc => !doc.folderId);
    }, [documents, currentFolderId]);
    
    if (!isUnlocked) {
        return <AuthModal isSetup={!storedData} onUnlock={handleUnlock} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
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