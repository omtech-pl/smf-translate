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
    this.copyBtn = document.getElementById('copy');
    this.tooltip = document.getElementById('tooltip');
    this.console = document.getElementById('console');

    this.setupEventListeners();
    this.initializeDarkMode();
  }

  setupEventListeners() {
    this.languageLinks.forEach(link => {
      link.addEventListener('click', this.handleLanguageChange.bind(this));
    });

    this.translateBtn.addEventListener('click', this.handleTranslate.bind(this));
    this.copyBtn.addEventListener('click', () => this.output.value && this.handleCopy());
  }

  handleCopy() {
    this.output.select();
    navigator.clipboard.writeText(this.output.value)
      .then(() => this.showTooltip('Copied &nbsp'))
      .catch(err => this.logError('Failed to copy SQL to clipboard:', err));
  }

  handleLanguageChange(event) {
    const target = event.target;
    if (target.tagName === 'A') {
      this.languageLinks.forEach(link => link.classList.remove('active', 'text-blue-600', 'bg-gray-100', 'dark:bg-gray-800', 'dark:text-blue-500'));
      target.classList.add('active', 'text-blue-600', 'bg-gray-100', 'dark:bg-gray-800', 'dark:text-blue-500');

      this.currentLang = target.id;
      this.output.placeholder = target.dataset.placeholder || '';

      const outputTranslation = this.translations[this.currentLang] || {};
      this.output.value = this.formatTranslations(outputTranslation);
    }
  }

  async handleTranslate() {
    this.clearConsole();
    if (!this.input.value) return this.logError('No input value');

    this.setLoadingState(true);

    this.translations = {};
    this.output.value = '';
    const lines = this.input.value.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const data = this.prepareData(line);
      const translatedMessage = await this.sendToOpenAi(data);

      Object.keys(this.langs).forEach(lang => {
        this.translations[lang] = this.translations[lang] || {};
        this.translations[lang][line] = [translatedMessage?.[lang] || "Translation not available"];
      });
    }

    const firstTranslation = this.translations[this.currentLang];
    if (!firstTranslation) {
      this.logError('No translation available for the selected language.');
      this.setLoadingState(false);
      return;
    }

    this.output.value = this.formatTranslations(firstTranslation);
    this.setLoadingState(false);
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
    if (!this.openai.apikey) {
      this.logError('Error! Apikey is invalid or missing.');
      return null;
    }
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
        this.logError(`HTTP error! status: ${response.status}`);
        return null;
      }

      const result = await response.json();
      const message = result.choices?.[0]?.message?.content || 'Translation failed or no content received';
      return JSON.parse(message.replace(/'/g, '`'));
    } catch (error) {
      this.logError('Error:', error);
      return null;
    }
  }

  formatTranslations(translations) {
    return Object.entries(translations).map(([line, translation]) =>
      `"${line}": [\n    "${translation[0]}"\n]`
    ).join(',\n');
  }

  setLoadingState(isLoading) {
    this.translateBtn.innerHTML = isLoading ? `Loading... &nbsp;<svg aria-hidden="true" role="status" class="inline w-5 h-5 me-0 text-gray-200 animate-spin dark:text-gray-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg" width="21" height="21"><path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/><path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="#1C64F2"/></svg>` : `TRANSLATE &nbsp;<svg class="h-5 w-5 text-white-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="21" height="21"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/></svg>`;
  }

  showTooltip(message) {
    this.tooltip.innerHTML = message;
    setTimeout(() => this.tooltip.innerHTML = '', 1000);
  }

  logError(...messages) {
    this.console.textContent += messages.join(' ') + '\n';
    console.error(...messages);
  }

  clearConsole() {
    this.console.textContent = '';
  }

  initializeDarkMode() {
    const lightSwitch = document.querySelector('.light-switch');
    const darkMode = localStorage.getItem('dark-mode') === 'true';

    lightSwitch.checked = darkMode || (!('dark-mode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', lightSwitch.checked);

    lightSwitch.addEventListener('change', () => {
      const isDark = lightSwitch.checked;
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('dark-mode', isDark);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TranslationApp();
});
