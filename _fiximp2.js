var fs = require('fs');
var c = fs.readFileSync('components/ai/VoiceReceptionist.tsx', 'utf8');
var lines = c.split('\n');
var out = [];
for (var i = 0; i < lines.length; i++) {
  out.push(lines[i]);
  // Add imports after the lucide-react import line
  if (lines[i].includes("from 'lucide-react'")) {
    out.push("import { speakText as ttsSpeakText, stopSpeaking } from '@/lib/tts'");
    out.push("import { formatForSpeech } from '@/lib/formatSpeech'");
  }
}
fs.writeFileSync('components/ai/VoiceReceptionist.tsx', out.join('\n'), 'utf8');
console.log('Added imports');
