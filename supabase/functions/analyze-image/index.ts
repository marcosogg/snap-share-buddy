import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.3.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the image data from the request body
    const { image } = await req.json()
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image URL provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Analyzing image:', image);

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })
    const openai = new OpenAIApi(configuration)

    // Analyze image with OpenAI using the recommended model
    const response = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please identify any visible words or objects in this image. For each word or object, provide its definition and a sample sentence using it. Format the response as a JSON array with objects containing 'word', 'definition', and 'sampleSentence' fields."
            },
            {
              type: "image_url",
              image_url: {
                url: image,
              }
            }
          ]
        }
      ]
    })

    console.log('OpenAI response:', response.data);

    const analysisResult = response.data.choices[0].message.content;
    let parsedAnalysis;
    
    try {
      parsedAnalysis = JSON.parse(analysisResult);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', analysisResult);
      console.error('Parse error:', e);
      // If parsing fails, create a structured response from the raw text
      parsedAnalysis = [{
        word: "Analysis Result",
        definition: "Raw analysis from image",
        sampleSentence: analysisResult
      }];
    }

    return new Response(
      JSON.stringify({ 
        analysis: parsedAnalysis,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
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