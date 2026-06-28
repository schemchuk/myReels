declare global {
  interface Window {
    reelsApi: {
      generateReel(text: string): Promise<string>;
    };
  }
}

const textInput = document.getElementById('text-input') as HTMLTextAreaElement;
const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

generateButton.addEventListener('click', () => {
  const text = textInput.value.trim();
  if (!text) {
    statusEl.textContent = 'Введіть текст перед генерацією.';
    return;
  }

  generateButton.disabled = true;
  statusEl.textContent = 'Генерація відео через HeyGen...';

  window.reelsApi
    .generateReel(text)
    .then((finalPath) => {
      statusEl.textContent = `Готово! Рілс збережено: ${finalPath}`;
    })
    .catch((error: Error) => {
      statusEl.textContent = `Помилка: ${error.message}`;
    })
    .finally(() => {
      generateButton.disabled = false;
    });
});

export {};
