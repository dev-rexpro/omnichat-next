
"use client"

import React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CanvasPyInterpreter } from "@/components/python-interpreter"
import { useCodeRunner } from "@/contexts/code-runner-context"
import { cn } from "@/lib/utils"

export function PythonInterpreterPanel() {
    const { isPanelOpen, closePanel } = useCodeRunner()

    if (!isPanelOpen) return null

    // We use the same styling classes as the RightSidebar (width, border, transition etc in main layout, but here we enforce inner structure)
    // Actually, MainLayout handles the transition/visibility wrapper. 
    // Wait, the user wants it to be a separate panel. MainLayout needs to handle the container. 
    // This component will just be the inner content.

    return (
        <div className="w-full h-full flex flex-col relative bg-background">
            <div className="absolute top-2 right-3 z-50">
                <Button variant="ghost" size="icon" onClick={closePanel}>
                    <X className="w-5 h-5 text-muted-foreground" />
                </Button>
            </div>

            <div className="flex-1 overflow-hidden h-full flex flex-col">
                <div className="px-4 pt-3 pb-2 border-b border-border flex items-center justify-between min-h-[50px]">
                    <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">Python Interpreter</span>
                </div>
                <div className="flex-1 overflow-hidden p-4">
                    <CanvasPyInterpreter onClose={closePanel} />
                </div>
            </div>
        </div>
    )
}
