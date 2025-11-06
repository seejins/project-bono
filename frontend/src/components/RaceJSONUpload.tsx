import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSeason } from '../contexts/SeasonContext';

export const RaceJSONUpload: React.FC = () => {
  const { currentSeason } = useSeason();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      // Add new files to existing list (avoid duplicates by name)
      setFiles(prevFiles => {
        const existingNames = new Set(prevFiles.map(f => f.name));
        const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name));
        const updated = [...prevFiles, ...uniqueNewFiles];
        console.log(`Total files: ${updated.length}`, updated.map(f => f.name));
        return updated;
      });
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setResult({ success: false, message: 'Please select at least one file' });
      return;
    }

    if (!currentSeason) {
      setResult({ success: false, message: 'Please select a season first' });
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('raceFiles', file);
      });
      formData.append('seasonId', currentSeason.id);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/races/import-json-batch`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        const totalImported = data.results?.reduce((sum: number, r: any) => sum + (r.importedCount || 0), 0) || 0;
        const successful = data.results?.filter((r: any) => r.success).length || 0;
        const failed = data.results?.filter((r: any) => !r.success).length || 0;
        
        setResult({
          success: failed === 0,
          message: `Imported ${successful} file(s) successfully${failed > 0 ? `, ${failed} failed` : ''}. Total: ${totalImported} driver results.`,
          details: {
            raceId: data.raceId, // Grouped race ID
            results: data.results,
            totalImported
          }
        });
        setFiles([]);
        // Reset file input
        const fileInput = document.getElementById('race-json-file') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
          // Trigger change event to ensure state is updated
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        setResult({
          success: false,
          message: data.error || 'Upload failed',
          details: data.details
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
      <div className="flex items-center space-x-2 mb-4">
        <Upload className="w-5 h-5 text-red-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Import Race JSON</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select JSON File(s) - Multiple files for the same track will be grouped into one event
          </label>
          <input
            id="race-json-file"
            type="file"
            accept=".json"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-red-600 file:text-white
              hover:file:bg-red-700
              file:cursor-pointer
              cursor-pointer"
            disabled={uploading}
          />
          {files.length > 0 && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium">Selected files ({files.length}):</p>
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    const fileInput = document.getElementById('race-json-file') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                  }}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs underline"
                >
                  Clear all
                </button>
              </div>
              <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center justify-between group">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFiles(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="ml-2 text-red-600 hover:text-red-700 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      title="Remove file"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Tip: Click "Choose File" again to add more files, or select multiple files at once with Ctrl/Cmd+Click
              </p>
            </div>
          )}
        </div>

        {currentSeason && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Season: <span className="font-medium">{currentSeason.name}</span>
          </div>
        )}

        {!currentSeason && (
          <div className="text-sm text-yellow-600 dark:text-yellow-400">
            ⚠️ Please select a season first
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={files.length === 0 || !currentSeason || uploading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading {files.length} file(s)...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Upload and Import {files.length > 0 ? `(${files.length} file${files.length > 1 ? 's' : ''})` : ''}</span>
            </>
          )}
        </button>

        {result && (
          <div className={`p-4 rounded-lg ${
            result.success
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start space-x-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  result.success
                    ? 'text-green-800 dark:text-green-300'
                    : 'text-red-800 dark:text-red-300'
                }`}>
                  {result.message}
                </p>
                {result.details && result.success && (
                  <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                    <p>Race ID: {result.details.raceId}</p>
                    <p>Total Imported: {result.details.totalImported} drivers</p>
                    {result.details.results && (
                      <div className="mt-2">
                        <p className="font-medium">File Results:</p>
                        <ul className="list-disc list-inside ml-2">
                          {result.details.results.map((r: any, idx: number) => (
                            <li key={idx}>
                              {r.file}: {r.success ? `${r.importedCount} drivers` : `Failed - ${r.error}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {result.details && !result.success && (
                  <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(result.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
