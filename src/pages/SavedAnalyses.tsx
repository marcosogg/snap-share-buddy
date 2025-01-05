import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const SavedAnalyses = () => {
  const { data: analyses, isLoading } = useQuery({
    queryKey: ['word-analyses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('word_analyses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading saved analyses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
          Saved Word Analyses
        </h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          {analyses?.map((analysis) => (
            <Card key={analysis.id} className="overflow-hidden transition-all duration-200 hover:shadow-lg">
              <CardHeader className="space-y-1 pb-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {analysis.word}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Definition</h4>
                  <p className="text-sm">{analysis.definition}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Example</h4>
                  <p className="text-sm italic">{analysis.sample_sentence}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SavedAnalyses;