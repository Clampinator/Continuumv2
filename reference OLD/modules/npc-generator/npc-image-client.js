const STABILITY_API_URL = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';

export async function generatePortrait(imagePrompt, apiKey) {
  if (!apiKey || !imagePrompt) {
    throw new Error('Missing API key or prompt');
  }

  const response = await fetch(STABILITY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      text_prompts: [
        {
          text: imagePrompt,
          weight: 1
        }
      ],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      steps: 30,
      samples: 1
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Stability AI error ${response.status}: ${errText}`);
  }

  const json = await response.json();
  const base64Image = json.artifacts?.[0]?.base64;

  if (!base64Image) {
    throw new Error('No image in Stability AI response');
  }

  const blob = base64toBlob(base64Image, 'image/png');
  const previewUrl = URL.createObjectURL(blob);
  const filename = `npc_${Date.now()}.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  const FilePickerClass = foundry.applications.apps.FilePicker.implementation ?? FilePicker;

  let savedPath = null;
  try {
    const result = await FilePickerClass.upload('data', 'systems/continuum/portraits', file);
    savedPath = result.path;
  } catch (err) {
    console.warn('FilePicker upload to data failed, trying uploads:', err);
    try {
      const result = await FilePickerClass.upload('data', 'uploads', file);
      savedPath = result.path;
    } catch (err2) {
      console.warn('All uploads failed, using preview URL only:', err2);
    }
  }

  return { path: savedPath, previewUrl };
}

function base64toBlob(base64, mimeType) {
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}
