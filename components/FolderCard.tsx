
import React, { useState, useRef, useEffect } from 'react';
import { Folder } from '../types';
import { FolderIcon } from './icons/FolderIcon';
import { useTranslation } from '../hooks/useTranslation';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { EllipsisVerticalIcon } from './icons/EllipsisVerticalIcon';
import { InfoIcon } from './icons/InfoIcon';

interface FolderCardProps {
    folder: Folder;
    documentCount: number;
    onClick: () => void;
    onDelete: (folderId: string) => void;
    onEdit: (folderId: string) => void;
    onViewProperties: (folder: Folder) => void;
    onMoveDocument: (docId: string, targetFolderId: string) => void;
    onMoveFolder: (folderId: string, targetParentId: string) => void;
    onReorderFolder: (draggedId: string, targetId: string, position: 'before' | 'after') => void;
}

const FolderCard: React.FC<FolderCardProps> = ({ 
    folder, 
    documentCount, 
    onClick, 
    onDelete, 
    onEdit, 
    onViewProperties,
    onMoveDocument,
    onMoveFolder,
    onReorderFolder
}) => {
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [dragPosition, setDragPosition] = useState<'left' | 'right' | 'center' | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(!menuOpen);
    };

    const handleAction = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        setMenuOpen(false);
        action();
    };

    const handleDelete = () => {
        if (window.confirm(t('folders.deleteConfirmation', { folderName: folder.name }))) {
            onDelete(folder.id);
        }
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'FOLDER', id: folder.id }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;

        // Determine drop zone: Left 25% (Before), Right 25% (After), Center 50% (Nest)
        if (x < width * 0.25) {
            setDragPosition('left');
        } else if (x > width * 0.75) {
            setDragPosition('right');
        } else {
            setDragPosition('center');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const position = dragPosition;
        setDragPosition(null);

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.type === 'DOCUMENT') {
                // Documents always go inside the folder regardless of where dropped on the card
                onMoveDocument(data.id, folder.id);
            } else if (data.type === 'FOLDER') {
                if (data.id === folder.id) return; // Cannot drop on self

                if (position === 'center') {
                    onMoveFolder(data.id, folder.id); // Nesting
                } else if (position === 'left') {
                    onReorderFolder(data.id, folder.id, 'before');
                } else if (position === 'right') {
                    onReorderFolder(data.id, folder.id, 'after');
                }
            }
        } catch (error) {
            console.error("Error parsing drag data", error);
        }
    };

    return (
        <div 
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnter={(e) => {
                e.preventDefault();
                // Initial enter assumes center until moved
                // setDragPosition('center'); 
            }}
            onDragLeave={() => setDragPosition(null)}
            onDrop={handleDrop}
            onClick={onClick}
            className={`relative group bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col items-center justify-center p-4 aspect-square cursor-pointer transform hover:-translate-y-1 border-l-4 border-r-4 
                ${dragPosition === 'center' ? 'ring-2 ring-indigo-500 bg-indigo-50 scale-105 border-transparent' : ''}
                ${dragPosition === 'left' ? 'border-l-indigo-600 border-r-transparent' : ''}
                ${dragPosition === 'right' ? 'border-r-indigo-600 border-l-transparent' : ''}
                ${!dragPosition ? 'border-transparent' : ''}
            `}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
            aria-label={`Open folder ${folder.name}`}
        >
            {/* 3-Dots Menu Button */}
            <div className="absolute top-2 right-2 z-20" ref={menuRef}>
                <button
                    onClick={handleMenuClick}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Folder options"
                    aria-haspopup="true"
                    aria-expanded={menuOpen}
                >
                    <EllipsisVerticalIcon className="w-6 h-6" />
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl ring-1 ring-black ring-opacity-5 z-30 transform origin-top-right">
                        <div className="py-1" role="menu" aria-orientation="vertical">
                            <button
                                onClick={(e) => handleAction(e, () => onViewProperties(folder))}
                                className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                                role="menuitem"
                            >
                                <InfoIcon className="w-4 h-4 mr-3" />
                                {t('folderMenu.properties')}
                            </button>
                            <button
                                onClick={(e) => handleAction(e, () => onEdit(folder.id))}
                                className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                                role="menuitem"
                            >
                                <PencilIcon className="w-4 h-4 mr-3" />
                                {t('folderMenu.rename')}
                            </button>
                            <button
                                onClick={(e) => handleAction(e, handleDelete)}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                                role="menuitem"
                            >
                                <TrashIcon className="w-4 h-4 mr-3" />
                                {t('folderMenu.delete')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <FolderIcon className={`w-16 h-16 mb-2 transition-colors ${dragPosition === 'center' ? 'text-indigo-600' : 'text-indigo-500'}`} />
            <h3 className="text-md font-bold text-center text-slate-800 truncate w-full px-2" title={folder.name}>
                {folder.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
                {documentCount} {documentCount === 1 ? t('folderCard.item') : t('folderCard.items')}
            </p>
        </div>
    );
};

export default FolderCard;
