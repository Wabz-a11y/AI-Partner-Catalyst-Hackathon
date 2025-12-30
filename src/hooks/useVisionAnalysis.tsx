// hooks/useVisionAnalysis.ts
import { useState, useCallback, useEffect } from 'react';

interface VisionAnalysis {
  id: string;
  fileName: string;
  mimeType: string;
  thumbnail: string;
  analysis: string;
  timestamp: Date;
}

interface UseVisionAnalysisReturn {
  analyses: VisionAnalysis[];
  isAnalyzing: boolean;
  error: string | null;
  analyzeFile: (file: File, profession?: string, context?: string) => Promise<VisionAnalysis | null>;
  clearAnalyses: () => void;
  removeAnalysis: (id: string) => void;
}

export function useVisionAnalysis(): UseVisionAnalysisReturn {
  const [analyses, setAnalyses] = useState<VisionAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup thumbnails on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      analyses.forEach((a) => URL.revokeObjectURL(a.thumbnail));
    };
  }, [analyses]);

  const analyzeFile = useCallback(
    async (file: File, profession?: string, context?: string): Promise<VisionAnalysis | null> => {
      // Optional: Add reasonable file size limit (~12MB original file → ~16MB base64)
      if (file.size > 15 * 1024 * 1024) {
        setError('File too large. Please upload files under 15MB.');
        return null;
      }

      setIsAnalyzing(true);
      setError(null);

      let thumbnail: string | null = null;

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        thumbnail = URL.createObjectURL(file);

        const prompt = `You are a highly skilled AI vision analyst${profession ? ` specializing in ${profession}` : ''}.

Analyze the uploaded image/document thoroughly and produce a clear, professional, structured report.

**Document Type**  
Identify the type (e.g., invoice, scientific diagram, legal form, witness statement, chart, handwritten note, etc.).

**Content Summary**  
2–4 sentence plain-language overview of what the document shows or contains.

**Key Details**  
- Transcribe important text accurately
- Describe diagrams, tables, charts, or figures precisely
- Extract critical data (names, dates, numbers, findings, etc.)

**Explanation & Significance**  
Explain the meaning and implications in simple terms. Highlight key insights or purpose.

**Conclusion**  
One short paragraph with the main takeaway.

Rules:
- Use **bold** for section headers and key terms
- Short paragraphs, bullets, clean spacing
- Maximum 3 relevant emojis (if any)
- Under 6 total sections
- Be accurate and objective — no speculation
- If text is blurry/unreadable, state clearly
${context ? `\n\nUser context: ${context}` : ''}`;

        // Use Vite env variable for API base URL (critical for deployment!)
        const API_BASE = import.meta.env.VITE_API_URL || '';

        const response = await fetch(`${API_BASE}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            base64,
            mimeType: file.type || 'application/octet-stream',
            prompt,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server error: ${response.status}`);
        }

        const { analysis } = await response.json();
        if (!analysis?.trim()) {
          throw new Error('Empty analysis received from server');
        }

        const newAnalysis: VisionAnalysis = {
          id: crypto.randomUUID(),
          fileName: file.name,
          mimeType: file.type,
          thumbnail,
          analysis: analysis.trim(),
          timestamp: new Date(),
        };

        setAnalyses((prev) => [...prev, newAnalysis]);
        return newAnalysis;
      } catch (err) {
        console.error('Vision analysis error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Analysis failed';
        setError(errorMsg);

        // Clean up thumbnail on error
        if (thumbnail) URL.revokeObjectURL(thumbnail);

        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  const clearAnalyses = useCallback(() => {
    analyses.forEach((a) => URL.revokeObjectURL(a.thumbnail));
    setAnalyses([]);
    setError(null);
  }, [analyses]);

  const removeAnalysis = useCallback((id: string) => {
    setAnalyses((prev) => {
      const toRemove = prev.find((a) => a.id === id);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.thumbnail);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  return {
    analyses,
    isAnalyzing,
    error,
    analyzeFile,
    clearAnalyses,
    removeAnalysis,
  };
}