
"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

interface CodeRunnerContextType {
    code: string
    commandTimestamp: number
    isPanelOpen: boolean
    runCode: (code: string) => void
    togglePanel: () => void
    closePanel: () => void
}

const CodeRunnerContext = createContext<CodeRunnerContextType | undefined>(undefined)

export function CodeRunnerProvider({ children }: { children: ReactNode }) {
    const [code, setCode] = useState("")
    const [commandTimestamp, setCommandTimestamp] = useState(0)
    const [isPanelOpen, setIsPanelOpen] = useState(false)

    const runCode = (newCode: string) => {
        setCode(newCode)
        setCommandTimestamp(Date.now())
        setIsPanelOpen(true)
    }

    const togglePanel = () => setIsPanelOpen(prev => !prev)
    const closePanel = () => setIsPanelOpen(false)

    return (
        <CodeRunnerContext.Provider value={{ code, commandTimestamp, isPanelOpen, runCode, togglePanel, closePanel }}>
            {children}
        </CodeRunnerContext.Provider>
    )
}

export function useCodeRunner() {
    const context = useContext(CodeRunnerContext)
    if (context === undefined) {
        throw new Error("useCodeRunner must be used within a CodeRunnerProvider")
    }
    return context
}
