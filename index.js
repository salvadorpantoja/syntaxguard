import {
    APP_TITLE, APP_SUBTITLE, STYLE_GUIDE_TITLE, STYLE_GUIDE_CONTENT,
    GEMINI_MODEL_NAME, INPUT_TEXT_LABEL, INPUT_TEXT_PLACEHOLDER,
    OUTPUT_TEXT_LABEL, OUTPUT_TEXT_PLACEHOLDER, SUBMIT_BUTTON_TEXT,
    SUBMIT_BUTTON_LOADING_TEXT, COPY_BUTTON_TEXT, COPIED_BUTTON_TEXT,
    CLEAR_BUTTON_TEXT, NOTES_LABEL
} from './constants.js';

// --- CONFIGURATION ---
// IMPORTANT: Replace this placeholder with your actual Cloudflare Worker URL.
const WORKER_URL = 'https://styleguard-api-proxy.spantoja.workers.dev';


// --- State Variables ---
let S = {
    inputText: '',
    outputText: '',
    notes: [],
    alternatives: [],
    isLoading: false,
    error: null,
    copied: false,
};

// --- DOM Element References ---
let D = {}; // To store DOM elements

// --- SVG Icons ---
const ICONS = {
    clipboard: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 4.625v2.625m0 0H12m3.75 0l-3.75-3.75M12 21l-3.75-3.75m0 0V11.25A2.25 2.25 0 0110.5 9h3" /></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-green-400"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`,
    sparkles: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L24 5.25l-.813 2.846a4.5 4.5 0 00-3.09 3.09L18.25 12zm-9.75 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15 21.75l-2.846.813a4.5 4.5 0 00-3.09-3.09L6.25 18l2.846-.813a4.5 4.5 0 003.09-3.09z" /></svg>`,
    spinner: `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`
};

function isWorkerConfigured() {
    return WORKER_URL && !WORKER_URL.includes('your-username');
}

/**
 * Sends text to the Cloudflare Worker to be corrected by the Gemini API.
 * @param {string} textToCorrect The text to be corrected.
 * @param {string} styleGuide The style guide to use for corrections.
 * @returns {Promise<{correctedText: string, notes: string[], alternatives: string[]}>}
 */
