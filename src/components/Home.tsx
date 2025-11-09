
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Share2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { Session } from '@supabase/supabase-js';

interface HomeProps {
  session: Session;
  onStartChat: (chatId: string, partnerId: string) => void;
}

// Function to generate a random 6-character code
const generateCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export function Home({ session, onStartChat }: HomeProps) {
  const [view, setView] = useState<'main' | 'create' | 'join'>('main');
  const [userName, setUserName] = useState('');
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [invitationCode, setInvitationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch user profile when component mounts
  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, language')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setUserName(data.name);
        setLanguage(data.language as 'es' | 'en');
      }
    };
    fetchProfile();
  }, [session.user.id]);
  
  // Real-time listener for accepted invitations
  useEffect(() => {
    if (!generatedCode) return; // Only listen if the user has created a code

    const subscription = supabase
      .channel(`invitations`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chats',
          filter: `user1_id=eq.${session.user.id}`
        },
        (payload) => {
          const newChat = payload.new as { id: string; user2_id: string };
          toast.success('¡Alguien se ha unido a tu chat!');
          onStartChat(newChat.id, newChat.user2_id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [generatedCode, session.user.id, onStartChat]);

  const upsertProfile = async () => {
    if (!userName.trim()) {
      toast.error('Por favor ingresa tu nombre');
      return false;
    }

    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      name: userName,
      language: language,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Profile Error:', error);
      toast.error('Hubo un error al guardar tu perfil.');
      return false;
    }
    return true;
  };

  const handleCreateInvitation = async () => {
    setLoading(true);
    const profileSaved = await upsertProfile();
    if (!profileSaved) {
      setLoading(false);
      return;
    }

    const code = generateCode();
    const { error } = await supabase.from('invitations').insert({
      code: code,
      from_user_id: session.user.id,
      from_user_name: userName, // Denormalized for convenience
      from_user_language: language, // Denormalized for convenience
    });

    if (error) {
      console.error('Invitation Error:', error);
      toast.error('Error al crear la invitación.');
    } else {
      setGeneratedCode(code);
      toast.success('¡Código generado! Compártelo.');
    }
    setLoading(false);
  };

  const handleJoinInvitation = async () => {
    if (!invitationCode.trim()) {
      toast.error('Por favor ingresa el código de invitación');
      return;
    }
    setLoading(true);
    const profileSaved = await upsertProfile();
    if (!profileSaved) {
      setLoading(false);
      return;
    }

    // 1. Find the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*')
      .eq('code', invitationCode.toUpperCase())
      .single();

    if (invitationError || !invitation) {
      toast.error('Código de invitación no válido o expirado.');
      setLoading(false);
      return;
    }

    if (invitation.status !== 'pending') {
      toast.error('Esta invitación ya ha sido utilizada.');
      setLoading(false);
      return;
    }

    if (invitation.from_user_id === session.user.id) {
      toast.error('No puedes unirte a tu propia invitación.');
      setLoading(false);
      return;
    }

    // 2. Create the chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        user1_id: invitation.from_user_id,
        user2_id: session.user.id,
      })
      .select()
      .single();
    
    if (chatError) {
      console.error('Chat Error:', chatError);
      toast.error('Error al crear el chat. Inténtalo de nuevo.');
      setLoading(false);
      return;
    }

    // 3. Update invitation status
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('code', invitationCode.toUpperCase());

    if (updateError) {
      console.error('Invitation Update Error:', updateError);
      // Non-critical, we can still proceed
    }

    toast.success('¡Conectado exitosamente!');
    onStartChat(chat.id, invitation.from_user_id);
    setLoading(false);
  };
  
  // --- RENDER LOGIC ---
  // The JSX remains largely the same, but onClick handlers point to the new functions.
  // I will only include the changed parts for brevity.

  if (view === 'main') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Chat de Traducción</CardTitle>
            <CardDescription>Crea o únete a un chat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" size="lg" onClick={() => setView('create')}>
              <Share2 className="mr-2 h-5 w-5" />
              Crear Invitación
            </Button>
            <Button className="w-full" variant="outline" size="lg" onClick={() => setView('join')}>
              <LogIn className="mr-2 h-5 w-5" />
              Unirse con Código
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Crear Invitación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Tu nombre</Label>
              <Input id="name" placeholder="Ej: María" value={userName} onChange={(e) => setUserName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="language">Tu idioma</Label>
              <select id="language" className="w-full p-2 border rounded-md" value={language} onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
            {generatedCode && (
              <div className="p-4 bg-green-100 rounded-lg text-center">
                <p className="text-sm text-green-800">Comparte este código:</p>
                <p className="text-2xl font-bold tracking-widest text-green-900">{generatedCode}</p>
                <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(generatedCode); toast.success('Copiado'); }}>Copiar</Button>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setView('main'); setGeneratedCode(''); }}>Volver</Button>
              {!generatedCode && <Button className="flex-1" onClick={handleCreateInvitation} disabled={loading}>{loading ? 'Generando...' : 'Generar Código'}</Button>}
              {generatedCode && <p className='text-center text-sm text-gray-500 flex-1'>Esperando a que alguien se una...</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Join View
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">Unirse a un Chat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
              <Label htmlFor="name">Tu nombre</Label>
              <Input id="name" placeholder="Ej: John" value={userName} onChange={(e) => setUserName(e.target.value)} />
          </div>
          <div className="space-y-1">
              <Label htmlFor="language">Tu idioma</Label>
              <select id="language" className="w-full p-2 border rounded-md" value={language} onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="code">Código de Invitación</Label>
            <Input id="code" placeholder="ABCXYZ" value={invitationCode} onChange={(e) => setInvitationCode(e.target.value.toUpperCase())} maxLength={6} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setView('main'); setInvitationCode(''); }}>Volver</Button>
            <Button className="flex-1" onClick={handleJoinInvitation} disabled={loading}>{loading ? 'Conectando...' : 'Unirse'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
