import { useState, useEffect } from \'react\';
import { Label } from \'./ui/label\';
import { Button } from \'./ui/button\';
import { Volume2, User } from \'lucide-react\';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from \'./ui/select\';

interface VoiceSelectorProps {
  language: string;
  onSelectVoice: (voice: SpeechSynthesisVoice | null) => void;
  selectedVoice: SpeechSynthesisVoice | null;
}

export function VoiceSelector({ language, onSelectVoice, selectedVoice }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [availableMaleVoices, setAvailableMaleVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [availableFemaleVoices, setAvailableFemaleVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedMaleVoice, setSelectedMaleVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [selectedFemaleVoice, setSelectedFemaleVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [selectedGender, setSelectedGender] = useState<\'male\' | \'female\'>(\'female\');

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const langCode = language === \'es\' ? \'es\' : \'en\';
      
      const filteredVoices = availableVoices.filter(voice => 
        voice.lang.toLowerCase().startsWith(langCode)
      );
      
      setVoices(filteredVoices);
      
      const male: SpeechSynthesisVoice[] = [];
      const female: SpeechSynthesisVoice[] = [];
      
      filteredVoices.forEach(voice => {
        const nameLower = voice.name.toLowerCase();
        
        if (nameLower.includes(\'male\') && !nameLower.includes(\'female\')) {
          male.push(voice);
        }
        else if (nameLower.includes(\'female\')) {
          female.push(voice);
        }
        else if (nameLower.includes(\'jorge\') || 
                 nameLower.includes(\'diego\') ||
                 nameLower.includes(\'carlos\') ||
                 nameLower.includes(\'juan\') ||
                 nameLower.includes(\'daniel\') ||
                 nameLower.includes(\'thomas\') ||
                 nameLower.includes(\'james\') ||
                 nameLower.includes(\'david\') ||
                 nameLower.includes(\'alex\') ||
                 nameLower.includes(\'fred\')) {
          male.push(voice);
        }
        else if (nameLower.includes(\'monica\') || 
                 nameLower.includes(\'paulina\') ||
                 nameLower.includes(\'luciana\') ||
                 nameLower.includes(\'maria\') ||
                 nameLower.includes(\'samantha\') ||
                 nameLower.includes(\'karen\') ||
                 nameLower.includes(\'susan\') ||
                 nameLower.includes(\'victoria\') ||
                 nameLower.includes(\'amelie\')) {
          female.push(voice);
        } else {
          female.push(voice);
        }
      });
      
      const selectBestVoice = (voiceList: SpeechSynthesisVoice[]) => {
        return voiceList.find(v => 
          v.name.toLowerCase().includes(\'natural\') ||
          v.name.toLowerCase().includes(\'wavenet\') ||
          v.name.toLowerCase().includes(\'neural\') ||
          v.name.toLowerCase().includes(\'google\') || 
          v.name.toLowerCase().includes(\'enhanced\') ||
          v.name.toLowerCase().includes(\'premium\')
        ) || voiceList[0];
      };
      
      setAvailableMaleVoices(male);
      setAvailableFemaleVoices(female);

      const bestMale = male.length > 0 ? selectBestVoice(male) : null;
      const bestFemale = female.length > 0 ? selectBestVoice(female) : null;
      
      setSelectedMaleVoice(bestMale);
      setSelectedFemaleVoice(bestFemale);
      
      if (!selectedVoice) {
        const defaultVoice = bestFemale || bestMale || filteredVoices[0];
        if (defaultVoice) {
          onSelectVoice(defaultVoice);
          setSelectedGender(bestFemale ? \'female\' : \'male\');
        }
      }
    };

    loadVoices();
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [language, selectedVoice]);

  const testVoice = (voice: SpeechSynthesisVoice | null) => {
    if (!voice) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      language === \'es\' 
        ? \'¡Hola! Esta es una voz de prueba.\' 
        : \'Hello! This is a test voice.\'
    );
    utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  const handleSelectVoice = (voiceURI: string, gender: \'male\' | \'female\') => {
    const voice = voices.find(v => v.voiceURI === voiceURI);
    if (voice) {
      if (gender === \'male\') {
        setSelectedMaleVoice(voice);
      } else {
        setSelectedFemaleVoice(voice);
      }
      setSelectedGender(gender);
      onSelectVoice(voice);
    }
  };

  return (
    <div className=\"bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200 shadow-lg space-y-3\">
      <Label className=\"text-base\">Selecciona el tipo de voz</Label>
      
      <div className=\"grid grid-cols-2 gap-3\">
        {/* Voz Masculina */}\
        <div className=\"space-y-2\">
          <Select
            value={selectedMaleVoice?.voiceURI || \'\'}
            onValueChange={(value) => handleSelectVoice(value, \'male\')}
            disabled={availableMaleVoices.length === 0}
          >
            <SelectTrigger 
              className={`w-full h-auto flex-col gap-2 py-4 ${\n                selectedGender === \'male\' \n                  ? \'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white\' \n                  : \'border-2 hover:bg-blue-50\'\n              }`}\n            >\n              <User className=\"h-8 w-8\" />\n              <SelectValue placeholder=\"Voz Masculina\" />\n            </SelectTrigger>\n            <SelectContent>\n              {availableMaleVoices.map(voice => (\n                <SelectItem key={voice.voiceURI} value={voice.voiceURI}>\n                  {voice.name.replace(/\\s*\\([^)]*\\)/g, \'\')}\n                </SelectItem>\n              ))}\n            </SelectContent>\n          </Select>
          {selectedMaleVoice && (
            <Button
              variant=\"ghost\"\
              size=\"sm\"\
              className=\"w-full\"\
              onClick={() => testVoice(selectedMaleVoice)}\
            >\
              <Volume2 className=\"h-4 w-4 mr-2\" />\
              Probar\
            </Button>\
          )}\
        </div>

        {/* Voz Femenina */}\
        <div className=\"space-y-2\">
          <Select
            value={selectedFemaleVoice?.voiceURI || \'\'}
            onValueChange={(value) => handleSelectVoice(value, \'female\')}
            disabled={availableFemaleVoices.length === 0}
          >
            <SelectTrigger 
              className={`w-full h-auto flex-col gap-2 py-4 ${\n                selectedGender === \'female\' \n                  ? \'bg-gradient-to-br from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white\' \n                  : \'border-2 hover:bg-pink-50\'\n              }`}\n            >\n              <User className=\"h-8 w-8\" />\n              <SelectValue placeholder=\"Voz Femenina\" />\n            </SelectTrigger>\n            <SelectContent>\n              {availableFemaleVoices.map(voice => (\n                <SelectItem key={voice.voiceURI} value={voice.voiceURI}>\n                  {voice.name.replace(/\\s*\\([^)]*\\)/g, \'\')}\n                </SelectItem>\n              ))}\
            </SelectContent>\
          </Select>
          {selectedFemaleVoice && (
            <Button
              variant=\"ghost\"\
              size=\"sm\"\
              className=\"w-full\"\
              onClick={() => testVoice(selectedFemaleVoice)}\
            >\
              <Volume2 className=\"h-4 w-4 mr-2\" />\
              Probar\
            </Button>\
          )}\
        </div>
      </div>

      {voices.length === 0 && (\
        <p className=\"text-sm text-gray-500 text-center\">\
          No hay voces disponibles para este idioma\
        </p>\
      )}\
      \
      {selectedVoice && (\
        <p className=\"text-xs text-center text-gray-600\">\
          Voz actual: {selectedVoice.name.replace(/\\s*\\([^)]*\\)/g, \'\').split(\' \').slice(0, 3).join(\' \')}\
        </p>\
      )}\
    </div>
  );\
}