async function correctTextWithProxy(textToCorrect, styleGuide) {
    if (!textToCorrect.trim()) return { correctedText: "", notes: [], alternatives: [] };
    
    if (!isWorkerConfigured()) {
        throw new Error("Configuration needed: Please update the WORKER_URL constant in index.js before using the application.");
    }

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                textToCorrect,
                styleGuide
            }),
        });

        const result = await response.json();
        
        if (!response.ok) {
            // The worker returns a JSON object with an 'error' key on failure
            throw new Error(result.error || `Request failed with status ${response.status}`);
        }
        
        if (typeof result.correctedText !== 'string' || !Array.isArray(result.notes) || (result.alternatives && !Array.isArray(result.alternatives))) {
            console.error("Worker response is missing required fields or has incorrect types.", result);
            throw new Error("Received an invalid response from the correction service.");
        }

        return result;

    } catch (apiError) {
        console.error("Error calling Cloudflare worker:", apiError);
        if (apiError instanceof Error) {
            // Check for syntax error which implies JSON parsing failed.
            if (apiError.name === 'SyntaxError') {
                 throw new Error("The correction service returned a response in an unexpected format. Please try again.");
            }
             throw new Error(`Failed to correct text due to a service error: ${apiError.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the correction service.");
    }
}

// --- UI Update Functions ---

function formatLineForDisplay(line) {
    // Handle bold text **text** -> <strong>text</strong>
    return line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-100">$1</strong>');
}

function renderStyleGuide() {
    if (!D.styleGuideContainer) return;

    const lines = STYLE_GUIDE_CONTENT.trim().split('\n');
    let htmlContent = `<h2 class="text-xl font-semibold text-sky-300 mb-4">${STYLE_GUIDE_TITLE}</h2>`;
    let inList = false;

    lines.forEach(line => {
        const trimmedLine = line.trim();
        const originalLineLeadingSpaces = line.match(/^(\s*)/)[0].length;

        if (trimmedLine === '---') {
            if (inList) { htmlContent += '</ul>'; inList = false; }
            htmlContent += '<hr class="my-4 border-slate-600">';
        } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.match(/^\*\*([^*]+)\*\*$/)) {
            // Main headings (only bold, entire line)
            if (inList) { htmlContent += '</ul>'; inList = false; }
            const headingText = trimmedLine.slice(2, -2);
            htmlContent += `<h3 class="text-lg font-semibold text-sky-200 mt-4 mb-2">${headingText}</h3>`;
        } else if (trimmedLine.startsWith('* ')) {
            // List items
            if (!inList) {
                htmlContent += '<ul class="list-none space-y-1.5 pl-0">'; // Using list-none and custom bullet. Increased space-y
                inList = true;
            }
            const itemText = trimmedLine.substring(2).trim(); // Remove '* '
            
            let paddingClass = '';
            if (originalLineLeadingSpaces >= 2 && originalLineLeadingSpaces < 4) paddingClass = 'pl-3';
            else if (originalLineLeadingSpaces >= 4) paddingClass = 'pl-6';

            htmlContent += `<li class="flex items-start ${paddingClass}">
                              <span class="text-sky-400 mr-2 mt-0.5 flex-shrink-0">&#8227;</span>
                              <span class="flex-1 text-slate-300">${formatLineForDisplay(itemText)}</span>
                            </li>`;
        } else if (trimmedLine) { // Non-empty line, not a heading or list item
            if (inList) { htmlContent += '</ul>'; inList = false; }
            
            if (/^(Examples:|Instead of:|Use:|Rule:)/i.test(trimmedLine)) {
                 htmlContent += `<p class="text-md font-semibold text-slate-200 mt-3 mb-1">${formatLineForDisplay(trimmedLine)}</p>`;
            } else {
                 htmlContent += `<p class="text-slate-300 mb-1.5">${formatLineForDisplay(trimmedLine)}</p>`;
            }
        } else { // Empty line (acts as a paragraph break)
            if (inList) { htmlContent += '</ul>'; inList = false; }
        }
    });

    if (inList) { htmlContent += '</ul>'; } // Close any open list

    D.styleGuideContainer.innerHTML = htmlContent;
}


function updateUI() {
    // Update textareas
    D.inputTextarea.value = S.inputText;
    D.outputTextarea.value = S.outputText;

    // Render notes and alternatives
    const hasNotes = S.notes && S.notes.length > 0;
    const hasAlternatives = S.alternatives && S.alternatives.length > 0;

    if (hasNotes || hasAlternatives) {
        let notesContentHtml = '';
        if (hasNotes) {
            const notesHtml = S.notes.map(note =>
                `<li class="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-cyan-400 mr-3 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <span class="flex-1">${note}</span>
                </li>`
            ).join('');
            notesContentHtml += `<ul class="space-y-2.5">${notesHtml}</ul>`;
        }

        if (hasAlternatives) {
            const alternativeItems = S.alternatives.map(alt =>
                `<li class="p-3 bg-slate-600/50 rounded-md">
                   <pre class="text-slate-200 whitespace-pre-wrap font-sans">${alt}</pre>
                 </li>`
            ).join('');

            notesContentHtml += `
                <div class="mt-4">
                    <h4 class="text-base font-semibold text-cyan-300 mb-2">Alternative Formats:</h4>
                    <ul class="space-y-2.5">${alternativeItems}</ul>
                </div>
            `;
        }
        
        D.notesContainer.innerHTML = notesContentHtml;
        D.notesSection.classList.remove('hidden');
    } else {
        D.notesContainer.innerHTML = '';
        D.notesSection.classList.add('hidden');
    }


    // Update error display
    if (S.error) {
        D.errorContainer.innerHTML = `
            <p class="font-semibold">Error:</p>
            <p>${S.error}</p>
        `;
        D.errorContainer.classList.remove('hidden');
        D.errorContainer.setAttribute('aria-hidden', 'false');
    } else {
        D.errorContainer.classList.add('hidden');
        D.errorContainer.innerHTML = '';
        D.errorContainer.setAttribute('aria-hidden', 'true');
    }

    // Update Submit Button
    D.submitButton.disabled = S.isLoading || !S.inputText.trim() || !isWorkerConfigured();
    const submitIconEl = D.submitButton.querySelector('.icon-container');
    const submitTextEl = D.submitButton.querySelector('.text-container');
    
    if (S.isLoading) {
        submitIconEl.innerHTML = ICONS.spinner;
        submitTextEl.textContent = SUBMIT_BUTTON_LOADING_TEXT;
    } else {
        submitIconEl.innerHTML = ICONS.sparkles;
        submitTextEl.textContent = SUBMIT_BUTTON_TEXT;
    }

    // Update Clear Button
    D.clearButton.disabled = S.isLoading || (!S.inputText.trim() && !S.outputText.trim());
    D.clearButton.textContent = CLEAR_BUTTON_TEXT;

    // Update Copy Button
    if (S.outputText) {
        D.copyButton.classList.remove('hidden');
        D.copyButton.innerHTML = S.copied ? ICONS.check : ICONS.clipboard;
        D.copyButton.title = S.copied ? COPIED_BUTTON_TEXT : COPY_BUTTON_TEXT;
        D.copyButton.setAttribute('aria-label', S.copied ? COPIED_BUTTON_TEXT : COPY_BUTTON_TEXT);
    } else {
        D.copyButton.classList.add('hidden');
    }

    // Textarea disabled state
    D.inputTextarea.disabled = S.isLoading || !isWorkerConfigured();
}

// --- Event Handlers ---
function handleInputChange(event) {
    S.inputText = event.target.value;
    // Clear the error if the user starts typing and the error is the config error
    if (S.error && S.error.startsWith("Configuration needed")) {
       S.error = null;
    }
    updateUI();
}

async function handleSubmitClick() {
    if (!isWorkerConfigured()) {
        S.error = "Configuration needed: Please update the WORKER_URL constant in index.js before using the application.";
        updateUI();
        return;
    }
    if (!S.inputText.trim() || S.isLoading) {
        if (!S.inputText.trim() && !S.error) S.error = "Please enter some text to correct.";
        updateUI();
        return;
    }
    S.isLoading = true;
    S.error = null;
    S.outputText = '';
    S.notes = [];
    S.alternatives = [];
    updateUI();

    try {
        const result = await correctTextWithProxy(S.inputText, STYLE_GUIDE_CONTENT);
        S.outputText = result.correctedText;
        S.notes = result.notes;
        S.alternatives = result.alternatives || [];
    } catch (err) {
        if (err instanceof Error) {
            S.error = err.message;
        } else {
            S.error = "An unknown error occurred while correcting text.";
        }
    } finally {
        S.isLoading = false;
        updateUI();
    }
}

async function handleCopyClick() {
    if (!S.outputText || S.copied) return;
    try {
        await navigator.clipboard.writeText(S.outputText);
        S.copied = true;
        updateUI();
        setTimeout(() => {
            S.copied = false;
            updateUI();
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        S.error = "Failed to copy text to clipboard. Your browser may not support this or permissions are denied.";
        updateUI();
    }
}

function handleClearInputClick() {
    S.inputText = '';
    S.outputText = '';
    S.notes = [];
    S.alternatives = [];
    // Keep the configuration error if it exists, otherwise clear general errors.
    if (!S.error || !S.error.startsWith("Configuration needed")) {
      S.error = null;
    }
    S.copied = false; 
    D.inputTextarea.focus();
    updateUI();
}


// --- Initialization ---
function initializeApp() {
    // Main UI Elements
    D.appTitle = document.getElementById('appTitle');
    D.appSubtitle = document.getElementById('appSubtitle');
    D.styleGuideContainer = document.getElementById('styleGuideContainer');
    D.inputTextarea = document.getElementById('inputTextarea');
    D.outputTextarea = document.getElementById('outputTextarea');
    D.inputTextLabel = document.getElementById('inputTextLabel');
    D.outputTextLabel = document.getElementById('outputTextLabel');
    D.submitButton = document.getElementById('submitButton');
    D.clearButton = document.getElementById('clearButton');
    D.errorContainer = document.getElementById('errorContainer');
    D.copyButton = document.getElementById('copyButton');
    D.currentYear = document.getElementById('currentYear');
    D.notesSection = document.getElementById('notesSection');
    D.notesContainer = document.getElementById('notesContainer');
    D.notesLabel = document.getElementById('notesLabel');

    if (D.appTitle) D.appTitle.textContent = APP_TITLE;
    if (D.appSubtitle) D.appSubtitle.textContent = APP_SUBTITLE;
    if (D.inputTextLabel) D.inputTextLabel.textContent = INPUT_TEXT_LABEL;
    if (D.outputTextLabel) D.outputTextLabel.textContent = OUTPUT_TEXT_LABEL;
    if (D.notesLabel) D.notesLabel.textContent = NOTES_LABEL;
    if (D.inputTextarea) D.inputTextarea.placeholder = INPUT_TEXT_PLACEHOLDER;
    if (D.outputTextarea) D.outputTextarea.placeholder = OUTPUT_TEXT_PLACEHOLDER;
    if (D.currentYear) D.currentYear.textContent = new Date().getFullYear().toString();

    renderStyleGuide();
    
    // Main Event Listeners
    if (D.inputTextarea) D.inputTextarea.addEventListener('input', handleInputChange);
    if (D.submitButton) D.submitButton.addEventListener('click', handleSubmitClick);
    if (D.clearButton) D.clearButton.addEventListener('click', handleClearInputClick);
    if (D.copyButton) D.copyButton.addEventListener('click', handleCopyClick);
    
    // Check for configuration on load
    if (!isWorkerConfigured()) {
        S.error = "Configuration needed: Please update the WORKER_URL constant in index.js before using the application.";
    }

    updateUI(); 
}

document.addEventListener('DOMContentLoaded', initializeApp);