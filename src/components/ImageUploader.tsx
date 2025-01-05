import React, { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      const fileName = `${crypto.randomUUID()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('analyzed_images')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('analyzed_images')
        .getPublicUrl(fileName);

      setImage(publicUrl);

      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: JSON.stringify({ image: publicUrl }),
      });

      if (error) {
        throw error;
      }

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
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="border-none shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              Image to Dictionary
            </CardTitle>
            <CardDescription className="text-lg">
              Upload an image to identify words and objects, get their definitions and example sentences
            </CardDescription>
          </CardHeader>
        </Card>

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
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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

        {analysisResults.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {analysisResults.map((result, index) => (
              <Card key={index} className="overflow-hidden transition-all duration-200 hover:shadow-lg">
                <CardHeader className="space-y-1 pb-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {result.word}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Definition</h4>
                    <p className="text-sm">{result.definition}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Example</h4>
                    <p className="text-sm italic">{result.sampleSentence}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;