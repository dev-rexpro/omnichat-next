
"use client"

import type React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldGroup, Field, FieldLabel, FieldContent, FieldDescription } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import providersConfig from "@/config/inference-providers.json"

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
    const currentProviderConfig = providersConfig[selectedProvider] || Object.values(providersConfig)[0];

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
                                            {selectedProvider === 'google'
                                                ? (GEMINI_MODELS.find(m => m.id === selectedModel)?.name || selectedModel)
                                                : selectedModel}
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
                                                {selectedProvider === 'google' ? (
                                                    GEMINI_MODELS.map((model) => (
                                                        <CommandItem key={model.id} value={model.id} onSelect={(currentValue) => { setSelectedModel(currentValue); setModelDropdownOpen(false); }}>
                                                            {model.name}
                                                        </CommandItem>
                                                    ))
                                                ) : (
                                                    ['gpt-4o', 'gpt-4o-mini', 'o1-preview'].map((model) => (
                                                        <CommandItem key={model} value={model} onSelect={(currentValue) => { setSelectedModel(currentValue); setModelDropdownOpen(false); }}>
                                                            {model}
                                                        </CommandItem>
                                                    ))
                                                )}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <FieldDescription>Choose the AI model to use for this provider.</FieldDescription>
                        </FieldContent>
                    </Field>

                    {selectedProvider !== 'google' && (
                        <Button variant="outline" className="gap-2 w-fit">
                            <RefreshCw className="w-4 h-4" />
                            Fetch Models
                        </Button>
                    )}
                </FieldGroup>
            </div>
        </div>
    )
}
