/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAllModels, type ModelFeatures } from "@/lib/models";
import { useChatStore } from "@/lib/stores/chat-store";
import { useUserModels } from "@/lib/stores/preferences-store";
import { Brain, Check, ChevronDown, Code, ImageIcon, Search, Shield, Sparkles, User } from "lucide-react";
import { useMemo, useState } from "react";

export function ModelPicker(): React.JSX.Element {
    const { selectedModel, setSelectedModel } = useChatStore();
    const userModels = useUserModels();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProvider, setSelectedProvider] = useState<string>("All");
    const [selectedFeature, setSelectedFeature] = useState<string>("All");
    const [isOpen, setIsOpen] = useState(false);

    // Get all models including user-added ones
    const allModels = getAllModels(userModels);
    const selectedModelData = allModels[selectedModel];

    // Get unique providers with user models prioritized
    const providers = useMemo(() => {
        const providerSet = new Set(Object.values(allModels).map((model) => model.provider));
        const providerList = Array.from(providerSet).sort();

        // Put "User" first if it exists, then "All"
        const sortedProviders = ["All"];
        if (providerList.includes("User")) {
            sortedProviders.push("User");
            providerList.splice(providerList.indexOf("User"), 1);
        }
        sortedProviders.push(...providerList);

        return sortedProviders;
    }, [allModels]);

    // Available features for filtering
    const availableFeatures = ["All", "Vision", "Reasoning", "Coding", "Self-Moderated", "Free"];

    // Filter models based on search, provider, and features
    const filteredModels = useMemo(() => {
        let models = Object.entries(allModels);

        // Filter by provider
        if (selectedProvider !== "All") {
            models = models.filter(([, model]) => model.provider === selectedProvider);
        }

        // Filter by feature
        if (selectedFeature !== "All") {
            models = models.filter(([, model]) => {
                const features = model.features ?? {};
                switch (selectedFeature) {
                    case "Vision":
                        return features.imageInput;
                    case "Reasoning":
                        return features.reasoning;
                    case "Coding":
                        return features.coding;
                    case "Self-Moderated":
                        return features.selfModerated;
                    case "Free":
                        return features.free;
                    default:
                        return true;
                }
            });
        }

        // Filter by search query
        if (searchQuery) {
            models = models.filter(([modelId, model]) => model.name.toLowerCase().includes(searchQuery.toLowerCase()) || modelId.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        // Sort: User models first, then by name
        models.sort(([, a], [, b]) => {
            if (a.provider === "User" && b.provider !== "User") return -1;
            if (a.provider !== "User" && b.provider === "User") return 1;
            return a.name.localeCompare(b.name);
        });

        return models;
    }, [allModels, selectedProvider, selectedFeature, searchQuery]);

    const handleModelSelect = (modelId: string): void => {
        setSelectedModel(modelId);
        setIsOpen(false);
    };

    return (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerTrigger asChild>
                <Button variant="outline" className="min-w-[140px] justify-between">
                    <div className="flex items-center gap-2 truncate">{selectedModelData ? <span className="truncate">{selectedModelData.name}</span> : "Select Model"}</div>
                    <ChevronDown size={16} className="flex-shrink-0" />
                </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[80vh]">
                <div className="mx-auto w-full max-w-4xl">
                    <DrawerHeader>
                        <DrawerTitle>Choose AI Model</DrawerTitle>
                    </DrawerHeader>

                    <div className="space-y-4 px-6 pb-6">
                        {/* Search */}
                        <div className="relative">
                            <Search size={16} className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 transform" />
                            <Input placeholder="Search models..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                        </div>

                        {/* Provider Filter */}
                        <div>
                            <div className="mb-2 text-sm font-medium">Provider</div>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {providers.map((provider) => (
                                    <Button
                                        key={provider}
                                        variant={selectedProvider === provider ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedProvider(provider)}
                                        className="flex-shrink-0"
                                    >
                                        {provider === "User" && <User size={14} className="mr-1" />}
                                        {provider}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Feature Filter */}
                        <div>
                            <div className="mb-2 text-sm font-medium">Capabilities</div>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {availableFeatures.map((feature) => (
                                    <Button
                                        key={feature}
                                        variant={selectedFeature === feature ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedFeature(feature)}
                                        className="flex-shrink-0"
                                    >
                                        {feature === "Vision" && <ImageIcon size={14} className="mr-1" />}
                                        {feature === "Reasoning" && <Brain size={14} className="mr-1" />}
                                        {feature === "Coding" && <Code size={14} className="mr-1" />}
                                        {feature === "Self-Moderated" && <Shield size={14} className="mr-1" />}
                                        {feature === "Free" && <Sparkles size={14} className="mr-1" />}
                                        {feature}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Models List */}
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-2">
                                {filteredModels.length === 0 ? (
                                    <div className="text-muted-foreground py-8 text-center">No models found</div>
                                ) : (
                                    filteredModels.map(([modelId, model]) => {
                                        const features: ModelFeatures = model.features ?? {};
                                        return (
                                            <Button key={modelId} variant="ghost" className="h-auto w-full justify-between p-4" onClick={() => handleModelSelect(modelId)}>
                                                <div className="flex flex-1 flex-col items-start gap-2">
                                                    <div className="flex w-full items-center gap-2">
                                                        <span className="font-medium">{model.name}</span>
                                                        {model.provider === "User" && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                Custom
                                                            </Badge>
                                                        )}
                                                        {features.free && (
                                                            <Badge variant="outline" className="text-xs text-green-600">
                                                                Free
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="text-muted-foreground font-mono text-xs">{modelId}</div>

                                                    {/* Features */}
                                                    {(features.imageInput || features.reasoning || features.coding || features.selfModerated) && (
                                                        <div className="mt-1 flex flex-wrap gap-2">
                                                            {features.imageInput && (
                                                                <div className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                                                    <ImageIcon size={12} />
                                                                    <span>Vision</span>
                                                                </div>
                                                            )}
                                                            {features.reasoning && (
                                                                <div className="flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                                                    <Brain size={12} />
                                                                    <span>Reasoning</span>
                                                                </div>
                                                            )}
                                                            {features.coding && (
                                                                <div className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
                                                                    <Code size={12} />
                                                                    <span>Coding</span>
                                                                </div>
                                                            )}
                                                            {features.selfModerated && (
                                                                <div className="flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                                                                    <Shield size={12} />
                                                                    <span>Self-Moderated</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {selectedModel === modelId && <Check size={16} className="text-primary flex-shrink-0" />}
                                            </Button>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
