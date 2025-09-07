class JapaneseStudyApp {
  constructor() {
    this.initializeElements();
    this.bindEvents();
    this.currentLanguage = "japanese";
    this.wordDefinitions = new Map();
    this.fallbackDefinitions = new Map(); // Cache for dynamically fetched definitions
  }

  initializeElements() {
    this.apiKeyInput = document.getElementById("api-key-input");
    this.promptInput = document.getElementById("prompt-input");
    this.generateBtn = document.getElementById("generate-btn");
    this.loadingDiv = document.getElementById("loading");
    this.storySection = document.getElementById("story-section");
    this.japaneseStory = document.getElementById("japanese-story");
    this.englishStory = document.getElementById("english-story");
    this.toggleBtn = document.getElementById("toggle-language");
    this.wordPopup = document.getElementById("word-popup");
    this.popupWord = document.getElementById("popup-word");
    this.popupMeaning = document.getElementById("popup-meaning");
    this.copyBtn = document.getElementById("copy-btn");
    this.closePopupBtn = document.getElementById("close-popup");

    // Load saved data
    this.loadApiKey();
    this.loadPrompt();
  }

  bindEvents() {
    this.generateBtn.addEventListener("click", () => this.generateStory());
    this.toggleBtn.addEventListener("click", () => this.toggleLanguage());
    this.copyBtn.addEventListener("click", () => this.copyToClipboard());
    this.closePopupBtn.addEventListener("click", () => this.hidePopup());
    document.addEventListener("click", (e) => this.handleDocumentClick(e));

    // Save data when changed
    this.apiKeyInput.addEventListener("input", () => this.saveApiKey());
    this.promptInput.addEventListener("input", () => this.savePrompt());

    // Enter key to generate
    this.promptInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        this.generateStory();
      }
    });
  }

  loadApiKey() {
    const savedKey = localStorage.getItem("openai_api_key");
    if (savedKey) {
      this.apiKeyInput.value = savedKey;
    }
  }

  saveApiKey() {
    localStorage.setItem("openai_api_key", this.apiKeyInput.value);
  }

  loadPrompt() {
    const savedPrompt = localStorage.getItem("story_prompt");
    if (savedPrompt) {
      this.promptInput.value = savedPrompt;
    }
  }

  savePrompt() {
    localStorage.setItem("story_prompt", this.promptInput.value);
  }

  async generateStory() {
    const prompt = this.promptInput.value.trim();
    const apiKey = this.apiKeyInput.value.trim();

    if (!apiKey) {
      alert("Please enter your OpenAI API key");
      return;
    }

    if (!prompt) {
      alert("Please enter a story prompt");
      return;
    }

    this.showLoading(true);
    this.generateBtn.disabled = true;

    try {
      const stories = await this.callOpenAIService(prompt, apiKey);
      this.displayStories(stories);
      this.storySection.classList.remove("hidden");
      this.toggleBtn.classList.remove("hidden");
    } catch (error) {
      console.error("Error generating story:", error);
      let errorMessage = "Error generating story. Please try again.";

      if (error.message.includes("401")) {
        errorMessage = "Invalid API key. Please check your OpenAI API key.";
      } else if (error.message.includes("429")) {
        errorMessage = "API rate limit exceeded. Please wait and try again.";
      } else if (error.message.includes("network")) {
        errorMessage = "Network error. Please check your connection.";
      }

      alert(errorMessage);
    } finally {
      this.showLoading(false);
      this.generateBtn.disabled = false;
    }
  }

  async getWordDefinition(word, apiKey) {
    // Check if we already have it cached
    if (this.fallbackDefinitions.has(word)) {
      return this.fallbackDefinitions.get(word);
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a Japanese language teacher. Provide the reading and meaning for a Japanese word.

Your response must be a valid JSON object with this exact structure:
{
  "reading": "hiragana reading",
  "meaning": "English meaning"
}

If the word is conjugated, provide the dictionary form information.`,
            },
            {
              role: "user",
              content: `What is the reading and meaning of this Japanese word: ${word}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      const parsedContent = JSON.parse(content);
      
      // Cache the result
      this.fallbackDefinitions.set(word, parsedContent);
      
      console.log(`✓ Fetched definition for "${word}":`, parsedContent);
      return parsedContent;
      
    } catch (error) {
      console.error(`Failed to get definition for "${word}":`, error);
      return { reading: "?", meaning: "Definition unavailable" };
    }
  }

  async callOpenAIService(prompt, apiKey) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a Japanese language teacher creating study materials. Generate a Japanese story based on the user's request, along with its English translation.

