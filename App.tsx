

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Document, DocumentVersion, Folder } from './types';
import Header from './components/Header';
import DocumentList from './components/DocumentList';
import UploadModal from './components/UploadModal';
import DocumentDetailModal from './components/DocumentDetailModal';
import CreateFolderModal from './components/CreateFolderModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import { PlusIcon } from './components/icons/PlusIcon';
import { FolderPlusIcon } from './components/icons/FolderPlusIcon';
import { useTranslation } from './hooks/useTranslation';
import { sampleDocuments } from './sampleData';
import { CameraIcon } from './components/icons/CameraIcon';
import CameraModal from './components/CameraModal';

// Add JSZip to window
declare global {
    interface Window {
        JSZip: any;
    }
}

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

// Derive a key from a password or recovery phrase
const deriveKey = async (secret: string, salt: Uint8Array): Promise<CryptoKey> => {
  const masterKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
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
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
};

// Encrypt data using a specific key
const encryptData = async (data: string, key: CryptoKey): Promise<{ iv: Uint8Array; encryptedData: ArrayBuffer; }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    textEncoder.encode(data)
  );
  return { iv, encryptedData };
};

// Decrypt data using a specific key
const decryptData = async (encryptedData: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string> => {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encryptedData
  );
  return textDecoder.decode(decrypted);
};

// Generate a random Master Key that will actually encrypt the data
const generateMasterKey = async (): Promise<CryptoKey> => {
    return await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
};

// Export key to raw bytes for wrapping
const exportKey = async (key: CryptoKey): Promise<ArrayBuffer> => {
    return await crypto.subtle.exportKey("raw", key);
};

// Import raw bytes back to a key
const importMasterKey = async (keyData: ArrayBuffer): Promise<CryptoKey> => {
    return await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"]
    );
};

// Generate a random Recovery Phrase
const generateRecoveryPhrase = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    const randomValues = new Uint8Array(16);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) result += '-';
        result += chars[randomValues[i] % chars.length];
    }
    return result; // Format: XXXX-XXXX-XXXX-XXXX
};


// --- IndexedDB Utilities ---
const DB_NAME = 'DocuVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'encryptedDataStore';
const DB_KEY = 'docuvault_data';

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => {
            console.error("IndexedDB error:", request.error);
            reject("IndexedDB error");
        };
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
    return dbPromise;
};

const getDataFromDB = <T,>(key: string): Promise<T | null> => {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => {
                console.error('Error fetching data from IndexedDB:', request.error);
                reject(request.error);
            };
        } catch (error) { reject(error); }
    });
};

const setDataInDB = <T,>(key: string, data: T): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(data, key);
            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('Error saving data to IndexedDB:', request.error);
                reject(request.error);
            };
        } catch (error) { reject(error); }
    });
};

const deleteDataInDB = (key: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('Error deleting data from IndexedDB:', request.error);
                reject(request.error);
            };
        } catch (error) { reject(error); }
    });
};

// --- Auth Modal Component ---
const KeyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
);

const AlertIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

const ShieldCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
);

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);
  
interface AuthModalProps {
    isSetup: boolean;
    onUnlock: (password: string, isRecovery?: boolean) => Promise<boolean>;
    onReset: () => void;
    generatedRecoveryKey?: string; // For setup phase
    onCompleteSetup?: () => void;
}
  
