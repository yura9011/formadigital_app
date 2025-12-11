import React, { useState, useCallback } from 'react';

interface MediaUploaderProps {
    onUpload: (urls: string[]) => void;
    initialUrls?: string[];
}

export function MediaUploader({ onUpload, initialUrls = [] }: MediaUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previews, setPreviews] = useState<string[]>(initialUrls);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await uploadFiles(Array.from(e.dataTransfer.files));
        }
    }, []);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await uploadFiles(Array.from(e.target.files));
        }
    };

    const uploadFiles = async (files: File[]) => {
        setUploading(true);
        const newUrls: string[] = [];
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

        // Create local previews immediately
        const localPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...localPreviews]);

        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(`${API_URL}/media/upload`, {
                    method: 'POST',
                    body: formData,
                });
                const data = await response.json();
                if (data.url) {
                    newUrls.push(data.url);
                }
            }
            // Pass both backend URLs (for saving) and local previews (for display) if needed
            // For now, we just pass backend URLs, but we should ensure they are accessible.
            // If backend is localhost:3000, and we are on localhost:4200, it should work if CORS is set.
            onUpload(newUrls);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div
                className={`border-4 border-dashed p-8 text-center cursor-pointer transition-all ${isDragging
                    ? 'border-neo-blue bg-neo-blue/10 scale-[1.02]'
                    : 'border-neo-border hover:bg-gray-50'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
            >
                <input
                    type="file"
                    id="file-input"
                    className="hidden"
                    onChange={handleChange}
                    accept="image/*,video/*"
                    multiple
                />
                {uploading ? (
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-neo-border border-t-neo-blue rounded-full animate-spin mb-2"></div>
                        <p className="font-bold text-neo-blue uppercase tracking-widest">Subiendo...</p>
                    </div>
                ) : (
                    <div className="text-neo-text">
                        <p className="text-4xl mb-2">📂</p>
                        <p className="text-lg font-black uppercase mb-1">Arrastra tus archivos aquí</p>
                        <p className="text-sm font-bold">o <span className="text-neo-blue underline decoration-2">haz click para buscar</span></p>
                    </div>
                )}
            </div>

            {/* Preview Grid */}
            {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                    {previews.map((url, index) => (
                        <div key={index} className="relative aspect-square border-4 border-neo-border shadow-neo-sm overflow-hidden group bg-white">
                            <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-neo-text/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="bg-neo-green text-neo-text font-bold px-2 py-1 border-2 border-neo-border shadow-neo-sm text-xs uppercase">Listo</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