Your response must be a valid JSON object with this exact structure:
{
  "japanese": "The Japanese story text here",
  "english": "The English translation here"
}

Rules:
- The Japanese story should be appropriate for the requested JLPT level
- Focus on useful vocabulary and grammar patterns
- Keep stories engaging but educational
- Make the story substantial with rich vocabulary`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const parsedContent = JSON.parse(content);
      
      return {
        japanese: parsedContent.japanese,
        english: parsedContent.english,
        wordDefinitions: new Map() // No predefined definitions - we'll look up dynamically
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Invalid response format from AI service");
    }
  }

  generateMockJapaneseStory() {
    return `昔々、ローマという美しい都市があった。その都市は古代から続く歴史と文化で有名だった。

ある日、田中という名前の若い日本人観光客がローマを訪れた。彼は建築と歴史に非常に興味があった。コロッセオを見たとき、彼は古代ローマ帝国の偉大さに圧倒された。

「こんなに壮大な建物を見たのは初めてだ」と彼は思った。ガイドブックを読みながら、彼は古代ローマ人の生活について学んだ。グラディエーターたちがここで戦っていたことを想像すると、とても興奮した。

その後、彼はバチカン市国を訪れた。システィーナ礼拝堂のミケランジェロの天井画を見上げたとき、芸術の美しさに感動で涙が出そうになった。

夕方になると、田中はトレビの泉のそばに座って、一日の思い出を振り返った。「この旅行は一生忘れられないだろう」と彼は心から思った。`;
  }

  generateMockEnglishStory() {
    return `Long ago, there was a beautiful city called Rome. This city was famous for its history and culture that continued from ancient times.

One day, a young Japanese tourist named Tanaka visited Rome. He was very interested in architecture and history. When he saw the Colosseum, he was overwhelmed by the greatness of the ancient Roman Empire.

"This is the first time I've seen such a magnificent building," he thought. While reading his guidebook, he learned about the life of ancient Romans. When he imagined gladiators fighting here, he became very excited.

Afterwards, he visited Vatican City. When he looked up at Michelangelo's ceiling paintings in the Sistine Chapel, he was so moved by the beauty of art that he almost cried.

