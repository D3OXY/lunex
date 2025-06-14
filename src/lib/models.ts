export const MODELS = {
    "google/gemini-2.0-flash-001": {
        name: "Gemini 2.0 Flash",
        provider: "Google",
        features: {
            imageInput: true,
        },
    },
    "openai/gpt-4o-mini": {
        name: "GPT-4o Mini",
        provider: "OpenAI",
        features: {
            imageInput: true,
        },
    },
    "google/gemini-2.5-flash-preview-05-20": {
        name: "Gemini 2.5 Flash Preview",
        provider: "Google",
        features: {
            imageInput: true,
            thinking: true,
        },
    },
    "google/gemini-2.5-pro-preview": {
        name: "Gemini 2.5 Pro Preview",
        provider: "Google",
        features: {
            imageInput: true,
            thinking: true,
        },
    },
    "qwen/qwen2.5-vl-72b-instruct:free": {
        name: "Qwen 2.5 VL 72B Instruct",
        provider: "Qwen",
        features: {
            free: true,
        },
    },
    "qwen/qwen-2.5-coder-32b-instruct:free": {
        name: "Qwen 2.5 Coder 32B Instruct",
        provider: "Qwen",
        features: {
            free: true,
        },
    },
    "deepseek/deepseek-r1-0528-qwen3-8b:free": {
        name: "DeepSeek R1 0528 Qwen3 8B",
        provider: "DeepSeek",
        features: {
            free: true,
        },
    },
    "deepseek/deepseek-r1-0528:free": {
        name: "DeepSeek R1 0528",
        provider: "DeepSeek",
        features: {
            free: true,
        },
    },
} as const;
