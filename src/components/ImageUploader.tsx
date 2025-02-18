import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import ImageUploadArea from './ImageUploadArea';
import AnalysisResults from './AnalysisResults';

interface AnalysisResult {
  word: string;
  definition: string;
  sampleSentence: string;
}

const ImageUploader = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const { toast } = useToast();

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

      const results = data.analysis;
      setAnalysisResults(results);

      // Save each analysis result to Supabase
      for (const result of results) {
        const { error: insertError } = await supabase
          .from('word_analyses')
          .insert({
            word: result.word,
            definition: result.definition,
            sample_sentence: result.sampleSentence,
          });

        if (insertError) {
          console.error('Error saving analysis:', insertError);
          toast({
            variant: "destructive",
            title: "Error saving analysis",
            description: "Some analyses couldn't be saved to the database.",
          });
        }
      }

      toast({
        title: "Success!",
        description: "Image analyzed and results saved successfully.",
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
          <CardContent className="flex justify-center">
            <Link to="/saved-analyses">
              <Button variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                View Saved Analyses
              </Button>
            </Link>
          </CardContent>
        </Card>

        <ImageUploadArea 
          isLoading={isLoading}
          image={image}
          onImageUpload={handleImageUpload}
        />

        <AnalysisResults results={analysisResults} />
      </div>
    </div>
  );
};

export default ImageUploader;