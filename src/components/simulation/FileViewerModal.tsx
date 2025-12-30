import { X, Download, FileText } from 'lucide-react';

interface UploadedFile {
  id: number;
  name: string;
  url: string;
  type: string;
  date: string;
  originalFile?: File;
  dataUrl?: string;
}

interface FileViewerModalProps {
  file: UploadedFile;
  onClose: () => void;
}

export function FileViewerModal({ file, onClose }: FileViewerModalProps) {
  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = file.type.startsWith('image/');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold truncate max-w-md">{file.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href={file.dataUrl || file.url} 
              download={file.name}
              className="btn-secondary px-3 py-2 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
            <button onClick={onClose} className="btn-icon">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 bg-muted/30">
          {isImage ? (
            <img 
              src={file.dataUrl || file.url} 
              alt={file.name}
              className="max-w-full max-h-[70vh] mx-auto rounded-lg shadow-lg object-contain"
            />
          ) : isPDF ? (
            <div className="w-full h-[70vh] rounded-lg overflow-hidden">
              <iframe
                src={`${file.dataUrl || file.url}#toolbar=1&navpanes=0`}
                className="w-full h-full border-0"
                title={file.name}
              />
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-secondary flex items-center justify-center">
                <FileText className="w-12 h-12 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-2">{file.name}</p>
              <p className="text-muted-foreground mb-6">
                Preview not available for this file type
              </p>
              <a 
                href={file.dataUrl || file.url} 
                download={file.name}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download to View
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
