import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { image } = await req.json()
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image URL provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Processing image URL:', image);

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an AI that analyzes images and provides detailed information about visible objects and words. Format your responses as JSON arrays containing objects with 'word', 'definition', and 'sampleSentence' fields."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and identify visible words or objects. For each one, provide its definition and a sample sentence."
              },
              {
                type: "image_url",
                image_url: {
                  url: image,
                  detail: "low"
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });

      console.log('OpenAI API response received');

      const content = completion.choices[0].message.content;
      console.log('Raw content:', content);

      let parsedAnalysis;
      try {
        // Attempt to parse the JSON response
        parsedAnalysis = JSON.parse(content);
        
        // Validate the structure of each item
        parsedAnalysis = parsedAnalysis.map(item => ({
          word: item.word || 'Unknown',
          definition: item.definition || 'No definition available',
          sampleSentence: item.sampleSentence || 'No example available'
        }));

        console.log('Successfully parsed and validated JSON response');
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        throw new Error('Failed to parse AI response');
      }

      return new Response(
        JSON.stringify({ analysis: parsedAnalysis }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      throw new Error(`OpenAI API error: ${openaiError.message}`);
    }
  } catch (error) {
    console.error('Error in analyze-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred during image analysis'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})