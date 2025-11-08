import { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Volume2, User, Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface VoiceAndLanguageSelectorProps {
  language: string;
  onSelectVoice: (voice: SpeechSynthesisVoice | null) => void;
  selectedVoice: SpeechSynthesisVoice | null;
  onChangeLanguage?: (language: string) => void;
}

export function VoiceAndLanguageSelector({ 
  language, 
  onSelectVoice, 
  selectedVoice,
  onChangeLanguage 
}: VoiceAndLanguageSelectorProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [maleVoices, setMaleVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [femaleVoices, setFemaleVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedMaleVoice, setSelectedMaleVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [selectedFemaleVoice, setSelectedFemaleVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('female');
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const langCode = language === 'es' ? 'es' : 'en';
      
      const filteredVoices = availableVoices.filter(voice => 
        voice.lang.toLowerCase().startsWith(langCode)
      );
      
      setVoices(filteredVoices);
      
      // Separar voces por género
      const male: SpeechSynthesisVoice[] = [];
      const female: SpeechSynthesisVoice[] = [];
      
      filteredVoices.forEach(voice => {
        const nameLower = voice.name.toLowerCase();
        
        // Detectar voces masculinas
        if (nameLower.includes('male') && !nameLower.includes('female')) {
          male.push(voice);
        }
        // Detectar voces femeninas
        else if (nameLower.includes('female')) {
          female.push(voice);
        }
        // Nombres masculinos comunes
        else if (nameLower.includes('jorge') || 
                 nameLower.includes('diego') ||
                 nameLower.includes('carlos') ||
                 nameLower.includes('juan') ||
                 nameLower.includes('daniel') ||
                 nameLower.includes('thomas') ||
                 nameLower.includes('james') ||
                 nameLower.includes('david') ||
                 nameLower.includes('alex') ||
                 nameLower.includes('fred')) {
          male.push(voice);
        }
        // Nombres femeninos comunes
        else if (nameLower.includes('monica') || 
                 nameLower.includes('paulina') ||
                 nameLower.includes('luciana') ||
                 nameLower.includes('maria') ||
                 nameLower.includes('samantha') ||
                 nameLower.includes('karen') ||
                 nameLower.includes('susan') ||
                 nameLower.includes('victoria') ||
                 nameLower.includes('amelie')) {
          female.push(voice);
        } else {
          // Por defecto, asumir que es femenina si no podemos determinar
          female.push(voice);
        }
      });
      
      // Seleccionar las mejores voces (preferir Google, naturales, wavenet, neural, o enhanced)
      const selectBestVoice = (voiceList: SpeechSynthesisVoice[]) => {
        return voiceList.find(v => 
          v.name.toLowerCase().includes('google') || 
          v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('wavenet') ||
          v.name.toLowerCase().includes('neural') ||
          v.name.toLowerCase().includes('enhanced') ||
          v.name.toLowerCase().includes('premium')
        ) || voiceList[0];
      };

      const bestMale = male.length > 0 ? selectBestVoice(male) : null;
      const bestFemale = female.length > 0 ? selectBestVoice(female) : null;
      
      setMaleVoices(male);
      setFemaleVoices(female);
      setSelectedMaleVoice(bestMale);
      setSelectedFemaleVoice(bestFemale);
      
      // Seleccionar voz por defecto
      if (!selectedVoice) {
        const defaultVoice = bestFemale || bestMale || filteredVoices[0];
        if (defaultVoice) {
          onSelectVoice(defaultVoice);
          setSelectedGender(bestFemale ? 'female' : 'male');
        }
      }
    };

    loadVoices();
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [language, onSelectVoice, selectedVoice]);

  const testVoice = (voice: SpeechSynthesisVoice | null) => {
    if (!voice) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      language === 'es' 
        ? '¡Hola! Esta es una voz de prueba.' 
        : 'Hello! This is a test voice.'
    );
    utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  const handleSelectGender = (gender: 'male' | 'female') => {
    setSelectedGender(gender);
    if (gender === 'male' && selectedMaleVoice) {
      onSelectVoice(selectedMaleVoice);
    } else if (gender === 'female' && selectedFemaleVoice) {
      onSelectVoice(selectedFemaleVoice);
    }
  };

  const handleSelectVoice = (voiceName: string) => {
    const voiceList = selectedGender === 'male' ? maleVoices : femaleVoices;
    const voice = voiceList.find(v => v.name === voiceName);
    if (voice) {
      onSelectVoice(voice);
      if (selectedGender === 'male') {
        setSelectedMaleVoice(voice);
      } else {
        setSelectedFemaleVoice(voice);
      }
    }
  };

  const currentVoices = selectedGender === 'male' ? maleVoices : femaleVoices;
  const currentSelectedVoice = selectedGender === 'male' ? selectedMaleVoice : selectedFemaleVoice;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200 shadow-lg space-y-4">
      {/* Selector de idioma */}
      {onChangeLanguage && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Idioma de la conversación
          </Label>
          <Select value={language} onValueChange={onChangeLanguage}>
            <SelectTrigger className="w-full bg-white border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Selector de género de voz */}
      <div className="space-y-2">
        <Label>Tipo de voz</Label>
        <div className="grid grid-cols-2 gap-3">
          {/* Voz Masculina */}
          <Button
            variant={selectedGender === 'male' ? 'default' : 'outline'}
            className={`w-full h-auto flex-col gap-2 py-3 ${
              selectedGender === 'male' 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' 
                : 'border-2 hover:bg-blue-50'
            }`}
            onClick={() => handleSelectGender('male')}
            disabled={maleVoices.length === 0}
          >
            <User className="h-6 w-6" />
            <span className="text-sm">Masculina</span>
            {maleVoices.length > 0 && (
              <span className="text-xs opacity-80">({maleVoices.length} voces)</span>
            )}
          </Button>

          {/* Voz Femenina */}
          <Button
            variant={selectedGender === 'female' ? 'default' : 'outline'}
            className={`w-full h-auto flex-col gap-2 py-3 ${
              selectedGender === 'female' 
                ? 'bg-gradient-to-br from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800' 
                : 'border-2 hover:bg-pink-50'
            }`}
            onClick={() => handleSelectGender('female')}
            disabled={femaleVoices.length === 0}
          >
            <User className="h-6 w-6" />
            <span className="text-sm">Femenina</span>
            {femaleVoices.length > 0 && (
              <span className="text-xs opacity-80">({femaleVoices.length} voces)</span>
            )}
          </Button>
        </div>
      </div>

      {/* Selector de voz específica */}
      {currentVoices.length > 0 && (
        <div className="space-y-2">
          <Label>Seleccionar voz específica</Label>
          <Select 
            value={currentSelectedVoice?.name || ''}
            onValueChange={handleSelectVoice}
            disabled={currentVoices.length === 0}
          >
            <SelectTrigger className="w-full bg-white border-2">
              <SelectValue placeholder="Selecciona una voz" />
            </SelectTrigger>
            <SelectContent>
              {currentVoices.map((voice) => (
                <SelectItem key={voice.name} value={voice.name}>
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Botón de prueba */}
      {selectedVoice && (
        <Button
          variant="outline"
          className="w-full border-2 hover:bg-purple-100"
          onClick={() => testVoice(selectedVoice)}
        >
          <Volume2 className="h-4 w-4 mr-2" />
          Probar voz seleccionada
        </Button>
      )}

      {voices.length === 0 && (
        <p className="text-sm text-gray-500 text-center">
          No hay voces disponibles para este idioma
        </p>
      )}
    </div>
  );
}