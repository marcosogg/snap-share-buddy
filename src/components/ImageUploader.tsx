import React, { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from "@/integrations/supabase/client";

interface AnalysisResult {
  word: string;
  definition: string;
  sampleSentence: string;
}

const ImageUploader = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const { toast } = useToast();

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
    handleImageUpload(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file.",
      });
      return;
    }

    setIsLoading(true);
    setAnalysisResults([]);

    try {
      // Create form data for the file
      const formData = new FormData();
      formData.append('file', file);

      // Call the analyze-image function
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: formData,
      });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No data received from analysis');
      }

      // Get the public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('analyzed_images')
        .getPublicUrl(data.imagePath);

      setImage(publicUrl);
      setAnalysisResults(data.analysis);

      toast({
        title: "Success!",
        description: "Image analyzed successfully.",
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: error.message || "There was an error analyzing your image.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 p-4">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Image to Dictionary</h1>
          <p className="text-gray-500">Upload an image to identify words and objects, get their definitions and example sentences</p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-12 transition-all ease-in-out duration-200",
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
            image ? "bg-white" : "bg-gray-50"
          )}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isLoading}
          />
          
          {isLoading ? (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500">Analyzing image...</p>
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
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          )}
        </div>

        {analysisResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Analysis Results</h2>
            <div className="grid gap-6">
              {analysisResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <h3 className="text-xl font-medium text-gray-900">{result.word}</h3>
                  <p className="text-gray-600"><span className="font-medium">Definition:</span> {result.definition}</p>
                  <p className="text-gray-600"><span className="font-medium">Example:</span> {result.sampleSentence}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;