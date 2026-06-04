"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useChat } from "@/hooks/use-chat"
import { useAuth } from "@/hooks/use-auth"
import { useSettings } from "@/hooks/use-settings"
import {
  Plus,
  Search,
  EllipsisVertical,
  Pencil,
  Trash2,
  Settings,
  LogOut,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { RenameChatDialog } from "@/components/rename-chat-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface LeftSidebarProps {
  isLeftOpen: boolean
  setHeaderTitle: (title: string) => void
  toggleSearchPanel: () => void;
}

export function LeftSidebar({
  isLeftOpen,
  setHeaderTitle,
  toggleSearchPanel,
}: LeftSidebarProps) {
  const router = useRouter()
  const { chats, currentChatId, setCurrentChatId, deleteChat, renameChat } = useChat()
  const { user, logout } = useAuth()
  const { settings, updateSettings, resetSession } = useSettings()
  const [openRecentMenu, setOpenRecentMenu] = useState<string | null>(null)
  const [chatIdToRename, setChatIdToRename] = useState<string | null>(null)
  const [chatIdToDelete, setChatIdToDelete] = useState<string | null>(null)

  const handleNewChat = () => {
    setCurrentChatId(null)
    setHeaderTitle("New Chat")

    // Reset all tools and model when starting a new chat
    resetSession()

    if (window.innerWidth < 768) {
      // logic to close sidebar could be passed via props if needed
    }
  }

  const handleChatSelect = (chatId: string, title: string) => {
    setCurrentChatId(chatId);
    setHeaderTitle(title);
  }

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChatIdToDelete(id);
    setOpenRecentMenu(null);
  }

  const handleRenameClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChatIdToRename(id);
    setOpenRecentMenu(null);
  }

  const onRename = async (newTitle: string) => {
    if (chatIdToRename) {
      await renameChat(chatIdToRename, newTitle);
      setChatIdToRename(null);
    }
  }

  const onDeleteConfirm = async () => {
    if (chatIdToDelete) {
      await deleteChat(chatIdToDelete);
      setChatIdToDelete(null);
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const chatToRename = chats?.find(c => c.id === chatIdToRename)

  return (
    <>
      <aside
        className={cn(
          "bg-background flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
          // Mobile behavior: fixed, overlay, 70% width, with a right border
          "fixed top-0 left-0 h-full z-50 border-r border-border w-[70%]",
          isLeftOpen ? "translate-x-0" : "-translate-x-full",

          // Desktop behavior: relative, specific widths, stays in flow, NO right border
          "md:relative md:h-auto md:z-30 md:translate-x-0 md:border-r-0",
          isLeftOpen ? "md:w-[240px]" : "md:w-[64px]"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-14 flex items-center px-4 flex-shrink-0 overflow-hidden">
            <div className="w-8 h-8 flex-shrink-0 bg-primary text-primary-foreground rounded-lg flex items-center justify-center shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="12" height="20" x="6" y="2" rx="2" />
                <rect width="20" height="12" x="2" y="6" rx="2" />
              </svg>
            </div>
            <span
              className={cn(
                "font-semibold text-base tracking-tight transition-all duration-200 overflow-hidden ml-3",
                isLeftOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
              )}
            >
              Omnichat
            </span>
          </div>

          {/* New Chat Button */}
          <div className="px-3 pt-4 pb-2 flex-shrink-0">
            <Tooltip open={isLeftOpen ? false : undefined}>
              <TooltipTrigger asChild onPointerDown={(e) => e.preventDefault()}>
                <Button
                  onClick={handleNewChat}
                  variant={!currentChatId ? "default" : "outline"}
                  className={cn("w-full justify-start", !currentChatId ? "bg-primary text-primary-foreground" : "")}
                  size="sm"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" data-icon="inline-start" />
                  <span
                    className={cn(
                      "flex-1 text-left transition-all duration-200 overflow-hidden whitespace-nowrap font-medium",
                      isLeftOpen ? "ml-2 opacity-100 w-auto" : "ml-0 opacity-0 w-0"
                    )}
                  >
                    New Chat
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New Chat</TooltipContent>
            </Tooltip>
          </div>

          {/* Recents List */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div
              className={cn(
                "flex-1 flex flex-col min-h-0 transition-opacity duration-200",
                isLeftOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <div className="px-4 py-3 flex items-center justify-between group flex-shrink-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chats</span>
                <Tooltip>
                  <TooltipTrigger asChild onPointerDown={(e) => e.preventDefault()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleSearchPanel}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Search</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 transition-colors">
                {chats?.map((chat) => (
                  <div key={chat.id}>
                    <DropdownMenu open={openRecentMenu === chat.id} onOpenChange={(open) => setOpenRecentMenu(open ? chat.id : null)}>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={() => handleChatSelect(chat.id, chat.title)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left truncate group",
                            currentChatId === chat.id
                              ? "bg-primary/10 text-foreground font-medium border border-primary/20"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          )}
                        >
                          <MessageSquare className="w-4 h-4 flex-shrink-0" />
                          <span className="flex-1 truncate text-sm">{chat.title}</span>
                          <EllipsisVertical className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start" className="w-48">
                        <DropdownMenuItem onClick={(e) => handleRenameClick(e as any, chat.id)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => handleDeleteClick(e as any, chat.id)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {(!chats || chats.length === 0) && (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground/60">
                    No chats yet. Start a new conversation!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer (Settings & Profile) */}
          <div className="p-3 space-y-2 flex-shrink-0">
            <Tooltip open={isLeftOpen ? false : undefined}>
              <TooltipTrigger asChild onPointerDown={(e) => e.preventDefault()}>
                <Button
                  onClick={() => router.push('/settings')}
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                >
                  <Settings className="w-4 h-4 flex-shrink-0" data-icon="inline-start" />
                  <span
                    className={cn(
                      "transition-all duration-200 overflow-hidden whitespace-nowrap font-medium",
                      isLeftOpen ? "ml-2 opacity-100 w-auto" : "ml-0 opacity-0 w-0"
                    )}
                  >
                    Settings
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>

            <div
              className={cn(
                "py-2 flex items-center justify-between group overflow-hidden transition-all rounded-lg px-2 hover:bg-muted/50",
                isLeftOpen ? "" : ""
              )}
            >
              <span
                className={cn(
                  "text-xs text-muted-foreground truncate transition-all duration-200 overflow-hidden whitespace-nowrap",
                  isLeftOpen ? "opacity-100 w-auto mr-2" : "opacity-0 w-0 mr-0"
                )}
              >
                <span className="font-semibold text-foreground">{user?.username}</span>
              </span>
              <Tooltip>
                <TooltipTrigger asChild onPointerDown={(e) => e.preventDefault()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0 h-8 w-8"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </aside>

      <RenameChatDialog
        open={!!chatIdToRename}
        onOpenChange={(open) => !open && setChatIdToRename(null)}
        currentTitle={chatToRename?.title || ""}
        onRename={onRename}
      />

      <AlertDialog open={!!chatIdToDelete} onOpenChange={(open) => !open && setChatIdToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your chat history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
