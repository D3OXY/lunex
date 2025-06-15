"use client";

import { AIInputModelSelect, AIInputModelSelectContent, AIInputModelSelectItem, AIInputModelSelectTrigger, AIInputModelSelectValue } from "@/components/ui/kibo-ui/ai/input";
import { SelectGroup, SelectLabel } from "@/components/ui/select";
import { useChatStore } from "@/lib/stores/chat-store";
import { useUserModels } from "@/lib/stores/preferences-store";
import { getAllModelsByProvider, type ModelDefinition, type ModelFeatures } from "@/lib/models";
import { Brain, CodeIcon, ImageIcon, ShieldCheck, Sparkles, UserIcon } from "lucide-react";

export function ModelPicker(): React.JSX.Element {
    const { selectedModel, setSelectedModel } = useChatStore();
    const userModels = useUserModels();

    // Get all models including user-added ones
    const modelsByProvider = getAllModelsByProvider(userModels);

    return (
        <AIInputModelSelect value={selectedModel} onValueChange={setSelectedModel}>
            <AIInputModelSelectTrigger>
                <AIInputModelSelectValue placeholder="Select a model" />
            </AIInputModelSelectTrigger>
            <AIInputModelSelectContent className="max-h-[500px] overflow-y-auto">
                {Object.entries(modelsByProvider).map(([providerName, modelsInProvider]) => (
                    <SelectGroup key={providerName}>
                        <SelectLabel>{providerName}</SelectLabel>
                        {Object.entries(modelsInProvider).map(([modelId, model]: [string, ModelDefinition]) => {
                            const features: ModelFeatures = model.features ?? {};
                            return (
                                <AIInputModelSelectItem key={modelId} value={modelId}>
                                    <div className="flex items-center gap-2">
                                        <span>{model.name}</span>
                                        <div className="flex items-center gap-1">
                                            {features.imageInput && <ImageIcon size={14} className="text-muted-foreground" />}
                                            {features.reasoning && <Brain size={14} className="text-muted-foreground" />}
                                            {features.selfModerated && <ShieldCheck size={14} className="text-muted-foreground" />}
                                            {features.coding && <CodeIcon size={14} className="text-muted-foreground" />}
                                            {features.free && <Sparkles size={14} className="text-muted-foreground" />}
                                            {features.userModel && <UserIcon size={14} className="text-muted-foreground" />}
                                        </div>
                                    </div>
                                </AIInputModelSelectItem>
                            );
                        })}
                    </SelectGroup>
                ))}
            </AIInputModelSelectContent>
        </AIInputModelSelect>
    );
}
