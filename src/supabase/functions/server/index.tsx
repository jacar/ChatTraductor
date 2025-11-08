import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

// Función simple de traducción (mock - en producción usar Google Translate API)
async function translateText(text: string, fromLang: string, toLang: string): Promise<string> {
  // Esta es una implementación simple. Para producción, usar una API real de traducción
  // como Google Translate, DeepL, etc.
  
  // Por ahora, usamos una API gratuita de traducción
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    return text; // Si falla, devuelve el texto original
  } catch (error) {
    console.log(`Error translating text: ${error}`);
    return text;
  }
}

// Generar código de invitación
app.post('/make-server-71bd6d9a/invitation/create', async (c) => {
  try {
    const { userId, userName, userLanguage } = await c.req.json();
    
    // Generar código único de 6 caracteres
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const invitation = {
      code,
      from: userId,
      fromName: userName,
      fromLanguage: userLanguage,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`invitation:${code}`, invitation);
    await kv.set(`user:${userId}`, { id: userId, name: userName, language: userLanguage });
    
    return c.json({ success: true, code });
  } catch (error) {
    console.log(`Error creating invitation: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Aceptar invitación
app.post('/make-server-71bd6d9a/invitation/accept', async (c) => {
  try {
    const { code, userId, userName, userLanguage } = await c.req.json();
    
    const invitation = await kv.get(`invitation:${code}`);
    
    if (!invitation) {
      return c.json({ success: false, error: 'Código de invitación no válido' }, 404);
    }
    
    if (invitation.status !== 'pending') {
      return c.json({ success: false, error: 'Esta invitación ya fue usada' }, 400);
    }
    
    // Actualizar invitación
    invitation.status = 'accepted';
    invitation.to = userId;
    invitation.toName = userName;
    invitation.toLanguage = userLanguage;
    await kv.set(`invitation:${code}`, invitation);
    
    // Guardar información del usuario
    await kv.set(`user:${userId}`, { id: userId, name: userName, language: userLanguage });
    
    // Crear chat ID (ordenar IDs para consistencia)
    const chatId = [invitation.from, userId].sort().join(':');
    
    // Guardar relación de chat para ambos usuarios con idiomas
    await kv.set(`user-chat:${invitation.from}`, { 
      chatId, 
      partnerId: userId, 
      partnerName: userName,
      partnerLanguage: userLanguage 
    });
    await kv.set(`user-chat:${userId}`, { 
      chatId, 
      partnerId: invitation.from, 
      partnerName: invitation.fromName,
      partnerLanguage: invitation.fromLanguage 
    });
    
    return c.json({ 
      success: true, 
      chatId,
      partner: {
        id: invitation.from,
        name: invitation.fromName,
        language: invitation.fromLanguage
      }
    });
  } catch (error) {
    console.log(`Error accepting invitation: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Obtener información del chat del usuario
app.get('/make-server-71bd6d9a/chat/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const userChat = await kv.get(`user-chat:${userId}`);
    
    if (!userChat) {
      return c.json({ success: false, error: 'No hay chat activo' }, 404);
    }
    
    return c.json({ success: true, chat: userChat });
  } catch (error) {
    console.log(`Error getting chat info: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Enviar mensaje
app.post('/make-server-71bd6d9a/message/send', async (c) => {
  try {
    const { chatId, fromId, text, fromLanguage, toLanguage } = await c.req.json();
    
    // Traducir el mensaje
    const translatedText = await translateText(text, fromLanguage, toLanguage);
    
    const message = {
      id: `${Date.now()}-${Math.random()}`,
      fromId,
      text,
      translatedText,
      timestamp: new Date().toISOString()
    };
    
    // Obtener mensajes existentes
    const chatData = await kv.get(`chat:${chatId}`) || { messages: [] };
    chatData.messages.push(message);
    
    // Mantener solo los últimos 100 mensajes
    if (chatData.messages.length > 100) {
      chatData.messages = chatData.messages.slice(-100);
    }
    
    await kv.set(`chat:${chatId}`, chatData);
    
    return c.json({ success: true, message });
  } catch (error) {
    console.log(`Error sending message: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Obtener mensajes
app.get('/make-server-71bd6d9a/messages/:chatId', async (c) => {
  try {
    const chatId = c.req.param('chatId');
    const chatData = await kv.get(`chat:${chatId}`) || { messages: [] };
    
    return c.json({ success: true, messages: chatData.messages });
  } catch (error) {
    console.log(`Error getting messages: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);
