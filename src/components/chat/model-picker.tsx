/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAllModels, type ModelFeatures } from "@/lib/models";
import { useChatStore } from "@/lib/stores/chat-store";
import { useUserModels } from "@/lib/stores/preferences-store";
import { Brain, Check, ChevronDown, Code, Filter, ImageIcon, Keyboard, Shield, Sparkles, Star, TrendingUp, User, X } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

export function ModelPicker(): React.JSX.Element {
    const { selectedModel, setSelectedModel } = useChatStore();
    const userModels = useUserModels();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProvider, setSelectedProvider] = useState<string>("All");
    const [selectedFeature, setSelectedFeature] = useState<string>("All");
    const [isOpen, setIsOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);

    // Get all models including user-added ones
    const allModels = getAllModels(userModels);
    const selectedModelData = allModels[selectedModel];

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "m") {
                e.preventDefault();
                setIsOpen(!isOpen);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    // Reset search when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery("");
        }
    }, [isOpen]);

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
    const availableFeatures = ["All", "Featured", "Popular", "Vision", "Reasoning", "Coding", "Self-Moderated", "Free"];

    // Filter and sort models
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
                    case "Featured":
                        return features.featured;
                    case "Popular":
                        return features.popular;
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

        // Sort: User models first, then featured, then popular, then the rest
        models.sort(([, a], [, b]) => {
            // User models first
            if (a.provider === "User" && b.provider !== "User") return -1;
            if (a.provider !== "User" && b.provider === "User") return 1;

            // Within same provider type, prioritize featured then popular
            const aFeatured = a.features?.featured ?? false;
            const bFeatured = b.features?.featured ?? false;
            const aPopular = a.features?.popular ?? false;
            const bPopular = b.features?.popular ?? false;

            if (aFeatured && !bFeatured) return -1;
            if (!aFeatured && bFeatured) return 1;
            if (aPopular && !bPopular) return -1;
            if (!aPopular && bPopular) return 1;

            return a.name.localeCompare(b.name);
        });

        return models;
    }, [allModels, selectedProvider, selectedFeature, searchQuery]);

    // Group models for display
    const groupedModels = useMemo(() => {
        const groups = {
            user: [] as Array<[string, (typeof allModels)[string]]>,
            featured: [] as Array<[string, (typeof allModels)[string]]>,
            popular: [] as Array<[string, (typeof allModels)[string]]>,
            other: [] as Array<[string, (typeof allModels)[string]]>,
        };

        filteredModels.forEach(([modelId, model]) => {
            if (model.provider === "User") {
                groups.user.push([modelId, model]);
            } else if (model.features?.featured) {
                groups.featured.push([modelId, model]);
            } else if (model.features?.popular) {
                groups.popular.push([modelId, model]);
            } else {
                groups.other.push([modelId, model]);
            }
        });

        return groups;
    }, [filteredModels]);

    const handleModelSelect = (modelId: string): void => {
        setSelectedModel(modelId);
        setIsOpen(false);
    };

    const handleFilterSelect = (type: "provider" | "feature", value: string): void => {
        if (type === "provider") {
            setSelectedProvider(value);
        } else {
            setSelectedFeature(value);
        }
        setFilterOpen(false);
    };

    const clearFilters = (): void => {
        setSelectedProvider("All");
        setSelectedFeature("All");
        setFilterOpen(false);
    };

    const hasActiveFilters = selectedProvider !== "All" || selectedFeature !== "All";

    const renderModelItem = (modelId: string, model: (typeof allModels)[string]) => {
        const features: ModelFeatures = model.features ?? {};
        return (
            <CommandItem key={modelId} value={`${model.name} ${modelId}`} onSelect={() => handleModelSelect(modelId)} className="flex flex-col items-start gap-1 p-3">
                <div className="flex w-full items-center gap-2">
                    <span className="font-medium">{model.name}</span>
                    {model.provider === "User" && (
                        <Badge variant="secondary" className="text-xs">
                            Custom
                        </Badge>
                    )}
                    {features.featured && (
                        <Badge variant="default" className="text-xs">
                            <Star className="mr-1 h-3 w-3" />
                            Featured
                        </Badge>
                    )}
                    {features.popular && (
                        <Badge variant="outline" className="text-xs text-orange-600">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Popular
                        </Badge>
                    )}
                    {features.free && (
                        <Badge variant="outline" className="text-xs text-green-600">
                            Free
                        </Badge>
                    )}
                    {selectedModel === modelId && <Check className="text-primary ml-auto h-4 w-4" />}
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
            </CommandItem>
        );
    };

    return (
        <>
            <Button variant="outline" className="min-w-[140px] justify-between" onClick={() => setIsOpen(true)}>
                <div className="flex items-center gap-2 truncate">
                    {selectedModelData ? <span className="max-w-[200px] truncate">{selectedModelData.name}</span> : "Select Model"}
                </div>
                <ChevronDown size={16} className="flex-shrink-0" />
            </Button>

            <CommandDialog open={isOpen} onOpenChange={setIsOpen} title="Choose AI Model" description="Search and filter AI models">
                <CommandInput placeholder="Search models... (⌘M)" value={searchQuery} onValueChange={setSearchQuery} />
                <div className="flex flex-1 flex-col overflow-hidden">
                    <ScrollArea className="flex-1">
                        <CommandList>
                            <CommandEmpty>{searchQuery.trim() ? "No models found." : "Start typing to search models..."}</CommandEmpty>

                            {/* User Models */}
                            {groupedModels.user.length > 0 && (
                                <CommandGroup heading="Your Models">{groupedModels.user.map(([modelId, model]) => renderModelItem(modelId, model))}</CommandGroup>
                            )}

                            {/* Featured Models */}
                            {groupedModels.featured.length > 0 && (
                                <CommandGroup heading="Featured Models">{groupedModels.featured.map(([modelId, model]) => renderModelItem(modelId, model))}</CommandGroup>
                            )}

                            {/* Popular Models */}
                            {groupedModels.popular.length > 0 && (
                                <CommandGroup heading="Popular Models">{groupedModels.popular.map(([modelId, model]) => renderModelItem(modelId, model))}</CommandGroup>
                            )}

                            {/* Other Models */}
                            {groupedModels.other.length > 0 && (
                                <CommandGroup heading="Other Models">{groupedModels.other.map(([modelId, model]) => renderModelItem(modelId, model))}</CommandGroup>
                            )}
                        </CommandList>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t p-2">
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                            <Keyboard className="h-3 w-3" />
                            <span>⌘M to open</span>
                        </div>

                        <div className="flex items-center gap-1">
                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearFilters}>
                                    <X className="mr-1 h-3 w-3" />
                                    Reset
                                </Button>
                            )}
                            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="relative h-7 w-7 p-0">
                                        <Filter className={`h-4 w-4 ${hasActiveFilters ? "text-primary" : ""}`} />
                                        {hasActiveFilters && <div className="bg-primary absolute -top-1 -right-1 h-2 w-2 rounded-full" />}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0" align="end">
                                    <div className="max-h-80 overflow-y-auto">
                                        <div className="p-1">
                                            <CommandList>
                                                <CommandGroup heading="Provider">
                                                    {providers.map((provider) => (
                                                        <CommandItem key={provider} onSelect={() => handleFilterSelect("provider", provider)}>
                                                            {provider === "User" && <User className="mr-2 h-4 w-4" />}
                                                            <span>{provider}</span>
                                                            {selectedProvider === provider && <Check className="ml-auto h-4 w-4" />}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>

                                                <CommandSeparator />

                                                <CommandGroup heading="Capabilities">
                                                    {availableFeatures.map((feature) => (
                                                        <CommandItem key={feature} onSelect={() => handleFilterSelect("feature", feature)}>
                                                            {feature === "Featured" && <Star className="mr-2 h-4 w-4" />}
                                                            {feature === "Popular" && <TrendingUp className="mr-2 h-4 w-4" />}
                                                            {feature === "Vision" && <ImageIcon className="mr-2 h-4 w-4" />}
                                                            {feature === "Reasoning" && <Brain className="mr-2 h-4 w-4" />}
                                                            {feature === "Coding" && <Code className="mr-2 h-4 w-4" />}
                                                            {feature === "Self-Moderated" && <Shield className="mr-2 h-4 w-4" />}
                                                            {feature === "Free" && <Sparkles className="mr-2 h-4 w-4" />}
                                                            <span>{feature}</span>
                                                            {selectedFeature === feature && <Check className="ml-auto h-4 w-4" />}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>

                                                {hasActiveFilters && (
                                                    <>
                                                        <CommandSeparator />
                                                        <CommandGroup>
                                                            <CommandItem onSelect={clearFilters}>
                                                                <X className="mr-2 h-4 w-4" />
                                                                <span>Clear All Filters</span>
                                                            </CommandItem>
                                                        </CommandGroup>
                                                    </>
                                                )}
                                            </CommandList>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>
            </CommandDialog>
        </>
    );
}
