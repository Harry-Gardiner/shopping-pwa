(function () {
  const WORKER_URL = 'https://shopping-voice-parser.hjshopping.workers.dev';

  const voiceBtn = document.getElementById('voice-btn');
  if (!voiceBtn) return;

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    voiceBtn.hidden = true;
    return;
  }

  let mediaRecorder = null;
  let chunks = [];
  let isRecording = false;

  function formatIngredient({ name, quantity, unit }) {
    if (quantity && unit) return `${quantity} ${unit} ${name}`;
    if (quantity) return `${quantity} ${name}`;
    return name;
  }

  function setButtonState(state) {
    const icon = voiceBtn.querySelector('i');
    voiceBtn.classList.remove('recording', 'loading');
    voiceBtn.disabled = false;

    if (state === 'recording') {
      voiceBtn.classList.add('recording');
      icon.className = 'fa-solid fa-stop';
      voiceBtn.setAttribute('aria-label', 'Stop recording');
    } else if (state === 'loading') {
      voiceBtn.classList.add('loading');
      icon.className = 'fa-solid fa-spinner fa-spin';
      voiceBtn.disabled = true;
      voiceBtn.setAttribute('aria-label', 'Processing…');
    } else {
      icon.className = 'fa-solid fa-microphone';
      voiceBtn.setAttribute('aria-label', 'Add items by voice');
    }
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      processAudio();
    };

    mediaRecorder.start();
    isRecording = true;
    setButtonState('recording');
  }

  function stopRecording() {
    if (mediaRecorder?.state !== 'inactive') mediaRecorder.stop();
    isRecording = false;
    setButtonState('loading');
  }

  async function processAudio() {
    const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
    const form = new FormData();
    form.append('audio', blob, 'audio.webm');

    try {
      const res = await fetch(WORKER_URL, { method: 'POST', body: form });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || `Server error ${res.status}`);
      }

      const { ingredients } = await res.json();
      let added = 0;

      ingredients.forEach((ingredient) => {
        const name = formatIngredient(ingredient);
        if (!checkIfItemExists(name)) {
          addItemToDOM(name, 'item-list');
          addItemToStorage(name, 'item-list');
          added++;
        }
      });

      checkUI();

      if (added === 0) showToast('No new items found in recording.', 'info');
      else showToast(`Added ${added} item${added !== 1 ? 's' : ''}`);
    } catch (err) {
      showToast(`Voice input failed: ${err.message}`, 'error');
    } finally {
      setButtonState('idle');
    }
  }

  voiceBtn.addEventListener('click', async () => {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch {
        showToast('Microphone access denied.', 'error');
      }
    }
  });
})();
