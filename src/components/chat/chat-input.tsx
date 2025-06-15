/* eslint-disable @next/next/no-img-element */
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
import { Brain, CodeIcon, GlobeIcon, ImageIcon, MicIcon, SendIcon, ShieldCheck, Sparkles, UserIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { getModelsByProvider, type ModelDefinition, type ModelFeatures } from "@/lib/models";
import { FileUpload } from "@/components/chat/file-upload";

export const ChatInput = ({ chatId, disabled, onSubmit }: { chatId: Id<"chats"> | null; disabled: boolean; onSubmit: (e: React.FormEvent) => void }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { query, setQuery, selectedModel, setSelectedModel, webSearchEnabled, setWebSearchEnabled, attachments, clearAttachments } = useChatStore();

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
                if ((query.trim() || attachments.length > 0) && !disabled) {
                    onSubmit(e);
                    // Clear attachments after sending
                    clearAttachments();
                }
            }
        }
    };

    return (
        <div className="space-y-3">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4">
                    {attachments.map((attachment, index) => (
                        <div key={index} className="bg-muted flex items-center gap-2 rounded-lg p-2 text-sm">
                            {attachment.type === "image" ? (
                                <img src={attachment.url} alt={attachment.name} className="h-8 w-8 rounded object-cover" />
                            ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded bg-red-100">
                                    <span className="text-xs font-medium text-red-600">PDF</span>
                                </div>
                            )}
                            <span className="max-w-32 truncate">{attachment.name}</span>
                            <button
                                onClick={() => {
                                    const newAttachments = attachments.filter((_, i) => i !== index);
                                    // Update attachments in store
                                    clearAttachments();
                                    newAttachments.forEach((att) => useChatStore.getState().addAttachment(att));
                                }}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <AIInput onSubmit={onSubmit}>
                <AIInputTextarea
                    id="ai-chat-input"
                    ref={textareaRef}
                    key={`${chatId ? `${chatId}` : "new-chat"}`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value ?? null)}
                    onKeyDown={handleKeyDown}
                    placeholder={attachments.length > 0 ? "Add a message (optional)..." : "What would you like to know?"}
                    disabled={disabled}
                    minHeight={20}
                    maxHeight={200}
                />
                <AIInputToolbar>
                    <AIInputTools>
                        <FileUpload />
                        <AIInputButton>
                            <MicIcon size={16} />
                        </AIInputButton>
                        <AIInputButton
                            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                            className={webSearchEnabled ? "bg-primary/10 text-primary" : ""}
                            title={webSearchEnabled ? "Disable web search" : "Enable web search"}
                        >
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
                                                        {features.userModel && <UserIcon size={14} className="text-muted-foreground" />}
                                                    </div>
                                                </AIInputModelSelectItem>
                                            );
                                        })}
                                    </SelectGroup>
                                ))}
                            </AIInputModelSelectContent>
                        </AIInputModelSelect>
                    </AIInputTools>
                    <AIInputSubmit disabled={(!query.trim() && attachments.length === 0) || disabled}>
                        <SendIcon className="h-4 w-4" />
                    </AIInputSubmit>
                </AIInputToolbar>
            </AIInput>
        </div>
    );
};
