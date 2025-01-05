import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
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
    // Get the form data
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      throw new Error('No valid file uploaded')
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Upload file to Supabase Storage
    const fileName = `${crypto.randomUUID()}-${file.name}`
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('analyzed_images')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`)
    }

    // Get public URL of uploaded image
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('analyzed_images')
      .getPublicUrl(fileName)

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })
    const openai = new OpenAIApi(configuration)

    // Analyze image with OpenAI
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
              image_url: publicUrl,
            },
          ],
        },
      ],
    })

    const analysisResult = response.data.choices[0].message.content
    let parsedAnalysis
    try {
      parsedAnalysis = JSON.parse(analysisResult)
    } catch (e) {
      console.error('Failed to parse OpenAI response:', analysisResult)
      parsedAnalysis = []
    }

    // Store analysis results
    const { error: dbError } = await supabaseAdmin
      .from('image_analysis')
      .insert({
        image_path: fileName,
        analysis_data: parsedAnalysis
      })

    if (dbError) {
      throw new Error(`Failed to save analysis results: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        message: 'Image analyzed successfully',
        analysis: parsedAnalysis,
        imagePath: fileName
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    )
  } catch (error) {
    console.error('Error in analyze-image function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    )
  }
})