In the evening, Tanaka sat by the Trevi Fountain and reflected on the day's memories. "I will never forget this trip," he thought from the bottom of his heart.`;
  }

  generateMockWordDefinitions() {
    return new Map([
      [
        "昔々",
        { reading: "むかしむかし", meaning: "long ago, once upon a time" },
      ],
      ["美しい", { reading: "うつくしい", meaning: "beautiful" }],
      ["都市", { reading: "とし", meaning: "city" }],
      ["古代", { reading: "こだい", meaning: "ancient times" }],
      ["文化", { reading: "ぶんか", meaning: "culture" }],
      ["有名", { reading: "ゆうめい", meaning: "famous" }],
      ["観光客", { reading: "かんこうきゃく", meaning: "tourist" }],
      ["建築", { reading: "けんちく", meaning: "architecture" }],
      ["歴史", { reading: "れきし", meaning: "history" }],
      ["興味", { reading: "きょうみ", meaning: "interest" }],
      ["圧倒", { reading: "あっとう", meaning: "to overwhelm" }],
      ["壮大", { reading: "そうだい", meaning: "magnificent, grand" }],
      ["建物", { reading: "たてもの", meaning: "building" }],
      ["帝国", { reading: "ていこく", meaning: "empire" }],
      ["偉大", { reading: "いだい", meaning: "great" }],
      ["想像", { reading: "そうぞう", meaning: "imagination" }],
      ["興奮", { reading: "こうふん", meaning: "excitement" }],
      ["天井画", { reading: "てんじょうが", meaning: "ceiling painting" }],
      ["芸術", { reading: "げいじゅつ", meaning: "art" }],
      ["感動", { reading: "かんどう", meaning: "emotion, impression" }],
      ["思い出", { reading: "おもいで", meaning: "memories" }],
      ["振り返る", { reading: "ふりかえる", meaning: "to look back, reflect" }],
      ["一生", { reading: "いっしょう", meaning: "whole life, lifetime" }],
      ["忘れられない", { reading: "わすれられない", meaning: "unforgettable" }],
    ]);
  }

  displayStories(stories) {
    this.wordDefinitions = stories.wordDefinitions;
    this.japaneseStory.innerHTML = this.makeWordsClickable(stories.japanese);
    this.englishStory.innerHTML = stories.english.replace(/\n/g, "<br>");
    this.japaneseStory.classList.add("japanese-text");

    this.currentLanguage = "japanese";
    this.updateLanguageDisplay();
  }

  makeWordsClickable(text) {
    let clickableText = text;
    
    // Define common particles and grammar elements to exclude
    const particles = [
      'は', 'が', 'を', 'に', 'で', 'と', 'も', 'の', 'から', 'まで', 'より', 'へ', 
      'や', 'か', 'よ', 'ね', 'わ', 'さ', 'ぞ', 'ぜ', 'な', 'だ', 'である',
      'です', 'ます', 'だっ', 'であっ', 'という', 'といった'
    ];
    
    // Create a regex to find meaningful Japanese words/phrases
    // This matches sequences of Japanese characters that aren't just particles
    const meaningfulWordRegex = /([一-龯ひ-ゖヰ-ヷァ-ヺー]{1,})/g;
    
    let match;
    const wordsToMakeClickable = new Set();
    
    // Find all potential Japanese words
    while ((match = meaningfulWordRegex.exec(text)) !== null) {
      const word = match[1];
      
      // Skip if it's just a particle or too short
      if (!particles.includes(word) && word.length >= 1) {
        wordsToMakeClickable.add(word);
      }
    }
    
    console.log(`Found ${wordsToMakeClickable.size} potential words to make clickable`);
    
    // Sort by length (longest first) to avoid partial replacements
    const sortedWords = Array.from(wordsToMakeClickable).sort((a, b) => b.length - a.length);
    
    // Make each word clickable
    sortedWords.forEach(word => {
      // Only replace if not already wrapped in a span
      const regex = new RegExp(`(?!<[^>]*>)(${this.escapeRegex(word)})(?![^<]*>)`, 'g');
      clickableText = clickableText.replace(regex, 
        `<span class="clickable-word" data-word="${word}" data-source="dynamic">${word}</span>`
      );
    });
    
    console.log(`Made ${sortedWords.length} words clickable`);
    return clickableText.replace(/\n/g, "<br>");
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  toggleLanguage() {
    if (this.currentLanguage === "japanese") {
      this.currentLanguage = "english";
    } else {
      this.currentLanguage = "japanese";
    }
    this.updateLanguageDisplay();
  }

  updateLanguageDisplay() {
    if (this.currentLanguage === "japanese") {
      this.japaneseStory.classList.remove("hidden");
      this.englishStory.classList.add("hidden");
      this.toggleBtn.textContent = "Show English";
      this.bindWordClickEvents();
    } else {
      this.japaneseStory.classList.add("hidden");
      this.englishStory.classList.remove("hidden");
      this.toggleBtn.textContent = "Show Japanese";
    }
  }

  bindWordClickEvents() {
    // Remove existing event listeners to avoid duplicates
    const existingWords = document.querySelectorAll(".clickable-word");
    existingWords.forEach((word) => {
      word.replaceWith(word.cloneNode(true));
    });

    // Add event listeners to all clickable words
    const clickableWords = document.querySelectorAll(".clickable-word");
    console.log(`Found ${clickableWords.length} clickable words`); // Debug log

    clickableWords.forEach((word, index) => {
      // Add multiple event types for maximum compatibility
      word.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`Clicked word: ${word.dataset.word}`); // Debug log
        this.showWordPopup(e);
      });

      word.addEventListener(
        "touchstart",
        (e) => {
          // Visual feedback on touch
          word.style.backgroundColor = "#ffc107";
        },
        { passive: true }
      );

      word.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Reset visual feedback
          word.style.backgroundColor = "";
          console.log(`Touched word: ${word.dataset.word}`); // Debug log
          this.showWordPopup(e);
        },
        { passive: false }
      );

      word.addEventListener("touchcancel", (e) => {
        // Reset visual feedback if touch is cancelled
        word.style.backgroundColor = "";
      });
    });
  }

  async showWordPopup(event) {
    const word = event.target.dataset.word;
    let definition = this.fallbackDefinitions.get(word);

    // If no definition cached, fetch it dynamically
    if (!definition) {
      const apiKey = this.apiKeyInput.value.trim();
      if (!apiKey) {
        alert('API key needed to look up word definitions');
        return;
      }
      
      // Show loading state
      this.popupWord.textContent = word;
      this.popupMeaning.innerHTML = '<div>📚 Looking up definition...</div>';
      const popup = this.wordPopup;
      popup.classList.remove("hidden");
      this.positionPopup(event, popup);
      
      // Fetch definition
      definition = await this.getWordDefinition(word, apiKey);
    }

    if (!definition) return;

    this.popupWord.textContent = word;
    this.popupMeaning.innerHTML = `
            <div><strong>Reading:</strong> ${definition.reading}</div>
            <div><strong>Meaning:</strong> ${definition.meaning}</div>
        `;

    const popup = this.wordPopup;
    popup.classList.remove("hidden");
    this.positionPopup(event, popup);
    this.currentWord = word;
  }

  positionPopup(event, popup) {
    // For mobile scrolling issues, we need to ensure we get the right coordinates
    let touchX, touchY;
    
    if (event.type === "touchend" && event.changedTouches) {
      // Mobile touch - use pageX/pageY for consistent positioning
      const touch = event.changedTouches[0];
      touchX = touch.pageX;
      touchY = touch.pageY;
      
      // Convert to viewport coordinates for fixed positioning
      touchX = touchX - window.scrollX;
      touchY = touchY - window.scrollY;
    } else {
      // Desktop click - clientX/Y are already viewport coordinates
      touchX = event.clientX;
      touchY = event.clientY;
    }

    console.log(`Touch position: ${touchX}, ${touchY}, ScrollY: ${window.scrollY}`);

    // Get viewport dimensions
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Wait a frame for popup to render and get accurate dimensions
    requestAnimationFrame(() => {
      const popupRect = popup.getBoundingClientRect();
      const popupHeight = popupRect.height;
      const popupWidth = popupRect.width;

      // Calculate position relative to viewport (fixed positioning)
      let left = touchX - popupWidth / 2;
      let top = touchY - popupHeight - 20; // Show above touch with more margin

      // Horizontal positioning - keep popup on screen
      if (left + popupWidth > viewportWidth - 20) {
        left = viewportWidth - popupWidth - 20;
      }
      if (left < 20) {
        left = 20;
      }

      // Vertical positioning - if above touch goes off screen, show below
      if (top < 20) {
        top = touchY + 20; // Show below touch point
      }

      // If below touch also goes off screen, center in viewport
      if (top + popupHeight > viewportHeight - 20) {
        top = Math.max(20, (viewportHeight - popupHeight) / 2);
      }

      popup.style.top = `${top}px`;
      popup.style.left = `${left}px`;
      
      console.log(`Popup positioned at: ${left}, ${top}`);
    });
  }

  hidePopup() {
    this.wordPopup.classList.add("hidden");
  }

  async copyToClipboard() {
    const definition = this.fallbackDefinitions.get(this.currentWord);
    if (!definition) return;

    const textToCopy = `${this.currentWord} (${definition.reading}): ${definition.meaning}`;

    try {
      await navigator.clipboard.writeText(textToCopy);

      // Visual feedback
      const originalText = this.copyBtn.textContent;
      this.copyBtn.textContent = "✓ Copied!";
      this.copyBtn.style.background = "#28a745";

      setTimeout(() => {
        this.copyBtn.textContent = originalText;
        this.copyBtn.style.background = "#28a745";
      }, 1500);
    } catch (err) {
      console.error("Failed to copy: ", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  }

  handleDocumentClick(event) {
    if (
      !this.wordPopup.contains(event.target) &&
      !event.target.classList.contains("clickable-word")
    ) {
      this.hidePopup();
    }
  }

  showLoading(show, message = "Generating your story...") {
    if (show) {
      this.loadingDiv.textContent = message;
      this.loadingDiv.classList.remove("hidden");
      this.storySection.classList.add("hidden");
    } else {
      this.loadingDiv.classList.add("hidden");
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new JapaneseStudyApp();
});
