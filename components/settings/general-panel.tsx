
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldGroup, Field, FieldLabel, FieldContent, FieldDescription } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import providersConfig from "@/config/inference-providers.json"
import providerModels from "@/config/provider-models.json"
import { fetchProviderModels, getDefaultModels } from "@/lib/fetch-models"

type ProviderId = keyof typeof providersConfig;
type ProviderSettings = { apiKey?: string; baseUrl?: string;[key: string]: any; };
type ProviderModel = { id: string; name: string };

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
    const currentProviderConfig = providersConfig[selectedProvider] || Object.values(providersConfig)[0];
    
    // State for dynamic models
    const [availableModels, setAvailableModels] = useState<ProviderModel[]>(() => {
        return getDefaultModels(selectedProvider)
    })
    const [isFetchingModels, setIsFetchingModels] = useState(false)
    const [fetchError, setFetchError] = useState<string | null>(null)

    // Update available models when provider changes
    useEffect(() => {
        setAvailableModels(getDefaultModels(selectedProvider))
        setFetchError(null)
    }, [selectedProvider])

    // Handle fetch models button click
    const handleFetchModels = async () => {
        setIsFetchingModels(true)
        setFetchError(null)
        try {
            const apiKey = providerSettings[selectedProvider]?.apiKey
            const baseUrl = providerSettings[selectedProvider]?.baseUrl
            const models = await fetchProviderModels(selectedProvider, apiKey, baseUrl)
            
            if (models.length > 0) {
                setAvailableModels(models)
            } else {
                setFetchError("No models found. Using default models.")
                setAvailableModels(getDefaultModels(selectedProvider))
            }
        } catch (error) {
            console.error("[v0] Error fetching models:", error)
            setFetchError("Failed to fetch models. Using default models.")
            setAvailableModels(getDefaultModels(selectedProvider))
        } finally {
            setIsFetchingModels(false)
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <div className="mb-4">
                    <h3 className="font-semibold text-base">Inference Provider</h3>
                    <p className="text-sm text-muted-foreground mt-1">Configure where your AI requests are processed.</p>
                </div>
                <FieldGroup className="gap-6">
                    <Field orientation="vertical">
                        <FieldLabel htmlFor="provider">Provider</FieldLabel>
                        <FieldContent>
                            <Popover open={providerDropdownOpen} onOpenChange={setProviderDropdownOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={providerDropdownOpen} className="w-full justify-between">
                                        <span>{currentProviderConfig?.name || "Select Provider"}</span>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" data-icon="inline-end" />
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
                            <FieldDescription>Select the AI provider for your inference.</FieldDescription>
                        </FieldContent>
                    </Field>

                    {selectedProvider !== 'google' && (
                        <Field orientation="vertical">
                            <FieldLabel htmlFor="baseurl">Base URL</FieldLabel>
                            <FieldContent>
                                <Input
                                    id="baseurl"
                                    placeholder={currentProviderConfig?.baseUrl || ""}
                                    value={providerSettings[selectedProvider]?.baseUrl || ''}
                                    onChange={(e) => handleProviderSettingChange('baseUrl', e.target.value)}
                                    readOnly={!currentProviderConfig?.allowCustomBaseUrl}
                                    className={cn(!currentProviderConfig?.allowCustomBaseUrl && 'bg-muted/50 cursor-not-allowed')}
                                />
                                <FieldDescription>
                                    {currentProviderConfig?.allowCustomBaseUrl ? "Set the Base URL if using a standalone server." : "This provider does not allow custom Base URLs."}
                                </FieldDescription>
                            </FieldContent>
                        </Field>
                    )}

                    {currentProviderConfig?.isKeyRequired && (
                        <Field orientation="vertical">
                            <FieldLabel htmlFor="apikey">API Key</FieldLabel>
                            <FieldContent>
                                <Input
                                    id="apikey"
                                    type="password"
                                    placeholder="Enter your API key"
                                    value={providerSettings[selectedProvider]?.apiKey || ''}
                                    onChange={(e) => handleProviderSettingChange('apiKey', e.target.value)}
                                />
                                <FieldDescription>Keep your API key secure. It&apos;s never shared.</FieldDescription>
                            </FieldContent>
                        </Field>
                    )}

                    <Field orientation="vertical">
                        <FieldLabel htmlFor="model">Model</FieldLabel>
                        <FieldContent>
                            <Popover open={modelDropdownOpen} onOpenChange={setModelDropdownOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={modelDropdownOpen} className="w-full justify-between">
                                        <span className="truncate">
                                            {availableModels.find(m => m.id === selectedModel)?.name || selectedModel}
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" data-icon="inline-end" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search model..." />
                                        <CommandList>
                                            <CommandEmpty>No model found.</CommandEmpty>
                                            <CommandGroup>
                                                {availableModels.map((model) => (
                                                    <CommandItem 
                                                        key={model.id} 
                                                        value={model.id} 
                                                        onSelect={(currentValue) => { 
                                                            setSelectedModel(currentValue)
                                                            setModelDropdownOpen(false)
                                                        }}
                                                    >
                                                        {model.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <FieldDescription>Choose the AI model to use for this provider.</FieldDescription>
                        </FieldContent>
                    </Field>

                    {!["llama-cpp", "lm-studio", "ollama", "vllm", "custom"].includes(selectedProvider) && (
                        <div className="flex flex-col gap-2">
                            <Button 
                                variant="outline" 
                                className="gap-2 w-fit"
                                onClick={handleFetchModels}
                                disabled={isFetchingModels}
                            >
                                {isFetchingModels ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Fetching Models...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        Fetch Models
                                    </>
                                )}
                            </Button>
                            {fetchError && (
                                <p className="text-xs text-amber-600 dark:text-amber-500">{fetchError}</p>
                            )}
                        </div>
                    )}
                </FieldGroup>
            </div>
        </div>
    )
}
