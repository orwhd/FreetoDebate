import React, { useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { X, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SettingsModal: React.FC = () => {
  const { showSettings, toggleSettings } = useSettingsStore();
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
      setErrorMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform_name', 'default');

    try {
      const response = await fetch('http://localhost:8000/api/upload_knowledge_base', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setUploadStatus('success');
      setTimeout(() => {
        setFile(null);
        setUploadStatus('idle');
      }, 3000);
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <AnimatePresence>
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-app-panel border border-app-border rounded-xl w-full max-w-lg overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,240,255,0.2)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-app-border/50 bg-app-bg/50">
              <h2 className="text-xl font-display font-bold text-white flex items-center gap-3">
                <Upload className="text-app-primary" />
                Upload Knowledge Base
              </h2>
              <button onClick={() => toggleSettings(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="bg-black/30 border border-app-border rounded-lg p-4 text-sm text-gray-400">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                  <AlertCircle size={16} className="text-app-weibo" />
                  JSON Format Rules
                </h3>
                <ul className="list-disc list-inside space-y-1 font-mono text-xs">
                  <li>File must be a valid <strong>.json</strong> file.</li>
                  <li>Root object should contain item IDs as keys.</li>
                  <li>Each item must have a <strong>"title"</strong> and <strong>"clusters"</strong> array.</li>
                  <li>"clusters" must contain objects with a <strong>"comments"</strong> array of strings.</li>
                </ul>
                <div className="mt-3 p-2 bg-black/50 rounded border border-app-border/30 font-mono text-xs text-gray-500 overflow-x-auto">
                  {`{
  "item_1": {
    "title": "Topic Title",
    "clusters": [
      { "comments": ["comment 1", "comment 2"] }
    ]
  }
}`}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block w-full cursor-pointer group">
                  <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
                  <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    file ? 'border-app-primary bg-app-primary/5' : 'border-app-border hover:border-app-primary/50 hover:bg-white/5'
                  }`}>
                    {file ? (
                      <div className="flex flex-col items-center gap-2">
                         <div className="w-10 h-10 bg-app-primary/20 rounded-full flex items-center justify-center text-app-primary">
                            <CheckCircle size={20} />
                         </div>
                         <span className="font-bold text-white">{file.name}</span>
                         <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-white">
                        <Upload size={32} />
                        <span className="font-bold">Click to select JSON file</span>
                      </div>
                    )}
                  </div>
                </label>

                {file && (
                  <button
                    onClick={handleUpload}
                    disabled={uploadStatus === 'uploading' || uploadStatus === 'success'}
                    className={`w-full py-3 rounded-lg font-bold font-display uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                      uploadStatus === 'success' 
                        ? 'bg-green-500 text-white'
                        : uploadStatus === 'error'
                        ? 'bg-red-500 text-white'
                        : 'bg-app-primary text-black hover:bg-white'
                    }`}
                  >
                    {uploadStatus === 'uploading' ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Processing...
                      </>
                    ) : uploadStatus === 'success' ? (
                      <>
                        <CheckCircle />
                        Uploaded & Processing Started
                      </>
                    ) : uploadStatus === 'error' ? (
                      'Upload Failed'
                    ) : (
                      'Upload to Default Knowledge Base'
                    )}
                  </button>
                )}

                {uploadStatus === 'error' && (
                  <p className="text-red-400 text-xs text-center font-mono">{errorMessage}</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
