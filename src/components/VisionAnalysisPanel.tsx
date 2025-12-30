//VisionAnalysisPanel.tsx
import { useRef } from 'react';
import { ImagePlus, X, FileText, Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VisionAnalysis {
  id: string;
  fileName: string;
  mimeType: string;
  thumbnail: string;
  analysis: string;
  timestamp: Date;
}

interface VisionAnalysisPanelProps {
  analyses: VisionAnalysis[];
  isAnalyzing: boolean;
  error: string | null;
  onFileSelect: (file: File) => void;
  onRemove: (id: string) => void;
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
}

export function VisionAnalysisPanel({
  analyses,
  isAnalyzing,
  error,
  onFileSelect,
  onRemove,
  expandedId,
  onToggleExpand,
}: VisionAnalysisPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = '';
    }
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  return (
    <div className="rounded-xl bg-secondary/30 border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Vision Analysis
        </h4>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          className="btn-ghost text-sm flex items-center gap-1.5 px-3 py-1.5"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <ImagePlus className="w-4 h-4" />
              Add File
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mb-3 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {analyses.length === 0 && !isAnalyzing ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Upload an image or document for Brenda to analyze and discuss with you
        </p>
      ) : (
        <div className="space-y-3">
          {analyses.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border border-border bg-background/50 overflow-hidden transition-all",
                expandedId === item.id && "ring-2 ring-primary/50"
              )}
            >
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/50"
                onClick={() => onToggleExpand(expandedId === item.id ? null : item.id)}
              >
                {isImage(item.mimeType) ? (
                  <img
                    src={item.thumbnail}
                    alt={item.fileName}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {expandedId === item.id && (
                <div className="border-t border-border p-3 bg-secondary/20">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Analysis:</p>
                  <div className="text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {item.analysis}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isAnalyzing && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50">
              <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
              <div>
                <p className="font-medium text-sm">Analyzing...</p>
                <p className="text-xs text-muted-foreground">Using Brenda Vision</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
