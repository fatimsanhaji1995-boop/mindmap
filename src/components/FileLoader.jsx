import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import { Upload, FileJson, AlertCircle, CheckCircle } from 'lucide-react';
import './FileLoader.css';

/**
 * FileLoader Component
 * Provides file loading interface with drag-and-drop support
 * 
 * Props:
 * - onFileSelect: callback when file is selected
 * - onFileLoad: callback when file is loaded
 * - acceptedFormats: array of accepted file extensions (default: ['.json'])
 * - maxFileSize: maximum file size in bytes (default: 10MB)
 * - allowMultiple: whether to allow multiple files (default: false)
 */
export const FileLoader = ({
  onFileSelect,
  onFileLoad,
  acceptedFormats = ['.json'],
  maxFileSize = 10 * 1024 * 1024,
  allowMultiple = false,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadStatus, setLoadStatus] = useState(null); // 'loading', 'success', 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const acceptString = acceptedFormats.join(',');

  const validateFile = (file) => {
    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!acceptedFormats.includes(fileExtension)) {
      setStatusMessage(`Invalid file format. Accepted: ${acceptedFormats.join(', ')}`);
      return false;
    }

    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(2);
      setStatusMessage(`File too large. Maximum size: ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (file) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      setStatusMessage('');
      if (onFileSelect) {
        onFileSelect(file);
      }
    } else {
      setLoadStatus('error');
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleLoadFile = async () => {
    if (!selectedFile) {
      setStatusMessage('Please select a file first');
      setLoadStatus('error');
      return;
    }

    setLoadStatus('loading');
    setStatusMessage('Loading file...');

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          
          // Try to parse as JSON if it's a JSON file
          let data = content;
          if (selectedFile.name.endsWith('.json')) {
            data = JSON.parse(content);
          }

          setLoadStatus('success');
          setStatusMessage(`Successfully loaded: ${selectedFile.name}`);
          
          if (onFileLoad) {
            onFileLoad({
              file: selectedFile,
              data: data,
              content: content,
            });
          }

          // Clear success message after 3 seconds
          setTimeout(() => {
            setLoadStatus(null);
            setStatusMessage('');
          }, 3000);
        } catch (error) {
          setLoadStatus('error');
          setStatusMessage(`Error parsing file: ${error.message}`);
        }
      };

      reader.onerror = () => {
        setLoadStatus('error');
        setStatusMessage('Error reading file');
      };

      reader.readAsText(selectedFile);
    } catch (error) {
      setLoadStatus('error');
      setStatusMessage(`Error: ${error.message}`);
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setLoadStatus(null);
    setStatusMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-loader">
      {/* Drag and Drop Area */}
      <div
        className={`file-loader-dropzone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="file-loader-dropzone-content">
          <Upload className="file-loader-icon" size={32} />
          <p className="file-loader-dropzone-text">
            Drag and drop your file here
          </p>
          <p className="file-loader-dropzone-subtext">
            or click to browse
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultiple}
          accept={acceptString}
          onChange={handleInputChange}
          className="file-loader-input"
        />
      </div>

      <Separator className="my-3" />

      {/* File Info */}
      {selectedFile && (
        <div className="file-loader-info">
          <div className="file-loader-info-header">
            <FileJson size={20} className="file-loader-info-icon" />
            <div className="file-loader-info-details">
              <p className="file-loader-info-name">{selectedFile.name}</p>
              <p className="file-loader-info-size">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div className={`file-loader-status ${loadStatus}`}>
          <div className="file-loader-status-content">
            {loadStatus === 'success' && (
              <CheckCircle size={20} className="file-loader-status-icon" />
            )}
            {loadStatus === 'error' && (
              <AlertCircle size={20} className="file-loader-status-icon" />
            )}
            <p className="file-loader-status-message">{statusMessage}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="file-loader-actions">
        {selectedFile ? (
          <>
            <Button
              onClick={handleLoadFile}
              disabled={loadStatus === 'loading'}
              className="flex-1"
            >
              {loadStatus === 'loading' ? 'Loading...' : 'Load File'}
            </Button>
            <Button
              onClick={handleClearSelection}
              variant="outline"
              className="flex-1"
              disabled={loadStatus === 'loading'}
            >
              Clear
            </Button>
          </>
        ) : (
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            Select File
          </Button>
        )}
      </div>

      {/* Help Text */}
      <div className="file-loader-help">
        <p className="file-loader-help-text">
          <strong>Accepted formats:</strong> {acceptedFormats.join(', ')}
        </p>
        <p className="file-loader-help-text">
          <strong>Max file size:</strong> {(maxFileSize / (1024 * 1024)).toFixed(2)}MB
        </p>
      </div>
    </div>
  );
};

export default FileLoader;
