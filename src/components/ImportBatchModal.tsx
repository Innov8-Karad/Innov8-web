import { useState, useEffect } from 'react';
import { Search, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import { batchService } from '../services/batchService';
import type { Batch } from '../types';
import { useToast } from '../hooks/useToast';

interface ImportBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetBatchId: string;
    onImportComplete: () => void;
}

export default function ImportBatchModal({ isOpen, onClose, targetBatchId, onImportComplete }: ImportBatchModalProps) {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        if (!isOpen) return;
        
        const fetchBatches = async () => {
            try {
                const data = await batchService.fetchBatches();
                // Filter out the target batch itself
                setBatches(data.filter(b => b.id !== targetBatchId));
            } catch (error) {
                console.error("Error fetching batches for import:", error);
                showToast("Failed to load batches", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchBatches();
    }, [isOpen, targetBatchId, showToast]);

    const handleImport = async (sourceBatchId: string, sourceBatchName: string) => {
        if (!window.confirm(`Are you sure you want to import all content from "${sourceBatchName}"? This will add all its folders and lectures to your current batch.`)) {
            return;
        }

        setImporting(true);
        try {
            await batchService.cloneBatchCurriculum(sourceBatchId, targetBatchId);
            showToast("Content imported successfully", "success");
            onImportComplete();
            onClose();
        } catch (error) {
            console.error("Error importing batch curriculum:", error);
            showToast("Failed to import content", "error");
        } finally {
            setImporting(false);
        }
    };

    const filteredBatches = batches.filter(b => 
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.courseName && b.courseName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Content from Batch" maxWidth="600px">
            <div className="p-4">
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search size={18} style={{ position: 'absolute', top: '12px', left: '14px', color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        placeholder="Search source batch by name or course..." 
                        className="form-input"
                        style={{ paddingLeft: '44px', height: '44px', borderRadius: '12px' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {loading ? (
                        <div className="flex flex-col items-center py-10 text-muted">
                            <Loader2 className="animate-spin mb-2" size={24} />
                            <p>Loading available batches...</p>
                        </div>
                    ) : filteredBatches.length === 0 ? (
                        <div className="text-center py-10 text-muted border border-dashed rounded-xl border-divider">
                            <p>No batches found</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredBatches.map(batch => (
                                <div 
                                    key={batch.id} 
                                    className="flex justify-between items-center p-4 border border-divider rounded-xl hover:bg-secondary/20 transition-colors group cursor-pointer"
                                    onClick={() => !importing && handleImport(batch.id, batch.name)}
                                >
                                    <div>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{batch.name}</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                            {batch.courseName} • {batch.studentCount} students
                                        </p>
                                    </div>
                                    <button 
                                        className="btn btn-sm btn-secondary flex items-center gap-2"
                                        disabled={importing}
                                    >
                                        {importing ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                                        Import
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
                    <div className="flex gap-3">
                        <CheckCircle2 size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            <strong>Tip:</strong> Importing will copy all folders and lectures from the source batch. Existing content in your current batch will not be deleted.
                        </p>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
