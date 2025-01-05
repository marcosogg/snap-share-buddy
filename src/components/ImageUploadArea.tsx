import React, { useState, useCallback } from 'react';
import { Upload, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImageUploadAreaProps {
  isLoading: boolean;
  image: string | null;
  onImageUpload: (file: File) => void;
}

const ImageUploadArea = ({ isLoading, image, onImageUpload }: ImageUploadAreaProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    onImageUpload(file);
  }, [onImageUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-12 transition-all ease-in-out duration-200",
          isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600",
          image ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={isLoading}
        />
        
        {isLoading ? (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Analyzing image...</p>
          </div>
        ) : image ? (
          <div className="relative group">
            <img
              src={image}
              alt="Uploaded preview"
              className="max-h-[400px] mx-auto rounded-lg shadow-lg animate-fade-in"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 rounded-lg flex items-center justify-center">
              <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Click or drag to upload a new image
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 10MB</p>
          </div>
        )}
      </div>

      <Button 
        onClick={triggerFileInput} 
        className="w-full"
        disabled={isLoading}
      >
        <Plus className="w-4 h-4 mr-2" />
        {image ? 'Upload New Image' : 'Upload Image'}
      </Button>
    </div>
  );
};

export default ImageUploadArea;