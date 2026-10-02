// Egyszerű és stabil Web Speech API felolvasó magyar nyelven SNI tanulóknak

export const speakText = (text: string) => {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Megállítjuk az előző beszédet
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'hu-HU';
  utterance.rate = 0.92; // Kicsit lassabb, tisztább beszédtempó SNI tanulóknak
  utterance.pitch = 1.05; // Barátságos, meleg hangszín

  // Megkeressük a magyar hangot, ha elérhető
  const voices = window.speechSynthesis.getVoices();
  const huVoice = voices.find(v => v.lang.startsWith('hu'));
  if (huVoice) {
    utterance.voice = huVoice;
  }

  window.speechSynthesis.speak(utterance);
};

export const stopSpeech = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};
