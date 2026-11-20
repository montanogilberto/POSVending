import { useRef, useState } from 'react';
import { analyzeBusinessMenu, BusinessMenuRequest } from './BusinessMenuApi';
import { MAX_MENU_FILE_BYTES } from './BusinessMenuConstants';
import type { BusinessMenuResult, MenuSourceMode } from './BusinessMenuTypes';

interface UseBusinessMenuArgs {
  businessName: string;
  /** Kept by the wizard so the result survives leaving and re-entering the step. */
  result: BusinessMenuResult | null;
  onResult: (result: BusinessMenuResult | null) => void;
}

const readAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

export const useBusinessMenu = ({ businessName, result, onResult }: UseBusinessMenuArgs) => {
  const [mode, setMode] = useState<MenuSourceMode>('file');
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const run = async (req: BusinessMenuRequest) => {
    setAnalyzing(true);
    setError(null);
    try {
      const r = await analyzeBusinessMenu({ ...req, businessName: businessName.trim() || undefined });
      console.log('[BusinessMenu] result readable=%s items=%d modules=%o', r.readable, r.itemCount, r.suggestedModules);
      if (!r.readable) {
        setError(r.summary || 'Eso no parece un menú o catálogo. Prueba con otro archivo.');
        onResult(null);
        return;
      }
      onResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pude analizar tu menú.');
    } finally {
      setAnalyzing(false);
    }
  };

  const pickFile = () => fileInputRef.current?.click();

  const onFileChosen = async (file: File | undefined) => {
    if (fileInputRef.current) fileInputRef.current.value = ''; // same file can be picked again
    if (!file || analyzing) return;
    if (file.size > MAX_MENU_FILE_BYTES) { setError('El archivo es muy grande (máximo 8 MB).'); return; }
    setFileName(file.name);
    try {
      const fileBase64 = await readAsBase64(file);
      await run({ fileBase64, mimeType: file.type, fileName: file.name });
    } catch (err) {
      console.error('[BusinessMenu] read file ERROR', err);
      setError('No pude leer el archivo. Intenta de nuevo.');
    }
  };

  const analyzeUrl = () => {
    if (!url.trim() || analyzing) return;
    setFileName(null);
    run({ url: url.trim() });
  };

  const clear = () => {
    onResult(null);
    setFileName(null);
    setUrl('');
    setError(null);
  };

  return {
    mode, setMode, url, setUrl, fileName, analyzing, error, result,
    fileInputRef, pickFile, onFileChosen, analyzeUrl, clear,
  };
};

export type BusinessMenuVM = ReturnType<typeof useBusinessMenu>;
