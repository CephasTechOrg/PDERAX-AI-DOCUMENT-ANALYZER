/**
 * File Drop Zone Component
 * Handles drag-and-drop file upload with preview
 */

'use client';

import React, { useCallback, useState } from 'react';
import styles from './FileDropZone.module.css';

export interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  disabled?: boolean;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelected,
  accept = '.pdf,.doc,.docx,.txt',
  multiple = false,
  maxSize = 50 * 1024 * 1024, // 50MB default
  disabled = false,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (files: FileList | File[]): boolean => {
      const filesArray = Array.from(files);

      // Check max size
      for (const file of filesArray) {
        if (file.size > maxSize) {
          setError(`File "${file.name}" exceeds maximum size of ${maxSize / 1024 / 1024}MB`);
          return false;
        }
      }

      // Check file type
      const acceptedTypes = accept.split(',').map((t) => t.trim());
      for (const file of filesArray) {
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        const isMimeType = file.type && acceptedTypes.some((t) => file.type.includes(t.replace('.', '')));
        const isExtension = acceptedTypes.includes(fileExt);

        if (!isMimeType && !isExtension) {
          setError(`File type not supported: ${file.name}`);
          return false;
        }
      }

      // Check multiple flag
      if (!multiple && filesArray.length > 1) {
        setError('Only one file is allowed');
        return false;
      }

      return true;
    },
    [accept, maxSize, multiple]
  );

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(e.type === 'dragenter' || e.type === 'dragover');
    }
  }, [disabled]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (disabled) return;

      setError(null);
      if (validateFiles(e.dataTransfer.files)) {
        onFilesSelected(Array.from(e.dataTransfer.files));
      }
    },
    [disabled, validateFiles, onFilesSelected]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      if (e.target.files && validateFiles(e.target.files)) {
        onFilesSelected(Array.from(e.target.files));
      }
    },
    [validateFiles, onFilesSelected]
  );

  return (
    <div
      className={`${styles.dropZone} ${isDragActive ? styles.active : ''} ${
        disabled ? styles.disabled : ''
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled}
        aria-label="Upload file"
        className={styles.input}
        id="file-input"
      />

      <label htmlFor="file-input" className={styles.label}>
        <svg
          className={styles.icon}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <h3 className={styles.title}>
          {isDragActive ? 'Drop your files here' : 'Drag and drop your files here'}
        </h3>
        <p className={styles.description}>
          or click to select files
        </p>
        <p className={styles.hint}>
          Supported formats: {accept}
          <br />
          Max file size: {maxSize / 1024 / 1024}MB
        </p>
      </label>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};

export default FileDropZone;
