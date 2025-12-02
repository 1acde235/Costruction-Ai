import React, { useRef, useState } from 'react';
import { UploadCloud, FileType, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  error?: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, error }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPass(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPass(e.target.files[0]);
    }
  };

  const validateAndPass = (file: File) => {
    onFileSelect(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ease-in-out cursor-pointer group
          ${isDragging 
            ? 'border-brand-500 bg-brand-50 scale-[1.02]' 
            : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50 bg-white'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/png,image/jpeg,application/pdf" 
          onChange={handleFileChange}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`p-4 rounded-full bg-slate-100 text-slate-400 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors duration-300`}>
            <UploadCloud className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-800 mb-1">Upload Blueprint or Drawing</h3>
            <p className="text-slate-500 text-sm">Drag & drop or click to browse</p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 border border-slate-200 rounded-full px-3 py-1">
            <FileType className="w-3 h-3" />
            <span>PDF, PNG, JPG supported</span>
          </div>
          <p className="text-xs text-slate-400 pt-2">
            Note: DWG files should be exported to PDF first.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-red-700">
            <p className="font-medium">Upload failed</p>
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
