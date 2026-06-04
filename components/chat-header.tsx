
"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  Pencil,
  Check,
  X,
} from "lucide-react"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSettings } from "@/hooks/use-settings"
import { useChat } from "@/hooks/use-chat"
import { useTokenCount } from "@/hooks/use-token-count"
import { cn } from "@/lib/utils"
import { RenameChatDialog } from "@/components/rename-chat-dialog"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { getDefaultModels } from "@/lib/fetch-models"
import providersConfig from "@/config/inference-providers.json"

type ProviderId = keyof typeof providersConfig
type ProviderModel = { id: string; name: string }

interface ChatHeaderProps {
  isLeftOpen: boolean
  isRightOpen: boolean
  headerTitle: string
  toggleSidebar: (side: "left" | "right") => void
}

// To prevent duplicating the list logic, we create a shared component.
const ModelList = ({
  setSelectedModel,
  setOpen,
  isImagesToolActive,
  provider
}: {
  setSelectedModel: (model: string) => void,
  setOpen: (open: boolean) => void,
  isImagesToolActive: boolean,
  provider: ProviderId
}) => {
  const allModels = useMemo(() => {
    const defaultModels = getDefaultModels(provider)
    if (isImagesToolActive && provider === 'google') {
      // Add image models for Google
      return [
        ...defaultModels,
        { id: "gemini-3-pro-image-preview", name: "Nano Banana Pro (Gemini 3 Pro Image)" },
        { id: "gemini-2.5-flash-image", name: "Nano Banana (Gemini 2.5 Flash Image)" },
      ]
    }
    return defaultModels
  }, [provider, isImagesToolActive])

  return (
    <Command>
      <CommandInput placeholder="Search model..." />
      <CommandList>
        <CommandEmpty>No model found.</CommandEmpty>
        <CommandGroup>
          {allModels.map((model) => (
            <CommandItem
              key={model.id}
              value={model.id}
              onSelect={(currentValue) => {
                setSelectedModel(model.id)
                setOpen(false)
              }}
            >
              {model.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

export function ChatHeader({
  isLeftOpen,
  isRightOpen,
  headerTitle,
  toggleSidebar
}: ChatHeaderProps) {
  const { settings, updateSettings } = useSettings()
  const { messages, currentChatId, renameChat } = useChat()
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Calculate total tokens
  const totalContent = messages?.map(m => (m.content || "") + (m.reasoning_content || "")).join("\n") || "";
  const { count: sessionTokens, isLoading: isCountingTokens } = useTokenCount(
    totalContent,
    settings.model,
    settings.apiKeys[settings.provider]
  )

  // Get available models for current provider
  const availableModels = useMemo(() => {
    return getDefaultModels(settings.provider as ProviderId)
  }, [settings.provider])

  const selectedModelName = useMemo(() => {
    const found = availableModels.find(m => m.id === settings.model)
    if (found) return found.name
    // Fallback for image models if provider is Google
    if (settings.provider === 'google' && settings.tools?.images) {
      const imageModels = [
        { id: "gemini-3-pro-image-preview", name: "Nano Banana Pro (Gemini 3 Pro Image)" },
        { id: "gemini-2.5-flash-image", name: "Nano Banana (Gemini 2.5 Flash Image)" },
      ]
      return imageModels.find(m => m.id === settings.model)?.name || settings.model
    }
    return settings.model
  }, [availableModels, settings.model, settings.provider, settings.tools?.images])

  const handleModelSelect = (modelId: string) => {
    updateSettings({ model: modelId });
    setIsModelDropdownOpen(false);
  }

  const handleRename = async (newTitle: string) => {
    if (!currentChatId || !newTitle.trim()) return
    setIsSaving(true)
    try {
      await renameChat(currentChatId, newTitle)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <header className="h-14 flex flex-shrink-0 items-center justify-between px-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 md:gap-3 text-foreground transition-all duration-300 min-w-0 flex-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSidebar("left")}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                {isLeftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isLeftOpen ? "Hide sidebar" : "Show sidebar"}</p>
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-3 min-w-0 overflow-hidden flex-1">
            <div className="flex items-center gap-2 overflow-hidden group">
              <span className="font-semibold text-sm md:text-base truncate text-foreground">{headerTitle}</span>
              {messages && messages.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsRenameDialogOpen(true)}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Rename</TooltipContent>
                </Tooltip>
              )}
            </div>

            {messages && messages.length > 0 && (
              <div className="hidden md:flex items-center gap-2 ml-auto text-xs text-muted-foreground">
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="secondary" className="text-xs">
                  {sessionTokens.toLocaleString()} tokens
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Conditional Rendering: Drawer for Mobile, Popover for Desktop */}
          {isMobile ? (
            <Drawer open={isModelDropdownOpen} onOpenChange={setIsModelDropdownOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 w-[160px] px-3 justify-between text-xs"
                >
                  <span className="font-medium truncate">{selectedModelName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerTitle className="sr-only">Select a Model</DrawerTitle>
                <div className="p-4">
                  <ModelList setSelectedModel={handleModelSelect} setOpen={setIsModelDropdownOpen} isImagesToolActive={settings.tools.images} provider={settings.provider as ProviderId} />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover open={isModelDropdownOpen} onOpenChange={setIsModelDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isModelDropdownOpen}
                  className="h-8 w-[280px] px-3 justify-between text-sm"
                >
                  <span className="font-medium truncate text-xs">{selectedModelName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0">
                <ModelList setSelectedModel={handleModelSelect} setOpen={setIsModelDropdownOpen} isImagesToolActive={settings.tools.images} provider={settings.provider as ProviderId} />
              </PopoverContent>
            </Popover>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSidebar("right")}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                {isRightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isRightOpen ? "Hide options" : "Show options"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <RenameChatDialog
        open={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        currentTitle={headerTitle}
        onRename={handleRename}
        isSaving={isSaving}
      />
    </>
  )
}