const AuthModal: React.FC<AuthModalProps> = ({ isSetup, onUnlock, onReset, generatedRecoveryKey, onCompleteSetup }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryPhraseInput, setRecoveryPhraseInput] = useState('');
    const { t } = useTranslation();

    const handleDownloadKey = () => {
        if (!generatedRecoveryKey) return;
        const element = document.createElement("a");
        const file = new Blob([`DocuVault Recovery Key: ${generatedRecoveryKey}\n\nKEEP THIS SAFE. IF YOU LOSE YOUR PASSWORD, THIS IS THE ONLY WAY TO RECOVER YOUR DATA.`], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = "docuvault-recovery-key.txt";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    // --- Mode: Reset Confirmation ---
    if (isResetting) {
        return (
            <div className="fixed inset-0 bg-slate-100 flex items-center justify-center z-50 p-4">
                <div className="w-full max-w-sm">
                    <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 text-center border-2 border-red-100">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                            <AlertIcon className="h-8 w-8 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-red-700">
                            {t('authModal.resetTitle')}
                        </h2>
                        <p className="text-slate-600 mt-4 text-sm leading-relaxed">
                            {t('authModal.resetWarning')}
                        </p>
                        <div className="mt-8 space-y-3">
                            <button
                                onClick={onReset}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                {t('authModal.confirmReset')}
                            </button>
                            <button
                                onClick={() => setIsResetting(false)}
                                className="w-full flex justify-center py-3 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                {t('authModal.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- Mode: Setup Success (Show Recovery Key) ---
    if (generatedRecoveryKey) {
        return (
            <div className="fixed inset-0 bg-slate-100 flex items-center justify-center z-50 p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                            <ShieldCheckIcon className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            {t('authModal.recoveryTitle')}
                        </h2>
                        <p className="text-slate-600 mt-2 text-sm">
                            {t('authModal.recoveryDesc')}
                        </p>
                        
                        <div className="my-6 p-4 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg">
                            <code className="text-lg font-mono font-bold text-indigo-700 tracking-wide break-all">
                                {generatedRecoveryKey}
                            </code>
                        </div>

                         <button 
                            onClick={handleDownloadKey}
                            className="w-full mb-4 flex items-center justify-center py-2 px-4 border border-indigo-300 rounded-lg shadow-sm text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                            <DownloadIcon className="w-5 h-5 mr-2" />
                            {t('authModal.downloadKey')}
                        </button>

                        <p className="text-xs text-red-500 font-semibold mb-6">
                            {t('authModal.recoveryWarning')}
                        </p>

                        <button
                            onClick={onCompleteSetup}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {t('authModal.savedRecoveryKey')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isRecovering) {
            if (!recoveryPhraseInput) return;
            setIsLoading(true);
            setError('');
            const success = await onUnlock(recoveryPhraseInput.trim(), true); // true = isRecovery
            if (!success) {
                setError(t('authModal.errorRecovery'));
            }
            setIsLoading(false);
            return;
        }

        if (!password) return;
        setIsLoading(true);
        setError('');
        const success = await onUnlock(password, false);
        if (!success) {
            setError(t('authModal.error'));
        }
        setIsLoading(false);
    };

    // --- Mode: Standard Login / Setup / Recovery Input ---
    return (
        <div className="fixed inset-0 bg-slate-100 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-sm">
                <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
                        <KeyIcon className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        {isRecovering 
                            ? t('authModal.titleRecovery') 
                            : (isSetup ? t('authModal.titleSetup') : t('authModal.titleUnlock'))}
                    </h2>
                    <p className="text-slate-500 mt-2 text-sm">
                        {isRecovering 
                             ? t('authModal.descriptionRecovery')
                             : (isSetup ? t('authModal.descriptionSetup') : t('authModal.descriptionUnlock'))}
                    </p>
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="password" className="sr-only">
                                {isRecovering ? t('authModal.recoveryLabel') : t('authModal.passwordLabel')}
                            </label>
                            {isRecovering ? (
                                <input
                                    id="recoveryKey"
                                    type="text"
                                    required
                                    value={recoveryPhraseInput}
                                    onChange={(e) => setRecoveryPhraseInput(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center font-mono uppercase"
                                    placeholder="XXXX-XXXX-..."
                                    autoFocus
                                />
                            ) : (
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete={isSetup ? "new-password" : "current-password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                                    placeholder={t('authModal.passwordLabel')}
                                    autoFocus
                                />
                            )}
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-wait"
                        >
                            {isLoading ? '...' : (
                                isRecovering 
                                    ? t('authModal.recoverButton')
                                    : (isSetup ? t('authModal.setupButton') : t('authModal.unlockButton'))
                            )}
                        </button>
                    </form>
                    
                    {!isSetup && !isRecovering && (
                        <button 
                            onClick={() => {
                                setIsRecovering(true); 
                                setError('');
                            }}
                            className="mt-4 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                            {t('authModal.useRecoveryKey')}
                        </button>
                    )}
                    
                    {isRecovering && (
                         <button 
                            onClick={() => {
                                setIsRecovering(false);
                                setError('');
                            }}
                            className="mt-4 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                            {t('authModal.backToLogin')}
                        </button>
                    )}

                    {!isSetup && !isRecovering && (
                         <button 
                            onClick={() => setIsResetting(true)}
                            className="mt-2 block w-full text-sm text-red-400 hover:text-red-600 transition-colors"
                        >
                            {t('authModal.resetVault')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
  
// Updated Data Structure for Storage
interface KeyEncryptedData {
    salt: string;
    iv: string;
    data: string; // Encrypted MasterKey
}

interface VaultStorage {
    // The actual data, encrypted by MasterKey
    vaultData: {
        iv: string;
        data: string;
    };
    // MasterKey encrypted by Password
    auth: KeyEncryptedData;
    // MasterKey encrypted by RecoveryPhrase
    recovery: KeyEncryptedData;
}

const App: React.FC = () => {
    const [storedData, setStoredData] = useState<VaultStorage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [documents, setDocuments] = useState<Document[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    // We keep the recovery phrase in memory after unlock (if available) to allow viewing/downloading from settings
    // It is secure because it's inside the React state memory, not persistent storage (except encrypted).
    const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
    const [isRecoveredSession, setIsRecoveredSession] = useState(false);
    
    // Setup State
    const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState<string | null>(null);

    // Modals
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isCreateFolderModalOpen, setCreateFolderModalOpen] = useState(false);
    const [isCameraModalOpen, setCameraModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [documentToUpdateId, setDocumentToUpdateId] = useState<string | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
    const [isZipping, setIsZipping] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                // Migrate from old localStorage if exists
                const lsItem = window.localStorage.getItem('docuvault_data');
                if (lsItem) {
                    const lsData = JSON.parse(lsItem);
                    // If old format (direct encryption), we can't easily migrate without password here.
                    // We will just move it to DB and let handleUnlock deal with it (or fail if format changed)
                    await setDataInDB(DB_KEY, lsData);
                    window.localStorage.removeItem('docuvault_data');
                }
                
                const dbData = await getDataFromDB<VaultStorage>(DB_KEY);
                
                // Basic check if data matches new structure
                if (dbData && (!dbData.auth || !dbData.recovery)) {
                    console.warn("Legacy data format detected. Reset might be required if migration fails.");
                    setStoredData(dbData); 
                } else {
                    setStoredData(dbData);
                }

            } catch (error) {
                console.error("Failed to load initial data:", error);
                setStoredData(null);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    // Autosave Effect
    useEffect(() => {
        if (isLoading || !masterKey || !isUnlocked || !storedData) return;
        
        const handler = setTimeout(() => {
            const saveData = async () => {
                // We include the recoveryPhrase in the encrypted payload so it's preserved
                // and accessible in future sessions (view in settings).
                const dataToEncrypt = JSON.stringify({ documents, folders, recoveryPhrase });
                
                // Encrypt actual data with Master Key
                const { iv, encryptedData } = await encryptData(dataToEncrypt, masterKey);
                
                const newData: VaultStorage = {
                    ...storedData,
                    vaultData: {
                        iv: arrayBufferToBase64(iv.buffer),
                        data: arrayBufferToBase64(encryptedData),
                    }
                };
                
                try {
                    await setDataInDB(DB_KEY, newData);
                    // Update local state pointer, but maintain auth keys
                    setStoredData(newData);
                } catch(error) {
                    console.error("Failed to save data to IndexedDB", error);
                }
            };
            saveData();
        }, 500);

        return () => clearTimeout(handler);
    }, [documents, folders, recoveryPhrase, masterKey, isUnlocked, isLoading]);


    const handleUnlock = useCallback(async (secret: string, isRecovery = false): Promise<boolean> => {
        // --- SETUP NEW VAULT ---
        if (!storedData) { 
            try {
                // 1. Generate Master Key
                const newMasterKey = await generateMasterKey();
                const exportedMasterKey = await exportKey(newMasterKey);
                const exportedMasterKeyString = arrayBufferToBase64(exportedMasterKey);

                // 2. Encrypt Master Key with Password
                const saltAuth = crypto.getRandomValues(new Uint8Array(16));
                const passwordKey = await deriveKey(secret, saltAuth);
                const { iv: ivAuth, encryptedData: encryptedMKAuth } = await encryptData(exportedMasterKeyString, passwordKey);

                // 3. Encrypt Master Key with Recovery Phrase
                const newRecoveryPhrase = generateRecoveryPhrase();
                const saltRec = crypto.getRandomValues(new Uint8Array(16));
                const recoveryKey = await deriveKey(newRecoveryPhrase, saltRec);
                const { iv: ivRec, encryptedData: encryptedMKRec } = await encryptData(exportedMasterKeyString, recoveryKey);

                // 4. Encrypt Initial Empty Data AND the Recovery Phrase (for storage)
                const initialContent = JSON.stringify({ 
                    documents: sampleDocuments, 
                    folders: [],
                    recoveryPhrase: newRecoveryPhrase 
                });
                const { iv: ivData, encryptedData: encryptedContent } = await encryptData(initialContent, newMasterKey);

                // 5. Construct Storage Object
                const vaultStorage: VaultStorage = {
                    vaultData: {
                        iv: arrayBufferToBase64(ivData.buffer),
                        data: arrayBufferToBase64(encryptedContent)
                    },
                    auth: {
                        salt: arrayBufferToBase64(saltAuth.buffer),
                        iv: arrayBufferToBase64(ivAuth.buffer),
                        data: arrayBufferToBase64(encryptedMKAuth)
                    },
                    recovery: {
                        salt: arrayBufferToBase64(saltRec.buffer),
                        iv: arrayBufferToBase64(ivRec.buffer),
                        data: arrayBufferToBase64(encryptedMKRec)
                    }
                };

                // 6. Save
                await setDataInDB(DB_KEY, vaultStorage);
                setStoredData(vaultStorage);
                
                // 7. Set Runtime State
                setDocuments(sampleDocuments);
                setFolders([]);
                setRecoveryPhrase(newRecoveryPhrase);
                setMasterKey(newMasterKey);
                setGeneratedRecoveryKey(newRecoveryPhrase); // Triggers "Show Recovery Key" modal
                // Note: We don't set isUnlocked=true yet. User must click "I saved it" in modal.
                
                return true;
            } catch (e) {
                console.error("Setup failed", e);
                return false;
            }
        } 
        
        // --- UNLOCK EXISTING VAULT ---
        else { 
            try {
                // 1. Determine which key bundle to use (Auth vs Recovery)
                const keyBundle = isRecovery ? storedData.recovery : storedData.auth;
                
                if (!keyBundle) throw new Error("Invalid vault format");

                const salt = new Uint8Array(base64ToArrayBuffer(keyBundle.salt));
                const iv = new Uint8Array(base64ToArrayBuffer(keyBundle.iv));
                const encryptedMK = base64ToArrayBuffer(keyBundle.data);
                
                // 2. Derive Key from Input (Password or Recovery Phrase)
                const inputKey = await deriveKey(secret, salt);
                
                // 3. Decrypt Master Key
                const masterKeyString = await decryptData(encryptedMK, inputKey, iv);
                const masterKeyBytes = base64ToArrayBuffer(masterKeyString);
                const unwrappedMasterKey = await importMasterKey(masterKeyBytes);
                
                // 4. Decrypt Vault Data using Master Key
                const vaultIv = new Uint8Array(base64ToArrayBuffer(storedData.vaultData.iv));
                const vaultEncrypted = base64ToArrayBuffer(storedData.vaultData.data);
                
                const decryptedContentString = await decryptData(vaultEncrypted, unwrappedMasterKey, vaultIv);
                const content = JSON.parse(decryptedContentString);

                // 5. Success
                setDocuments(content.documents || []);
                setFolders(content.folders || []);
                // If legacy vault, recoveryPhrase might not exist in JSON. Handle gracefully.
                setRecoveryPhrase(content.recoveryPhrase || null);
                
                setMasterKey(unwrappedMasterKey);
                setIsUnlocked(true);

                if (isRecovery) {
                    setIsRecoveredSession(true); // Flag that we need to change password
                }
                
                return true;
            } catch (error) {
                console.error("Decryption failed:", error);
                return false;
            }
        }
    }, [storedData]);

    const handleChangePassword = async (newPassword: string) => {
        if (!masterKey || !storedData) return;

        // 1. Export Master Key (we already have it in memory, but need it raw to encrypt)
        const exportedMasterKey = await exportKey(masterKey);
        const exportedMasterKeyString = arrayBufferToBase64(exportedMasterKey);

        // 2. Encrypt Master Key with New Password
        const saltAuth = crypto.getRandomValues(new Uint8Array(16));
        const passwordKey = await deriveKey(newPassword, saltAuth);
        const { iv: ivAuth, encryptedData: encryptedMKAuth } = await encryptData(exportedMasterKeyString, passwordKey);

        // 3. Update Storage
        const newStorage: VaultStorage = {
            ...storedData,
            auth: {
                salt: arrayBufferToBase64(saltAuth.buffer),
                iv: arrayBufferToBase64(ivAuth.buffer),
                data: arrayBufferToBase64(encryptedMKAuth)
            }
        };

        await setDataInDB(DB_KEY, newStorage);
        setStoredData(newStorage);
        setIsRecoveredSession(false); // Clear recovery flag
        setChangePasswordModalOpen(false);
    };
    
    const handleCompleteSetup = () => {
        setGeneratedRecoveryKey(null);
        setIsUnlocked(true);
    };
    
    const handleResetVault = useCallback(async () => {
        try {
            await deleteDataInDB(DB_KEY);
            window.localStorage.removeItem('docuvault_data');
            setStoredData(null);
            setDocuments([]);
            setFolders([]);
            setRecoveryPhrase(null);
            setMasterKey(null);
            setIsUnlocked(false);
            setGeneratedRecoveryKey(null);
        } catch (error) {
            console.error("Failed to reset vault:", error);
            alert("An error occurred while resetting the vault. Please try clearing your browser data manually.");
        }
    }, []);


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

    const handleSaveFolder = useCallback((name: string) => {
        if (folderToEdit) {
            setFolders(prevFolders => prevFolders.map(f => 
                f.id === folderToEdit.id ? { ...f, name } : f
            ));
        } else {
            const newFolder: Folder = {
                id: crypto.randomUUID(),
                name,
                createdAt: new Date().toISOString(),
                parentId: currentFolderId || null,
            };
            setFolders(prevFolders => [...prevFolders, newFolder]);
        }
        setCreateFolderModalOpen(false);
        setFolderToEdit(null);
    }, [folderToEdit, currentFolderId]);

    const handleOpenEditFolderModal = useCallback((folderId: string) => {
        const folder = folders.find(f => f.id === folderId);
        if (folder) {
            setFolderToEdit(folder);
            setCreateFolderModalOpen(true);
        }
    }, [folders]);

    const handleOpenCreateFolderModal = useCallback(() => {
        setFolderToEdit(null);
        setCreateFolderModalOpen(true);
    }, []);

    const handleDeleteFolder = useCallback((folderId: string) => {
        setDocuments(prevDocs =>
            prevDocs.map(doc => {
                if (doc.folderId === folderId) {
                    return { ...doc, folderId: null };
                }
                return doc;
            })
        );
        setFolders(prevFolders => 
            prevFolders.map(f => {
                if (f.parentId === folderId) {
                    return { ...f, parentId: null };
                }
                return f;
            }).filter(folder => folder.id !== folderId)
        );
    }, []);

    const handleMoveDocument = useCallback((docId: string, targetFolderId: string | null) => {
        setDocuments(prev => prev.map(doc => 
            doc.id === docId ? { ...doc, folderId: targetFolderId } : doc
        ));
    }, []);
  
    const handleMoveFolder = useCallback((folderId: string, targetParentId: string | null) => {
        const getAllDescendants = (id: string): string[] => {
            const children = folders.filter(f => f.parentId === id);
            return [...children.map(c => c.id), ...children.flatMap(c => getAllDescendants(c.id))];
        }
        const descendants = getAllDescendants(folderId);
        
        if (folderId === targetParentId || (targetParentId && descendants.includes(targetParentId))) {
            alert(t('folders.errorCircularMove'));
            return;
        }
        setFolders(prev => prev.map(f => 
            f.id === folderId ? { ...f, parentId: targetParentId } : f
        ));
    }, [folders, t]);

    const handleReorderFolder = useCallback((draggedId: string, targetId: string, position: 'before' | 'after') => {
        setFolders(prev => {
            const fromIndex = prev.findIndex(f => f.id === draggedId);
            let toIndex = prev.findIndex(f => f.id === targetId);
            
            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev;

            const newFolders = [...prev];
            const [movedItem] = newFolders.splice(fromIndex, 1);
            toIndex = newFolders.findIndex(f => f.id === targetId);
            
            if (position === 'after') {
                toIndex += 1;
            }
            
            newFolders.splice(toIndex, 0, movedItem);
            return newFolders;
        });
    }, []);

    const handleDownloadAll = useCallback(async () => {
        if (documents.length === 0) {
            alert(t('common.noDocsToDownload'));
            return;
        }

        setIsZipping(true);
        
        // Small delay to allow UI to update
        setTimeout(async () => {
            try {
                const zip = new window.JSZip();
                const folderCache = new Map<string, string>();

                // Helper to resolve folder path
                const getFolderPath = (folderId: string | null | undefined): string => {
                    if (!folderId) return '';
                    if (folderCache.has(folderId)) return folderCache.get(folderId)!;

                    const folder = folders.find(f => f.id === folderId);
                    if (!folder) return '';

                    const parentPath = getFolderPath(folder.parentId);
                    const sanitizedName = folder.name.replace(/\//g, "-");
                    const path = parentPath ? `${parentPath}/${sanitizedName}` : sanitizedName;
                    folderCache.set(folderId, path);
                    return path;
                };

                const filenamesInFolders: Record<string, Set<string>> = {};

                documents.forEach(doc => {
                    const latestVersion = doc.versions[0];
                    if (!latestVersion) return;

                    const folderPath = getFolderPath(doc.folderId);
                    const folderKey = folderPath || 'root';

                    if (!filenamesInFolders[folderKey]) {
                        filenamesInFolders[folderKey] = new Set();
                    }

                    let fileName = latestVersion.fileName;
                    
                    // Ensure unique filename in folder
                    if (filenamesInFolders[folderKey].has(fileName)) {
                         let counter = 1;
                         const namePart = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
                         const extPart = fileName.substring(fileName.lastIndexOf('.'));
                         while (filenamesInFolders[folderKey].has(fileName)) {
                            fileName = `${namePart}_${counter}${extPart}`;
                            counter++;
                         }
                    }
                    filenamesInFolders[folderKey].add(fileName);

                    const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;
                    
                    // Get base64 data
                    let base64Data = latestVersion.fileDataUrl;
                    if (base64Data.includes(',')) {
                        base64Data = base64Data.split(',')[1];
                    }

                    zip.file(fullPath, base64Data, { base64: true });
                });

                const content = await zip.generateAsync({ type: 'blob' });
                const url = window.URL.createObjectURL(content);
                const link = document.createElement('a');
                link.href = url;
                link.download = `DocuVault_Backup_${new Date().toISOString().split('T')[0]}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

            } catch (error) {
                console.error("Download failed", error);
                alert(t('common.errorDownload'));
            } finally {
                setIsZipping(false);
            }
        }, 100);

    }, [documents, folders, t]);

    const currentFolder = useMemo(() => folders.find(f => f.id === currentFolderId), [folders, currentFolderId]);
    
    const documentsInView = useMemo(() => {
        if (currentFolderId) {
            return documents.filter(doc => doc.folderId === currentFolderId);
        }
        return documents.filter(doc => !doc.folderId);
    }, [documents, currentFolderId]);

    const foldersInView = useMemo(() => {
        if (currentFolderId) {
            return folders.filter(f => f.parentId === currentFolderId);
        }
        return folders.filter(f => !f.parentId);
    }, [folders, currentFolderId]);
    
    const LoadingSpinner = () => (
        <div className="flex items-center justify-center h-8 w-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );
    
    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-slate-100 flex flex-col items-center justify-center z-50 p-4 space-y-4">
                <LoadingSpinner />
                <p className="text-slate-600">Loading your vault...</p>
            </div>
        );
    }

    if (!isUnlocked || generatedRecoveryKey) {
        return (
            <AuthModal 
                key={storedData ? 'unlock' : 'setup'}
                isSetup={!storedData} 
                onUnlock={handleUnlock} 
                onReset={handleResetVault}
                generatedRecoveryKey={generatedRecoveryKey || undefined}
                onCompleteSetup={handleCompleteSetup}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
            <Header 
                onSettingsClick={() => setChangePasswordModalOpen(true)} 
                onDownloadBackup={handleDownloadAll}
                isDownloading={isZipping}
            />
            <main className="container mx-auto p-4 md:p-6 lg:p-8">
                <DocumentList
                    documents={documents}
                    documentsInView={documentsInView}
                    folders={folders}
                    foldersInView={foldersInView}
                    currentFolder={currentFolder}
                    onSelectFolder={setCurrentFolderId}
                    onAddVersion={handleOpenUploadModalForVersion}
                    onViewDetails={handleOpenDetailModal}
                    onDelete={handleDeleteDocument}
                    onDeleteFolder={handleDeleteFolder}
                    onEditFolder={handleOpenEditFolderModal}
                    onMoveDocument={handleMoveDocument}
                    onMoveFolder={handleMoveFolder}
                    onReorderFolder={handleReorderFolder}
                />
            </main>

            <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 flex flex-col items-center space-y-4">
                <button
                    onClick={handleOpenCreateFolderModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
                    aria-label={t('aria.createNewFolder')}
                >
                    <FolderPlusIcon className="w-7 h-7" />
                </button>
                <button
                    onClick={() => setCameraModalOpen(true)}
                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-full p-3 shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-teal-500 focus:ring-opacity-50"
                    aria-label={t('aria.scanDocument')}
                >
                    <CameraIcon className="w-7 h-7" />
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

            {isCameraModalOpen && (
                <CameraModal
                    isOpen={isCameraModalOpen}
                    onClose={() => setCameraModalOpen(false)}
                    onAddDocument={handleAddDocument}
                    folders={folders}
                    currentFolderId={currentFolderId}
                />
            )}

            {isCreateFolderModalOpen && (
                <CreateFolderModal
                    isOpen={isCreateFolderModalOpen}
                    onClose={() => setCreateFolderModalOpen(false)}
                    onSave={handleSaveFolder}
                    initialName={folderToEdit?.name}
                    isEditing={!!folderToEdit}
                />
            )}

            {isDetailModalOpen && selectedDocument && (
                <DocumentDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    document={selectedDocument}
                />
            )}

            {(isChangePasswordModalOpen || isRecoveredSession) && (
                <ChangePasswordModal
                    isOpen={true}
                    onClose={() => setChangePasswordModalOpen(false)}
                    onChangePassword={handleChangePassword}
                    isForced={isRecoveredSession}
                    recoveryPhrase={recoveryPhrase}
                />
            )}
        </div>
    );
};

export default App;