 
"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronDown, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import providersConfig from "@/config/inference-providers.json"
import { useSettings } from "@/hooks/use-settings"

const GEMINI_MODELS = [
    { id: "gemini-3-pro-preview", name: "Gemini 3 Pro" },
    { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "gemini-flash-latest", name: "Gemini Flash Latest" },
    { id: "gemini-flash-lite-latest", name: "Gemini Flash Lite Latest" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
]

const GEMINI_IMAGE_MODELS = [
    { id: "gemini-3-pro-image-preview", name: "Nano Banana Pro (Gemini 3 Pro Image)" },
    { id: "gemini-2.5-flash-image", name: "Nano Banana (Gemini 2.5 Flash Image)" },
]

type ProviderId = keyof typeof providersConfig;
type ProviderSettings = { apiKey?: string; baseUrl?: string;[key: string]: any; };

interface GeneralPanelProps {
    selectedProvider: ProviderId;
    setSelectedProvider: (provider: ProviderId) => void;
    providerDropdownOpen: boolean;
    setProviderDropdownOpen: (isOpen: boolean) => void;
    providerSettings: Record<ProviderId, ProviderSettings>;
    handleProviderSettingChange: (field: 'apiKey' | 'baseUrl', value: string) => void;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    modelDropdownOpen: boolean;
    setModelDropdownOpen: (isOpen: boolean) => void;
}

export function GeneralPanel({
    selectedProvider,
    setSelectedProvider,
    providerDropdownOpen,
    setProviderDropdownOpen,
    providerSettings,
    handleProviderSettingChange,
    selectedModel,
    setSelectedModel,
    modelDropdownOpen,
    setModelDropdownOpen
}: GeneralPanelProps) {
    const { settings, updateFetchedModels } = useSettings();
    const currentProviderConfig = providersConfig[selectedProvider] || Object.values(providersConfig)[0];

    const [isFetching, setIsFetching] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const fetchedModels = settings.fetchedModels?.[selectedProvider] || [];

    const handleFetchModels = useCallback(async () => {
        const apiKey = providerSettings[selectedProvider]?.apiKey;
        const baseUrl = providerSettings[selectedProvider]?.baseUrl || currentProviderConfig?.baseUrl;

        if (!apiKey && currentProviderConfig?.isKeyRequired) {
            setFetchError('Please enter an API key first.');
            return;
        }

        setIsFetching(true);
        setFetchError(null);

        try {
            const response = await fetch('/api/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: selectedProvider, baseUrl, apiKey: apiKey || '' }),
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                setFetchError(data.error || `Failed to fetch models (HTTP ${response.status})`);
                return;
            }

            if (data.models && Array.isArray(data.models)) {
                updateFetchedModels(selectedProvider, data.models);

                if (data.models.length > 0 && !selectedModel) {
                    setSelectedModel(data.models[0].id);
                }
            }
        } catch (error: any) {
            setFetchError(error.message || 'Failed to fetch models');
        } finally {
            setIsFetching(false);
        }
    }, [selectedProvider, providerSettings, currentProviderConfig, selectedModel, setSelectedModel, updateFetchedModels]);

    useEffect(() => {
        if (selectedProvider !== 'google' && fetchedModels.length > 0 && !selectedModel) {
            setSelectedModel(fetchedModels[0].id);
        }
    }, [selectedProvider]);

    useEffect(() => {
        setFetchError(null);
    }, [selectedProvider]);

    const isGoogle = selectedProvider === 'google';
    const modelsToShow = isGoogle
        ? GEMINI_MODELS
        : fetchedModels.length > 0
            ? fetchedModels
            : [];

    const selectedModelName = isGoogle
        ? GEMINI_MODELS.find(m => m.id === selectedModel)?.name || selectedModel
        : fetchedModels.find(m => m.id === selectedModel)?.name || selectedModel;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold">Inference Provider</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-3">Provider may charge for usage.</p>
                <div className="space-y-3">
                    <div className="space-y-2">
                        <Label className="text-xs">Provider</Label>
                        <Popover open={providerDropdownOpen} onOpenChange={setProviderDropdownOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" role="combobox" aria-expanded={providerDropdownOpen} className="h-9 w-full justify-between">
                                    <span>{currentProviderConfig?.name || "Select Provider"}</span>
                                    <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                <Command>
                                    <CommandInput placeholder="Search provider..." />
                                    <CommandList>
                                        <CommandEmpty>No provider found.</CommandEmpty>
                                        <CommandGroup>
                                            {(Object.keys(providersConfig) as ProviderId[]).map((key) => (
                                                <CommandItem key={key} value={key} onSelect={(currentValue) => { setSelectedProvider(currentValue as ProviderId); setProviderDropdownOpen(false); }}>
                                                    {providersConfig[key].name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    {selectedProvider !== 'google' && (
                        <div className="space-y-2">
                            <Label className="text-xs">Base URL</Label>
                            <Input
                                placeholder={currentProviderConfig?.baseUrl || ""}
                                value={providerSettings[selectedProvider]?.baseUrl || ''}
                                onChange={(e) => handleProviderSettingChange('baseUrl', e.target.value)}
                                readOnly={!currentProviderConfig?.allowCustomBaseUrl}
                                className={cn("h-9 text-sm", !currentProviderConfig?.allowCustomBaseUrl && 'bg-muted/50 cursor-not-allowed')}
                            />
                            <p className="text-xs text-muted-foreground">
                                {currentProviderConfig?.allowCustomBaseUrl ? "Set the Base URL if you are using a standalone server." : "This provider does not allow custom Base URLs."}
                            </p>
                        </div>
                    )}
                    {currentProviderConfig?.isKeyRequired && (
                        <div className="space-y-2">
                            <Label className="text-xs">API Key</Label>
                            <Input
                                type="password"
                                placeholder="Enter your API key"
                                value={providerSettings[selectedProvider]?.apiKey || ''}
                                onChange={(e) => handleProviderSettingChange('apiKey', e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label className="text-xs">Model</Label>
                        <Popover open={modelDropdownOpen} onOpenChange={setModelDropdownOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" role="combobox" aria-expanded={modelDropdownOpen} className="h-9 w-full justify-between">
                                    <span className="truncate">
                                        {selectedModelName || (isGoogle ? 'Select a model' : 'No models fetched')}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                <Command>
                                    <CommandInput placeholder="Search model..." />
                                    <CommandList>
                                        <CommandEmpty>No model found.</CommandEmpty>
                                        <CommandGroup>
                                            {modelsToShow.map((model) => (
                                                <CommandItem key={model.id} value={model.id} onSelect={(currentValue) => { setSelectedModel(currentValue); setModelDropdownOpen(false); }}>
                                                    {model.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">Set the inference model.</p>
                    </div>
                    {selectedProvider !== 'google' && (
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 bg-transparent w-full"
                                onClick={handleFetchModels}
                                disabled={isFetching}
                            >
                                {isFetching ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                )}
                                {isFetching ? 'Fetching...' : 'Fetch Models'}
                            </Button>
                            {fetchError && (
                                <p className="text-xs text-red-500">{fetchError}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
