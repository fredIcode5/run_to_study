// --- Fournisseurs de modèles de langage (Chat IA), côté serveur uniquement.
// Chaque fournisseur expose une API au format « chat completions » d'OpenAI
// (adaptateur 'compatibleOpenAI') ; un fournisseur au format différent
// recevra son propre adaptateur dans serviceIa.js, sans toucher à l'interface.
//
// Un fournisseur n'apparaît que si sa clé (variable d'environnement cleEnv) est
// définie, et un modèle que s'il figure dans la liste renvoyée par le
// fournisseur pour cette clé. Les modèles payants (gratuit: false) sont masqués
// tant que IA_MODELES_PAYANTS=true n'est pas défini.
//
// Niveaux gratuits vérifiés le 19/10/2026 (ils changent souvent) :
//  - Gemini : https://ai.google.dev/gemini-api/docs/pricing (« Free Tier »)
//  - Groq : offre gratuite avec limites de débit, https://console.groq.com/docs/rate-limits
//  - OpenRouter : modèles « :free », 20 requêtes/min et 50/jour sans crédits achetés,
//    https://openrouter.ai/docs/api/reference/limits
//  - OpenAI : pas de niveau gratuit pour l'API (facturation à l'usage)

export const FOURNISSEURS_IA = [
  {
    id: 'gemini',
    nom: 'Google Gemini',
    cleEnv: 'GEMINI_API_KEY',
    adaptateur: 'compatibleOpenAI',
    urlBase: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modeles: [
      { id: 'gemini-3.8-flash', nom: 'Gemini 3.8 Flash', gratuit: true },
      { id: 'gemini-3.5-flash-lite', nom: 'Gemini 3.5 Flash-Lite', gratuit: true },
      { id: 'gemini-3.6-flash', nom: 'Gemini 3.6 Flash', gratuit: true },
      { id: 'gemini-3.1-flash-lite', nom: 'Gemini 3.1 Flash-Lite', gratuit: true },
      { id: 'gemini-4-argon', nom: 'Gemini 4 Argon', gratuit: false },
    ],
  },
  {
    id: 'groq',
    nom: 'Groq',
    cleEnv: 'GROQ_API_KEY',
    adaptateur: 'compatibleOpenAI',
    urlBase: 'https://api.groq.com/openai/v1',
    modeles: [
      { id: 'llama-3.3-70b-versatile', nom: 'Llama 3.3 70B', gratuit: true },
      { id: 'openai/gpt-oss-120b', nom: 'GPT-OSS 120B', gratuit: true },
      { id: 'openai/gpt-oss-20b', nom: 'GPT-OSS 20B', gratuit: true },
      { id: 'llama-3.1-8b-instant', nom: 'Llama 3.1 8B Instant', gratuit: true },
    ],
  },
  {
    // Catalogue mouvant : les modèles gratuits (prix nul, suffixe « :free ») sont
    // lus dans la liste du fournisseur plutôt que figés ici
    id: 'openrouter',
    nom: 'OpenRouter',
    cleEnv: 'OPENROUTER_API_KEY',
    adaptateur: 'compatibleOpenAI',
    urlBase: 'https://openrouter.ai/api/v1',
    modelesGratuitsDynamiques: true,
    entetes: { 'X-Title': 'Pomodoro' },
  },
  {
    id: 'openai',
    nom: 'OpenAI',
    cleEnv: 'OPENAI_API_KEY',
    adaptateur: 'compatibleOpenAI',
    urlBase: 'https://api.openai.com/v1',
    modeles: [
      { id: 'gpt-6-luna', nom: 'GPT-6 Luna', gratuit: false },
      { id: 'gpt-6.1-sol', nom: 'GPT-6.1 Sol', gratuit: false },
      { id: 'gpt-6-astra', nom: 'GPT-6 Astra', gratuit: false },
    ],
  },
];
