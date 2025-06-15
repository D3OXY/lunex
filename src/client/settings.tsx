"use client";

import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import SidebarWrapper from "@/components/sidebar/sidebar-wrapper";
import { Authenticated, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useUserPreferences, useUserModels, useDefaultModel } from "@/lib/stores/preferences-store";
import { getAllModels } from "@/lib/models";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Key, Bot, Palette, User, Save, Plus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Settings(): React.JSX.Element {
    // Store hooks
    const userPreferences = useUserPreferences();
    const userModels = useUserModels();
    const defaultModel = useDefaultModel();

    // Convex mutations
    const updateDefaultModel = useMutation(api.user_preferences.updateDefaultModel);
    const updateApiKey = useMutation(api.user_preferences.updateOpenRouterApiKey);
    const updateUserModels = useMutation(api.user_preferences.updateUserModels);

    const [isLoading, setIsLoading] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);
    const [newModel, setNewModel] = useState("");

    // Get all available models (built-in + user models)
    const allModels = getAllModels(userModels);

    // Initialize API key when preferences load
    useEffect(() => {
        if (userPreferences?.openRouterApiKey) {
            setApiKey(userPreferences.openRouterApiKey);
        }
    }, [userPreferences?.openRouterApiKey]);

    const handleSaveDefaultModel = async (modelId: string): Promise<void> => {
        try {
            setIsLoading(true);
            await updateDefaultModel({ defaultModel: modelId });
            toast.success("Default model updated successfully");
        } catch (error) {
            console.error("Failed to update default model:", error);
            toast.error("Failed to update default model");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveApiKey = async (): Promise<void> => {
        try {
            setIsLoading(true);
            const apiKeyValue = apiKey.trim() || undefined;
            await updateApiKey({ openRouterApiKey: apiKeyValue });
            toast.success("API key updated successfully");
        } catch (error) {
            console.error("Failed to update API key:", error);
            toast.error("Failed to update API key");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddModel = async (): Promise<void> => {
        if (!newModel.trim()) return;

        if (userModels.includes(newModel.trim())) {
            toast.error("Model already added");
            return;
        }

        try {
            setIsLoading(true);
            const updatedModels = [...userModels, newModel.trim()];
            await updateUserModels({ userModels: updatedModels });
            setNewModel("");
            toast.success("Model added successfully");
        } catch (error) {
            console.error("Failed to add model:", error);
            toast.error("Failed to add model");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveModel = async (modelId: string): Promise<void> => {
        try {
            setIsLoading(true);
            const updatedModels = userModels.filter((id) => id !== modelId);
            await updateUserModels({ userModels: updatedModels });
            toast.success("Model removed successfully");
        } catch (error) {
            console.error("Failed to remove model:", error);
            toast.error("Failed to remove model");
        } finally {
            setIsLoading(false);
        }
    };

    if (!userPreferences) {
        return (
            <Authenticated>
                <ErrorBoundary>
                    <SidebarWrapper>
                        <div className="flex h-full flex-col items-center justify-center">
                            <div className="text-muted-foreground">Loading settings...</div>
                        </div>
                    </SidebarWrapper>
                </ErrorBoundary>
            </Authenticated>
        );
    }

    return (
        <Authenticated>
            <ErrorBoundary>
                <SidebarWrapper>
                    <div className="flex h-full flex-col">
                        <div className="flex-1 overflow-auto p-6">
                            <div className="mx-auto max-w-4xl space-y-6">
                                <div>
                                    <h1 className="text-3xl font-bold">Settings</h1>
                                    <p className="text-muted-foreground">Manage your preferences and configure your AI experience.</p>
                                </div>

                                <Tabs defaultValue="models" className="space-y-6">
                                    <TabsList className="grid w-full grid-cols-4">
                                        <TabsTrigger value="models" className="flex items-center gap-2">
                                            <Bot className="h-4 w-4" />
                                            Models
                                        </TabsTrigger>
                                        <TabsTrigger value="api" className="flex items-center gap-2">
                                            <Key className="h-4 w-4" />
                                            API Keys
                                        </TabsTrigger>
                                        <TabsTrigger value="appearance" className="flex items-center gap-2">
                                            <Palette className="h-4 w-4" />
                                            Appearance
                                        </TabsTrigger>
                                        <TabsTrigger value="account" className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            Account
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* Models Tab */}
                                    <TabsContent value="models" className="space-y-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Default Model</CardTitle>
                                                <CardDescription>Choose your preferred AI model for new conversations.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="default-model">Default Model</Label>
                                                    <Select value={defaultModel} onValueChange={handleSaveDefaultModel} disabled={isLoading}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a model" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(allModels).map(([modelId, model]) => (
                                                                <SelectItem key={modelId} value={modelId}>
                                                                    <div className="flex items-center gap-2">
                                                                        <span>{model.name}</span>
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            {model.provider}
                                                                        </Badge>
                                                                        {model.features?.userModel && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                Custom
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Available Models</CardTitle>
                                                <CardDescription>Add custom model IDs that will be available in your model selector.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={newModel}
                                                        onChange={(e) => setNewModel(e.target.value)}
                                                        placeholder="Enter model ID (e.g., anthropic/claude-3.5-sonnet)"
                                                        className="flex-1"
                                                    />
                                                    <Button onClick={handleAddModel} disabled={!newModel.trim() || isLoading}>
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Add
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Your Models</Label>
                                                    {userModels.length === 0 ? (
                                                        <div className="text-muted-foreground text-sm">No custom models added yet.</div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {userModels.map((modelId) => (
                                                                <Badge key={modelId} variant="outline" className="flex items-center gap-2">
                                                                    <span className="font-mono text-xs">{modelId}</span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-auto p-0 hover:bg-transparent"
                                                                        onClick={() => handleRemoveModel(modelId)}
                                                                        disabled={isLoading}
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </Button>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    {/* API Keys Tab */}
                                    <TabsContent value="api" className="space-y-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>OpenRouter API Key</CardTitle>
                                                <CardDescription>Add your personal OpenRouter API key to use your own credits and access additional models.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <Alert>
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertDescription className="flex flex-col gap-2">
                                                        Your API key is stored securely and only used for your requests. You can get an API key from{" "}
                                                        <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                                                            OpenRouter
                                                        </a>
                                                        .
                                                    </AlertDescription>
                                                </Alert>

                                                <div className="space-y-2">
                                                    <Label htmlFor="api-key">API Key</Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            id="api-key"
                                                            type={showApiKey ? "text" : "password"}
                                                            value={apiKey}
                                                            onChange={(e) => setApiKey(e.target.value)}
                                                            placeholder="sk-or-..."
                                                            className="flex-1"
                                                        />
                                                        <Button variant="outline" onClick={() => setShowApiKey(!showApiKey)}>
                                                            {showApiKey ? "Hide" : "Show"}
                                                        </Button>
                                                        <Button onClick={handleSaveApiKey} disabled={isLoading}>
                                                            <Save className="mr-2 h-4 w-4" />
                                                            Save
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    {/* Appearance Tab */}
                                    <TabsContent value="appearance" className="space-y-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Theme</CardTitle>
                                                <CardDescription>Customize the appearance of your interface.</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-muted-foreground">Theme settings will be available in a future update.</div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    {/* Account Tab */}
                                    <TabsContent value="account" className="space-y-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Account Information</CardTitle>
                                                <CardDescription>View and manage your account details.</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-muted-foreground">Account management features will be available in a future update.</div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                </SidebarWrapper>
            </ErrorBoundary>
        </Authenticated>
    );
}
