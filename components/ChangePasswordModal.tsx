
import React, { useState } from 'react';
import { XIcon } from './icons/XIcon';
import { useTranslation } from '../hooks/useTranslation';
import { DownloadIcon } from './icons/DownloadIcon';
import { EyeIcon } from './icons/EyeIcon';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChangePassword: (newPassword: string) => Promise<void>;
    isForced?: boolean;
    recoveryPhrase?: string | null;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onChangePassword, isForced, recoveryPhrase }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showRecoveryKey, setShowRecoveryKey] = useState(false);
    const { t } = useTranslation();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 4) {
            setError(t('changePasswordModal.errorLength'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('changePasswordModal.errorMatch'));
            return;
        }

        setIsLoading(true);
        try {
            await onChangePassword(password);
            // If forced, the parent component handles closing/state change usually, 
            // but we can also call onClose here if the parent updates the 'isForced' prop based on success.
            if (!isForced) onClose();
        } catch (err) {
            console.error(err);
            setError(t('changePasswordModal.errorGeneric'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadKey = () => {
        if (!recoveryPhrase) return;
        const element = document.createElement("a");
        const file = new Blob([`DocuVault Recovery Key: ${recoveryPhrase}\n\nKEEP THIS SAFE. IF YOU LOSE YOUR PASSWORD, THIS IS THE ONLY WAY TO RECOVER YOUR DATA.`], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = "docuvault-recovery-key.txt";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">{t('changePasswordModal.title')}</h2>
                    {!isForced && (
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <XIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
                
                {isForced && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
                        {t('changePasswordModal.recoveryMessage')}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('changePasswordModal.newPassword')}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('changePasswordModal.confirmPassword')}
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    
                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex justify-end pt-2">
                         {!isForced && (
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="mr-3 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md"
                            >
                                {t('common.cancel')}
                            </button>
                         )}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 transition-colors"
                        >
                            {isLoading ? t('common.processing') : t('changePasswordModal.submit')}
                        </button>
                    </div>
                </form>

                {/* Recovery Key Section - Only shown if not forced recovery flow and key exists */}
                {!isForced && recoveryPhrase && (
                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <h3 className="text-md font-semibold text-slate-800 mb-2">{t('changePasswordModal.recoveryKeyTitle')}</h3>
                        <p className="text-xs text-slate-500 mb-3">{t('changePasswordModal.recoveryKeyDesc')}</p>
                        
                        {!showRecoveryKey ? (
                            <button 
                                onClick={() => setShowRecoveryKey(true)}
                                className="w-full flex items-center justify-center py-2 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                            >
                                <EyeIcon className="w-4 h-4 mr-2 text-slate-500" />
                                {t('changePasswordModal.showKey')}
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <div className="p-3 bg-slate-100 rounded-md border border-slate-200">
                                    <code className="block text-xs font-mono break-all text-slate-700">
                                        {recoveryPhrase}
                                    </code>
                                </div>
                                <div className="flex space-x-2">
                                    <button 
                                        onClick={handleDownloadKey}
                                        className="flex-1 flex items-center justify-center py-2 px-3 border border-indigo-300 rounded-lg shadow-sm text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                    >
                                        <DownloadIcon className="w-4 h-4 mr-2" />
                                        {t('authModal.downloadKey')}
                                    </button>
                                    <button 
                                        onClick={() => setShowRecoveryKey(false)}
                                        className="flex-none py-2 px-3 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                    >
                                        {t('common.hide')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChangePasswordModal;
