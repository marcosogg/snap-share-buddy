import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.3.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file uploaded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Upload file to Supabase Storage
    const fileName = `${crypto.randomUUID()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('analyzed_images')
      .upload(fileName, file)

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: 'Failed to upload file', details: uploadError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Get public URL of uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('analyzed_images')
      .getPublicUrl(fileName)

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })
    const openai = new OpenAIApi(configuration)

    // Analyze image with OpenAI
    const response = await openai.createChatCompletion({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Please identify any visible words or objects in this image. For each word or object, provide its definition and a sample sentence using it. Format the response as a JSON array with objects containing 'word', 'definition', and 'sampleSentence' fields." },
            {
              type: "image_url",
              image_url: publicUrl,
            },
          ],
        },
      ],
      max_tokens: 1000,
    })

    const analysisResult = response.data.choices[0].message.content
    let parsedAnalysis
    try {
      parsedAnalysis = JSON.parse(analysisResult)
    } catch (e) {
      parsedAnalysis = {
        raw: analysisResult,
        error: "Could not parse as JSON"
      }
    }

    // Store analysis results in database
    const { error: dbError } = await supabase
      .from('image_analysis')
      .insert({
        image_path: fileName,
        analysis_data: parsedAnalysis
      })

    if (dbError) {
      return new Response(
        JSON.stringify({ error: 'Failed to save analysis results', details: dbError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ 
        message: 'Image analyzed successfully',
        analysis: parsedAnalysis,
        imagePath: fileName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})