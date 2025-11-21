
import React, { useState, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { Document, Folder } from '../types';
import DocumentCard from './DocumentCard';
import FolderCard from './FolderCard';
import { SearchIcon } from './icons/SearchIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { useTranslation } from '../hooks/useTranslation';
import FolderPropertiesModal from './FolderPropertiesModal';
import { getFileSizeFromBase64 } from '../utils/fileUtils';

interface DocumentListProps {
  documents: Document[]; // All documents, for counting
  documentsInView: Document[]; // Documents to display/search
  folders: Folder[]; // All folders, for counting
  foldersInView: Folder[]; // Folders to display
  currentFolder: Folder | undefined;
  onSelectFolder: (folderId: string | null) => void;
  onAddVersion: (docId: string) => void;
  onViewDetails: (doc: Document) => void;
  onDelete: (docId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onEditFolder: (folderId: string) => void;
  onMoveDocument: (docId: string, targetFolderId: string | null) => void;
  onMoveFolder: (folderId: string, targetParentId: string | null) => void;
  onReorderFolder: (draggedId: string, targetId: string, position: 'before' | 'after') => void;
}

type SortOption = 'lastUpdated' | 'name' | 'createdAt' | 'size' | 'itemCount';

const DocumentList: React.FC<DocumentListProps> = ({ 
  documents,
  documentsInView, 
  folders,
  foldersInView,
  currentFolder,
  onSelectFolder,
  onAddVersion, 
  onViewDetails, 
  onDelete,
  onDeleteFolder,
  onEditFolder,
  onMoveDocument,
  onMoveFolder,
  onReorderFolder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('lastUpdated');
  const [propertiesFolder, setPropertiesFolder] = useState<Folder | null>(null);
  const { t } = useTranslation();

  // Helper to calculate folder stats, memoized for use in sorting
  const getFolderStats = useCallback((folderId: string) => {
      // Recursively count items
      let count = 0;
      let totalSize = 0;

      const countItems = (fId: string) => {
          const docsInThisFolder = documents.filter(d => d.folderId === fId);
          count += docsInThisFolder.length;
          totalSize += docsInThisFolder.reduce((acc, doc) => {
              return acc + getFileSizeFromBase64(doc.versions[0]?.fileDataUrl || '');
          }, 0);
          
          const subFolders = folders.filter(f => f.parentId === fId);
          subFolders.forEach(sf => countItems(sf.id));
      }

      countItems(folderId);
      return { count, totalSize };
  }, [documents, folders]);

  const fuse = useMemo(() => {
    const options = {
      keys: [
        'name',
        'versions.fileName',
        'versions.versionNotes',
      ],
      includeScore: true,
      threshold: 0.4,
    };
    return new Fuse(documentsInView, options);
  }, [documentsInView]);

  const sortedFolders = useMemo(() => {
      const sorted = [...foldersInView];
      sorted.sort((a, b) => {
           switch (sortBy) {
               case 'name':
                   return a.name.localeCompare(b.name);
               case 'createdAt':
                   return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
               case 'lastUpdated':
                   // Folders don't strictly have 'lastUpdated', fallback to createdAt
                   return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
               case 'size':
                   return getFolderStats(b.id).totalSize - getFolderStats(a.id).totalSize;
               case 'itemCount':
                   return getFolderStats(b.id).count - getFolderStats(a.id).count;
               default:
                   return 0;
           }
      });
      return sorted;
  }, [foldersInView, sortBy, getFolderStats]);

  const filteredAndSortedDocuments = useMemo(() => {
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      return fuse.search(trimmedSearch).map(result => result.item);
    }
    
    const sortedDocs = [...documentsInView];
    sortedDocs.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'createdAt':
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'lastUpdated':
                const latestVersionA = a.versions[0]?.uploadedAt || a.createdAt;
                const latestVersionB = b.versions[0]?.uploadedAt || b.createdAt;
                return new Date(latestVersionB).getTime() - new Date(latestVersionA).getTime();
            case 'size':
                 const sizeA = getFileSizeFromBase64(a.versions[0]?.fileDataUrl || '');
                 const sizeB = getFileSizeFromBase64(b.versions[0]?.fileDataUrl || '');
                 return sizeB - sizeA;
            case 'itemCount':
                 // For documents, map 'itemCount' to number of versions
                 return b.versions.length - a.versions.length;
            default:
                return 0;
        }
    });

    return sortedDocs;
  }, [documentsInView, searchTerm, sortBy, fuse]);
  
  const isSearching = searchTerm.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder={t('documentList.searchPlaceholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="w-5 h-5 text-slate-400" />
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
            <label htmlFor="sort-by" className={`text-sm font-medium text-slate-600 transition-opacity ${isSearching ? 'opacity-50' : 'opacity-100'}`}>{t('documentList.sortByLabel')}</label>
            <select 
                id="sort-by"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                disabled={isSearching}
                className="pl-3 pr-8 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed hover:border-indigo-400"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
            >
                <option value="lastUpdated">{t('documentList.sortOptions.lastUpdated')}</option>
                <option value="name">{t('documentList.sortOptions.name')}</option>
                <option value="createdAt">{t('documentList.sortOptions.createdAt')}</option>
                <option value="size">{t('documentList.sortOptions.size')}</option>
                <option value="itemCount">{t('documentList.sortOptions.itemCount')}</option>
            </select>
        </div>
      </div>
      
      {isSearching && (
        <p className="text-sm text-center text-slate-500 -mt-2">
            {t('documentList.sortByRelevance')}
        </p>
      )}

      {currentFolder ? (
        <div className="flex items-center">
            <button onClick={() => onSelectFolder(currentFolder.parentId || null)} className="flex items-center text-sm font-medium text-indigo-600 hover:underline">
                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                {t('breadcrumb.home')}
            </button>
            <span className="mx-2 text-sm text-slate-400">/</span>
            <span className="text-sm font-semibold text-slate-800">{currentFolder.name}</span>
        </div>
      ) : null}

      {sortedFolders.length > 0 && (
          <div>
              <h2 className="text-lg font-semibold text-slate-700 mb-3">{t('folders.title')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {sortedFolders.map(folder => (
                      <FolderCard
                          key={folder.id}
                          folder={folder}
                          documentCount={getFolderStats(folder.id).count}
                          onClick={() => onSelectFolder(folder.id)}
                          onDelete={() => onDeleteFolder(folder.id)}
                          onEdit={() => onEditFolder(folder.id)}
                          onViewProperties={(f) => setPropertiesFolder(f)}
                          onMoveDocument={onMoveDocument}
                          onMoveFolder={onMoveFolder}
                          onReorderFolder={onReorderFolder}
                      />
                  ))}
              </div>
              <hr className="my-8 border-slate-200" />
          </div>
      )}

      {documents.length === 0 && folders.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-slate-700">{t('documentList.noDocumentsTitle')}</h3>
            <p className="mt-2 text-slate-500">{t('documentList.noDocumentsDescription')}</p>
        </div>
      ) : filteredAndSortedDocuments.length === 0 && sortedFolders.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-slate-700">{t('documentList.noDocumentsFoundTitle')}</h3>
            <p className="mt-2 text-slate-500">{t('documentList.noDocumentsFoundDescription')}</p>
        </div>
      ) : (
        <div>
          {!currentFolder && filteredAndSortedDocuments.length > 0 && folders.length > 0 && <h2 className="text-lg font-semibold text-slate-700 mb-3">{t('documents.uncategorizedTitle')}</h2>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedDocuments.map(doc => (
              <DocumentCard 
                key={doc.id} 
                document={doc}
                onAddVersion={onAddVersion}
                onViewDetails={onViewDetails}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Folder Properties Modal */}
      {propertiesFolder && (
          <FolderPropertiesModal
              isOpen={!!propertiesFolder}
              onClose={() => setPropertiesFolder(null)}
              folder={propertiesFolder}
              documentCount={getFolderStats(propertiesFolder.id).count}
              totalSize={getFolderStats(propertiesFolder.id).totalSize}
          />
      )}
    </div>
  );
};

export default DocumentList;
