/* eslint-disable no-unused-vars */

function getVoice(name) {
  if (!window.voice) {
    voices = speechSynthesis.getVoices();
    const filtered = voices.filter(v => v.name === (name || v.name));
    const voice = filtered[0] || voices[0];
    window.voice = voice;
  }
  return window.voice;
}

function getSpeechVoice(name) {
  return new Promise(resolve => {
    const voice = getVoice(name);
    if (voice) resolve(voice);
    else window.speechSynthesis.onvoiceschanged = () => resolve(getVoice());
  });
}

async function textToSpeech(text, name) {
  const utterThis = new SpeechSynthesisUtterance(text);
  utterThis.voice = await getSpeechVoice(name);
  utterThis.volume = document.getElementById('tts-volume').value;
  window.speechSynthesis.speak(utterThis);
}


//------------------------------------------------------------- Copied TTS Script from the Web ---------------------------------------------------------------------------------------------------

function populateVoiceList() {
  if(typeof speechSynthesis === 'undefined') {
    return;
  }

  //voices = speechSynthesis.getVoices();

  for(let i = 0; i < voices.length ; i++) {
    const option = document.createElement('option');
    option.textContent = voices[i].name + ' (' + voices[i].lang + ')';
    
    if(voices[i].default) {
      option.textContent += ' -- DEFAULT';
    }

    option.setAttribute('data-lang', voices[i].lang);
    option.setAttribute('data-name', voices[i].name);
    document.getElementById("voiceSelect").appendChild(option);
  }
}

populateVoiceList();
if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoiceList;
}