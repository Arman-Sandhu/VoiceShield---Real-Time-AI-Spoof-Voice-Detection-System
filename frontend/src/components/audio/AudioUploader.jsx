import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, Trash2, AlertCircle, Scissors, Pencil, Check, X } from 'lucide-react';
import Button from '../ui/Button';
import AudioPlayer from './AudioPlayer';
import AudioCropper from './AudioCropper';

export default function AudioUploader({ onAudioReady, onReset }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [customName, setCustomName] = useState('');
  const inputRef = useRef(null);

  const supportedExtensions = ['.wav', '.mp3', '.ogg', '.flac'];
  const maxSizeBytes = 15 * 1024 * 1024; // 15MB

  const validateAndSelectFile = (file) => {
    setErrorMessage(null);
    if (!file) return;

    // Check extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!supportedExtensions.includes(ext) && !file.type.startsWith('audio/')) {
      setErrorMessage(
        `Unsupported audio format '${ext}'. Please upload standard audio files: WAV, MP3, OGG, or FLAC.`
      );
      return;
    }

    // Check size
    if (file.size > maxSizeBytes) {
      setErrorMessage(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 15MB.`
      );
      return;
    }

    if (file.size < 100) {
      setErrorMessage('Audio file is empty or corrupted (under 100 bytes).');
      return;
    }

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setFileUrl(url);

    if (onAudioReady) {
      onAudioReady(file, url);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const handleCropComplete = (newFile, newBlob, newDuration) => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    const newUrl = URL.createObjectURL(newBlob);
    setSelectedFile(newFile);
    setFileUrl(newUrl);
    setShowCropper(false);
    if (onAudioReady) {
      onAudioReady(newFile, newUrl);
    }
  };

  const handleStartRename = () => {
    if (!selectedFile) return;
    setCustomName(selectedFile.name);
    setIsEditingName(true);
  };

  const handleSaveRename = (e) => {
    if (e) e.preventDefault();
    if (!selectedFile) return;

    let trimmed = customName.trim();
    if (!trimmed) {
      setIsEditingName(false);
      return;
    }

    const dotIndex = selectedFile.name.lastIndexOf('.');
    const ext = dotIndex !== -1 ? selectedFile.name.substring(dotIndex) : '.wav';

    if (!trimmed.includes('.')) {
      trimmed += ext;
    }

    const renamed = new File([selectedFile], trimmed, { type: selectedFile.type });
    setSelectedFile(renamed);
    setIsEditingName(false);
    if (onAudioReady) {
      onAudioReady(renamed, fileUrl);
    }
  };

  const removeFile = () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setSelectedFile(null);
    setFileUrl(null);
    setShowCropper(false);
    setIsEditingName(false);
    setCustomName('');
    setErrorMessage(null);
    if (inputRef.current) inputRef.current.value = '';
    if (onReset) onReset();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Upload Dropzone */}
      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
            dragActive
              ? 'border-[#00d4ff] bg-[#00d4ff]/10 shadow-[0_0_30px_rgba(0,212,255,0.2)]'
              : 'border-white/10 hover:border-[#00d4ff]/50 bg-[#0f1117]/80 hover:bg-[#161b27]/80'
          }`}
        >
          <input
            id="audio-file-input"
            data-testid="audio-file-input"
            ref={inputRef}
            type="file"
            accept=".wav,.mp3,.ogg,.flac,audio/*"
            onChange={handleChange}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00d4ff]/20 to-[#a855f7]/20 border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff] mb-4 shadow-lg">
            <UploadCloud size={32} />
          </div>

          <h4 className="text-base font-semibold text-white mb-1">
            Drag & Drop Audio Clip Here
          </h4>
          <p className="text-xs text-slate-400 mb-4 text-center">
            Supports English speech in WAV, MP3, FLAC, or OGG (up to 15MB)
          </p>

          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Browse Audio Files
          </Button>
        </div>
      ) : (
        /* Preview of Selected File */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#0f1117] border border-white/[0.08]">
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
              <div className="w-10 h-10 rounded-lg bg-[#00d4ff]/15 border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff] shrink-0">
                <FileAudio size={20} />
              </div>
              <div className="min-w-0 flex-1">
                {isEditingName ? (
                  <form onSubmit={handleSaveRename} className="flex items-center gap-1.5 py-0.5">
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                      className="bg-[#161b27] border border-[#00d4ff]/60 rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none focus:ring-1 focus:ring-[#00d4ff] w-full max-w-xs"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="p-1 rounded bg-[#00d4ff]/20 text-[#00d4ff] hover:bg-[#00d4ff]/30 transition-colors"
                      title="Save name"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-1 rounded bg-white/5 text-slate-400 hover:text-white transition-colors"
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-medium text-white truncate max-w-xs sm:max-w-md" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <button
                      type="button"
                      onClick={handleStartRename}
                      className="p-1 rounded-md text-slate-400 hover:text-[#00d4ff] hover:bg-white/5 transition-colors shrink-0"
                      title="Rename audio file"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
                <p className="text-xs font-mono text-slate-400">
                  {formatFileSize(selectedFile.size)} &bull; {selectedFile.type || 'audio file'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCropper(!showCropper)}
                icon={Scissors}
                title="Crop or trim audio selection"
              >
                {showCropper ? 'Close Cropper' : 'Crop Audio'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                icon={Trash2}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              >
                Remove
              </Button>
            </div>
          </div>

          {showCropper ? (
            <AudioCropper
              audioFile={selectedFile}
              onCropComplete={handleCropComplete}
              onCancel={() => setShowCropper(false)}
            />
          ) : (
            fileUrl && (
              <AudioPlayer
                audioUrl={fileUrl}
                audioFile={selectedFile}
                fileName={selectedFile.name}
                title={selectedFile.name}
              />
            )
          )}
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
