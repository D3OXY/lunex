import {
    AIInput,
    AIInputButton,
    AIInputModelSelect,
    AIInputModelSelectContent,
    AIInputModelSelectItem,
    AIInputModelSelectTrigger,
    AIInputModelSelectValue,
    AIInputSubmit,
    AIInputTextarea,
    AIInputToolbar,
    AIInputTools,
} from "@/components/ui/kibo-ui/ai/input";
import { SelectGroup, SelectLabel } from "@/components/ui/select";
import { useChatStore } from "@/lib/stores/chat-store";
import { Brain, CodeIcon, GlobeIcon, ImageIcon, MicIcon, PlusIcon, SendIcon, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { getModelsByProvider, type ModelDefinition, type ModelFeatures } from "@/lib/models";

export const ChatInput = ({ chatId, disabled, onSubmit }: { chatId: Id<"chats"> | null; disabled: boolean; onSubmit: (e: React.FormEvent) => void }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { query, setQuery, selectedModel, setSelectedModel } = useChatStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't interfere if user is already typing in an input/textarea or if modifiers are pressed
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.ctrlKey || e.metaKey || e.altKey || disabled) {
                return;
            }

            // Only handle printable characters (letters, numbers, symbols, space)
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                setQuery(query + e.key);
                // Focus the textarea after state update
                setTimeout(() => {
                    textareaRef.current?.focus();
                }, 0);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, disabled]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
            if (e.shiftKey) {
                // Shift+Enter: Allow default behavior (new line)
                return;
            } else {
                // Enter: Submit the message
                e.preventDefault();
                if (query.trim() && !disabled) {
                    onSubmit(e);
                }
            }
        }
    };

    return (
        <AIInput onSubmit={onSubmit}>
            <AIInputTextarea
                id="ai-chat-input"
                ref={textareaRef}
                key={`${chatId ? `${chatId}` : "new-chat"}`}
                value={query}
                onChange={(e) => setQuery(e.target.value ?? null)}
                onKeyDown={handleKeyDown}
                placeholder="What would you like to know?"
                disabled={disabled}
                minHeight={20}
                maxHeight={200}
            />
            <AIInputToolbar>
                <AIInputTools>
                    <AIInputButton>
                        <PlusIcon size={16} />
                    </AIInputButton>
                    <AIInputButton>
                        <MicIcon size={16} />
                    </AIInputButton>
                    <AIInputButton>
                        <GlobeIcon size={16} />
                        <span>Search</span>
                    </AIInputButton>
                    <AIInputModelSelect value={selectedModel} onValueChange={setSelectedModel}>
                        <AIInputModelSelectTrigger>
                            <AIInputModelSelectValue placeholder="Select a model" />
                        </AIInputModelSelectTrigger>
                        <AIInputModelSelectContent className="max-h-[500px] overflow-y-auto">
                            {Object.entries(getModelsByProvider()).map(([providerName, modelsInProvider]) => (
                                <SelectGroup key={providerName}>
                                    <SelectLabel>{providerName}</SelectLabel>
                                    {Object.entries(modelsInProvider).map(([modelId, model]: [string, ModelDefinition]) => {
                                        const features: ModelFeatures = model.features ?? {};
                                        return (
                                            <AIInputModelSelectItem key={modelId} value={modelId}>
                                                <div className="flex items-center gap-2">
                                                    {model.name}
                                                    {features.imageInput && <ImageIcon size={14} className="text-muted-foreground" />}
                                                    {features.reasoning && <Brain size={14} className="text-muted-foreground" />}
                                                    {features.selfModerated && <ShieldCheck size={14} className="text-muted-foreground" />}
                                                    {features.free && <Sparkles size={14} className="text-muted-foreground" />}
                                                    {features.coding && <CodeIcon size={14} className="text-muted-foreground" />}
                                                </div>
                                            </AIInputModelSelectItem>
                                        );
                                    })}
                                </SelectGroup>
                            ))}
                        </AIInputModelSelectContent>
                    </AIInputModelSelect>
                </AIInputTools>
                <AIInputSubmit disabled={!query.trim() || disabled}>
                    <SendIcon className="h-4 w-4" />
                </AIInputSubmit>
            </AIInputToolbar>
        </AIInput>
    );
};
