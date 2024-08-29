class TranslationApp {
  constructor() {
    this.langs = config.langs;
    this.defaultLang = config.defaultLang;
    this.openai = config.openai;
    this.currentLang = 'cs';
    this.translations = {};

    this.initialize();
  }

  initialize() {
    this.openai.apikey = localStorage.getItem('openai-apikey');
    this.input = document.getElementById('input');
    this.output = document.getElementById('output');
    this.languageLinks = document.querySelectorAll('.language-link');
    this.translateBtn = document.getElementById('translate');

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.languageLinks.forEach(link => {
      link.addEventListener('click', (event) => this.handleLanguageChange(event));
    });

    this.translateBtn.addEventListener('click', () => this.handleTranslate());
  }

  handleLanguageChange(event) {
    const target = event.target;
    if (target.tagName === 'A') {
      this.languageLinks.forEach(link => link.classList.remove('active', 'text-blue-600', 'bg-gray-100', 'dark:bg-gray-800', 'dark:text-blue-500'));

      target.classList.add('active', 'text-blue-600', 'bg-gray-100', 'dark:bg-gray-800', 'dark:text-blue-500');

      const outputTranslation = this.translations[target.id];
      this.currentLang = target.id;

      const outputString = outputTranslation ? Object.entries(outputTranslation).map(([line, translation]) =>
        `"${line}": [\n    "${translation[0]}"\n]`
      ).join(',\n') : '';

      if (target.dataset.placeholder) this.output.placeholder = target.dataset.placeholder;
      this.output.value = outputString || '';
    }
  }

  async handleTranslate() {
    this.translations = {};
    this.output.value = '';
    const arr = this.input.value.split('\n').filter(line => line.trim() !== '');

    for (const line of arr) {
      if (!line) continue;

      const data = this.prepareData(line);
      const translatedMessage = await this.sendToOpenAi(data);

      for (const lang of Object.keys(this.langs)) {
        if (!this.translations[lang]) this.translations[lang] = {};
        this.translations[lang][line] = [translatedMessage ? translatedMessage[lang] || "Translation not available" : "Error: Could not translate"];
      }
    }

    const firstTranslation = this.translations[this.currentLang];
    const outputString = Object.entries(firstTranslation).map(([line, translation]) =>
      `"${line}": [\n    "${translation[0]}"\n]`
    ).join(',\n');

    this.output.value = outputString;
  }

  prepareData(value) {
    return {
      model: this.openai.model,
      messages: [{
        role: this.openai.role,
        content: `Translate "${value}" TO ${JSON.stringify(Object.keys(this.langs))}. Return Object with results.`
      }],
      temperature: this.openai.temperature
    };
  }

  async sendToOpenAi(data) {
    try {
      const response = await fetch(this.openai.api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.openai.apikey
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const message = result.choices?.[0]?.message?.content || 'Translation failed or no content received';
      return JSON.parse(message.replace(/'/g, '`'));
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TranslationApp();
});
