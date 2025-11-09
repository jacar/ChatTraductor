
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const { messageId, targetLang } = await req.json();

    // 1. Fetch the message from the database
    const { data: messageData, error: messageError } = await supabaseAdmin
      .from('messages')
      .select('text')
      .eq('id', messageId)
      .single();

    if (messageError || !messageData) {
      throw new Error(`Failed to fetch message: ${messageError?.message}`);
    }

    const textToTranslate = messageData.text;

    // 2. Call OpenAI for translation
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert translator. Translate the following text to ${targetLang}. Only output the translated text, without any additional comments or phrases.`,
        },
        {
          role: 'user',
          content: textToTranslate,
        },
      ],
      temperature: 0.1,
    });

    const translatedText = completion.choices[0].message.content;

    if (!translatedText) {
        throw new Error('OpenAI did not return a translation.');
    }

    // 3. Update the message with the translation
    const { error: updateError } = await supabaseAdmin
      .from('messages')
      .update({ translated_text: translatedText })
      .eq('id', messageId);

    if (updateError) {
      throw new Error(`Failed to update message with translation: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ success: true, translatedText }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
});
