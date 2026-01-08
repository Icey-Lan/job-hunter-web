import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, RefreshCw, AlertCircle, Square } from 'lucide-react';
import type { Task } from '../types';

interface FailedTasksModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRetrySuccess: () => void;
}

export const FailedTasksModal: React.FC<FailedTasksModalProps> = ({ isOpen, onClose, onRetrySuccess }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchFailedTasks();
        }
    }, [isOpen]);

    const fetchFailedTasks = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/tasks/failed');
            setTasks(res.data);
            // Default select all? No, maybe safer to let user select
        } catch (error) {
            console.error("Failed to fetch failed tasks", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (url: string) => {
        const newSelected = new Set(selectedUrls);
        if (newSelected.has(url)) {
            newSelected.delete(url);
        } else {
            newSelected.add(url);
        }
        setSelectedUrls(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedUrls.size === tasks.length) {
            setSelectedUrls(new Set());
        } else {
            setSelectedUrls(new Set(tasks.map(t => t.url)));
        }
    };

    const handleRetry = async () => {
        if (selectedUrls.size === 0) return;
        setRetrying(true);
        try {
            await axios.post('/api/tasks/retry', { urls: Array.from(selectedUrls) });
            onRetrySuccess();
            onClose();
            setSelectedUrls(new Set());
        } catch (error) {
            console.error("Failed to retry tasks", error);
            alert("Failed to submit retry request");
        } finally {
            setRetrying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-white/20">
                {/* Header */}
                <div className="p-6 border-b border-gray-200/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Failed Tasks</h2>
                            <p className="text-sm text-gray-500">Select tasks to retry ({tasks.length} total failures)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center p-8 text-gray-500">Loading failed tasks...</div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center p-12 text-gray-500">No failed tasks found. Great job! 🎉</div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                                <button
                                    onClick={handleSelectAll}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                    {selectedUrls.size === tasks.length ? <CheckCircleIcon /> : <Square className="h-4 w-4" />}
                                    {selectedUrls.size === tasks.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <span className="text-sm text-gray-400">|</span>
                                <span className="text-sm text-gray-500">{selectedUrls.size} selected</span>
                            </div>

                            <div className="space-y-3">
                                {tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleSelect(task.url)}
                                        className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-4
                                            ${selectedUrls.has(task.url)
                                                ? 'bg-rose-50 border-rose-200 shadow-sm'
                                                : 'bg-white border-gray-100 hover:border-gray-300'}`}
                                    >
                                        <div className={`mt-1 transition-colors ${selectedUrls.has(task.url) ? 'text-rose-600' : 'text-gray-300 group-hover:text-gray-400'}`}>
                                            {selectedUrls.has(task.url) ? <CheckCircleIcon /> : <Square className="h-5 w-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 break-all line-clamp-1" title={task.url}>{task.url}</p>
                                            <p className="text-sm text-rose-600 mt-1 font-mono bg-rose-50 inline-block px-2 py-0.5 rounded text-xs break-all">
                                                {task.error || "Unknown error"}
                                            </p>
                                        </div>
                                        <div className="text-xs text-gray-400 whitespace-nowrap mt-1">
                                            {new Date(task.updated_at).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200/50 flex justify-end gap-3 bg-gray-50/50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200/50 rounded-lg transition-colors"
                        disabled={retrying}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRetry}
                        disabled={selectedUrls.size === 0 || retrying}
                        className={`px-6 py-2 rounded-lg font-medium text-white flex items-center gap-2 shadow-lg shadow-rose-500/20
                            ${selectedUrls.size === 0
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all'}`}
                    >
                        {retrying ? (
                            <>Processing...</>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4" />
                                Retry Selected ({selectedUrls.size})
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Simple Icon helpers
const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);
