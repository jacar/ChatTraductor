import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { MessageCircle, Share2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface HomeProps {
  onStartChat: (userId: string, userName: string, language: string, chatId: string, partnerId: string, partnerName: string, partnerLanguage: string) => void;
}

export function Home({ onStartChat }: HomeProps) {
  const [view, setView] = useState<'main' | 'create' | 'join'>('main');
  const [userName, setUserName] = useState('');
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [invitationCode, setInvitationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateInvitation = async () => {
    if (!userName.trim()) {
      toast.error('Por favor ingresa tu nombre');
      return;
    }

    setLoading(true);
    try {
      const userId = `user-${Date.now()}-${Math.random()}`;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-71bd6d9a/invitation/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ userId, userName, userLanguage: language })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setGeneratedCode(data.code);
        toast.success('¡Código generado! Compártelo con tu contacto');
        
        // Guardar datos del usuario localmente
        localStorage.setItem('fionar_user', JSON.stringify({ userId, userName, language }));
      } else {
        toast.error('Error al generar el código');
      }
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinInvitation = async () => {
    if (!userName.trim()) {
      toast.error('Por favor ingresa tu nombre');
      return;
    }
    
    if (!invitationCode.trim()) {
      toast.error('Por favor ingresa el código de invitación');
      return;
    }

    setLoading(true);
    try {
      const userId = `user-${Date.now()}-${Math.random()}`;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-71bd6d9a/invitation/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ 
            code: invitationCode.toUpperCase(), 
            userId, 
            userName, 
            userLanguage: language 
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast.success('¡Conectado exitosamente!');
        
        // Guardar datos del usuario localmente
        localStorage.setItem('fionar_user', JSON.stringify({ userId, userName, language }));
        
        onStartChat(userId, userName, language, data.chatId, data.partner.id, data.partner.name, data.partner.language);
      } else {
        toast.error(data.error || 'Error al unirse al chat');
      }
    } catch (error) {
      console.error('Error joining invitation:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const checkForActiveChat = async () => {
    const userData = localStorage.getItem('fionar_user');
    if (!userData) return;

    const { userId, userName, language: userLanguage } = JSON.parse(userData);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-71bd6d9a/chat/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        onStartChat(userId, userName, userLanguage, data.chat.chatId, data.chat.partnerId, data.chat.partnerName, data.chat.partnerLanguage || 'en');
      }
    } catch (error) {
      console.error('Error checking for active chat:', error);
    }
  };

  if (view === 'main') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Card className="w-full max-w-md shadow-2xl border-2">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-4">
              <ImageWithFallback 
                src="https://www.webcincodev.com/blog/wp-content/uploads/2025/10/ogimage-1.png"
                alt="FionAR Logo"
                className="w-40 h-40 object-contain"
              />
            </div>
            <CardDescription className="text-base">
              Chat traductor en tiempo real
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-6">
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg" 
              size="lg"
              onClick={() => setView('create')}
            >
              <Share2 className="mr-2 h-5 w-5" />
              Crear código de invitación
            </Button>
            <Button 
              className="w-full border-2 border-purple-200 hover:bg-purple-50" 
              variant="outline" 
              size="lg"
              onClick={() => setView('join')}
            >
              <LogIn className="mr-2 h-5 w-5" />
              Unirse con código
            </Button>
            <Button 
              className="w-full hover:bg-purple-50" 
              variant="ghost" 
              size="lg"
              onClick={checkForActiveChat}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Continuar chat activo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Card className="w-full max-w-md shadow-2xl border-2">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <ImageWithFallback 
                src="https://www.webcincodev.com/blog/wp-content/uploads/2025/10/ogimage-1.png"
                alt="FionAR Logo"
                className="w-24 h-24 object-contain"
              />
            </div>
            <CardTitle className="text-center">
              Crear invitación
            </CardTitle>
            <CardDescription className="text-center">
              Genera un código para compartir con tu contacto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tu nombre</Label>
              <Input
                id="name"
                placeholder="Ej: María"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Tu idioma</Label>
              <select
                id="language"
                className="w-full p-2 border rounded-md"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            {generatedCode && (
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300 rounded-xl text-center shadow-lg">
                <p className="text-sm text-green-800 mb-3">Tu código de invitación:</p>
                <p className="text-4xl tracking-widest text-green-900 mb-4">{generatedCode}</p>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCode);
                    toast.success('Código copiado');
                  }}
                >
                  Copiar código
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setView('main');
                  setGeneratedCode('');
                  setUserName('');
                }}
              >
                Volver
              </Button>
              {!generatedCode && (
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  onClick={handleCreateInvitation}
                  disabled={loading}
                >
                  {loading ? 'Generando...' : 'Generar código'}
                </Button>
              )}
              {generatedCode && (
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  onClick={checkForActiveChat}
                >
                  Verificar conexión
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Card className="w-full max-w-md shadow-2xl border-2">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <ImageWithFallback 
              src="https://www.webcincodev.com/blog/wp-content/uploads/2025/10/ogimage-1.png"
              alt="FionAR Logo"
              className="w-24 h-24 object-contain"
            />
          </div>
          <CardTitle className="text-center">
            Unirse a chat
          </CardTitle>
          <CardDescription className="text-center">
            Ingresa el código de invitación que recibiste
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tu nombre</Label>
            <Input
              id="name"
              placeholder="Ej: John"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="language">Tu idioma</Label>
            <select
              id="language"
              className="w-full p-2 border rounded-md"
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Código de invitación</Label>
            <Input
              id="code"
              placeholder="Ej: ABC123"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setView('main');
                setInvitationCode('');
                setUserName('');
              }}
            >
              Volver
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              onClick={handleJoinInvitation}
              disabled={loading}
            >
              {loading ? 'Conectando...' : 'Unirse al chat'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
