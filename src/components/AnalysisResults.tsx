import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AnalysisResult {
  word: string;
  definition: string;
  sampleSentence: string;
}

interface AnalysisResultsProps {
  results: AnalysisResult[];
}

const AnalysisResults = ({ results }: AnalysisResultsProps) => {
  if (results.length === 0) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {results.map((result, index) => (
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
  );
};

export default AnalysisResults;