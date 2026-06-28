var fs = require('fs');
var c = fs.readFileSync('components/ai/VoiceReceptionist.tsx', 'utf8');
// Remove unused stopSpeaking import
c = c.replace("import { speakText as ttsSpeakText, stopSpeaking } from '@/lib/tts'", "import { speakText as ttsSpeakText } from '@/lib/tts'");
fs.writeFileSync('components/ai/VoiceReceptionist.tsx', c, 'utf8');
console.log('Cleaned unused import');
