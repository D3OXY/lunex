export const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

export const MODELS = {
    "google/gemini-2.0-flash-001": {
        name: "Gemini 2.0 Flash",
        provider: "Google",
        features: {
            imageInput: true,
            featured: true,
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
            popular: true,
            imageInput: true,
            reasoning: true,
        },
    },
    "google/gemini-2.5-pro-preview": {
        name: "Gemini 2.5 Pro Preview",
        provider: "Google",
        features: {
            popular: true,
            imageInput: true,
            coding: true,
            reasoning: true,
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
            coding: true,
            free: true,
        },
    },
    "deepseek/deepseek-r1-0528-qwen3-8b:free": {
        name: "DeepSeek R1 0528 Qwen3 8B",
        provider: "DeepSeek",
        features: {
            coding: true,
            free: true,
            reasoning: true,
        },
    },
    "deepseek/deepseek-r1-0528:free": {
        name: "DeepSeek R1 0528",
        provider: "DeepSeek",
        features: {
            popular: true,
            coding: true,
            free: true,
            reasoning: true,
        },
    },
    "google/gemma-3-1b-it:free": {
        name: "Gemma 3 1B",
        provider: "Google",
        features: {
            free: true,
        },
    },
    "deepseek/deepseek-chat-v3-0324:free": {
        name: "DeepSeek V3 0324",
        provider: "DeepSeek",
        features: {
            free: true,
        },
    },
    "meta-llama/llama-3.3-8b-instruct:free": {
        name: "Llama 3.3 8B Instruct",
        provider: "Meta",
        features: {
            free: true,
        },
    },
    "mistralai/mistral-small-24b-instruct-2501:free": {
        name: "Mistral Small 24B Instruct 2501",
        provider: "Mistral",
        features: {
            free: true,
        },
    },
    "anthropic/claude-3-haiku:beta": {
        name: "Claude 3 Haiku (Self Moderated)",
        provider: "Anthropic",
        features: {
            selfModerated: true,
        },
    },
    "anthropic/claude-3-haiku": {
        name: "Claude 3 Haiku",
        provider: "Anthropic",
        features: {},
    },
    "openai/gpt-4.1-nano": {
        name: "GPT-4.1 Nano",
        provider: "OpenAI",
        features: {
            coding: true,
        },
    },
} as const;

export type ModelFeatures = {
    popular?: boolean;
    featured?: boolean;
    imageInput?: boolean;
    reasoning?: boolean;
    selfModerated?: boolean;
    coding?: boolean;
    free?: boolean;
    userModel?: boolean;
};

export type ModelDefinition = {
    name: string;
    provider: string;
    features?: ModelFeatures;
};

export const getModelsByProvider = () => {
    const modelsByProvider: Record<string, Record<string, ModelDefinition>> = {};
    for (const modelId in MODELS) {
        const model = MODELS[modelId as keyof typeof MODELS];
        let providerModels = modelsByProvider[model.provider];
        if (!providerModels) {
            providerModels = {};
            modelsByProvider[model.provider] = providerModels;
        }
        providerModels[modelId] = model;
    }
    return modelsByProvider;
};

// Helper function to create user model definition from model ID
export const createUserModelDefinition = (modelId: string): ModelDefinition => {
    // Split the model ID and create a readable name
    const parts = modelId.split("/");
    const lastPart = parts[parts.length - 1] ?? modelId;

    // Convert to readable name: "claude-3.5-sonnet" -> "Claude 3.5 Sonnet"
    const name = lastPart
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    return {
        name,
        provider: "User",
        features: {
            userModel: true,
        },
    };
};

// Get all models including user models
export const getAllModels = (userModels: string[] = []): Record<string, ModelDefinition> => {
    const allModels: Record<string, ModelDefinition> = {};

    // Add built-in models
    for (const modelId in MODELS) {
        allModels[modelId] = MODELS[modelId as keyof typeof MODELS];
    }

    // Add user models
    userModels.forEach((modelId) => {
        allModels[modelId] ??= createUserModelDefinition(modelId);
    });

    return allModels;
};

// Get models by provider including user models
export const getAllModelsByProvider = (userModels: string[] = []) => {
    const allModels = getAllModels(userModels);
    const modelsByProvider: Record<string, Record<string, ModelDefinition>> = {};

    for (const modelId in allModels) {
        const model = allModels[modelId];
        if (model) {
            modelsByProvider[model.provider] ??= {};
            modelsByProvider[model.provider]![modelId] = model;
        }
    }

    return modelsByProvider;
};
