"use client"

import React, { memo, useMemo, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkBreaks from "remark-breaks"
import rehypeKatex from "rehype-katex"
import { Copy, Check, Play } from "lucide-react"
import { useSettings } from "@/hooks/use-settings"
import { useCodeRunner } from "@/contexts/code-runner-context"
import { cn } from "@/lib/utils"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useTheme } from "next-themes"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import MermaidChart from "./mermaid-chart"

// --- Utility Functions ---

function escapeBrackets(text: string): string {
    if (typeof text !== 'string') return "";
    const pattern = /(```[\S\s]*?```|`.*?`)|\\\[([\S\s]*?[^\\])\\]|\\\((.*?)\\\)/g
    return text.replace(
        pattern,
        (match, codeBlock, squareBracket, roundBracket): string => {
            if (codeBlock != null) return codeBlock
            if (squareBracket != null) return `$$${squareBracket}$$`
            if (roundBracket != null) return `$${roundBracket}$`
            return match
        }
    )
}

function escapeMhchem(text: string) {
    return text.split('$\\ce{').join('$\\\\ce{').split('$\\pu{').join('$\\\\pu{');
}

export function preprocessLaTeX(content: string): string {
    if (typeof content !== 'string') {
        return "";
    }

    try {
        // Protect code blocks
        const codeBlocks: string[] = []
        let processed = content.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (_, code) => {
            codeBlocks.push(code)
            return `<<CODE_BLOCK_${codeBlocks.length - 1}>>`
        })

        // Protect LaTeX expressions
        const latexExpressions: string[] = []
        processed = processed.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\))/g, (match) => {
            latexExpressions.push(match)
            return `<<LATEX_${latexExpressions.length - 1}>>`
        })

        // Protect inline math
        processed = processed.replace(/\$([^$]+)\$/g, (match, inner) => {
            if (/^\s*\d+(?:\.\d+)?\s*$/.test(inner)) return match
            latexExpressions.push(match)
            return `<<LATEX_${latexExpressions.length - 1}>>`
        })

        // Escape currency dollar signs
        processed = processed.replace(/\$(?=\d)/g, "\\$")

        // Restore
        processed = processed.replace(/<<LATEX_(\d+)>>/g, (_, index) => latexExpressions[parseInt(index)] || "")
        processed = processed.replace(/<<CODE_BLOCK_(\d+)>>/g, (_, index) => codeBlocks[parseInt(index)] || "")

        processed = escapeBrackets(processed)
        processed = escapeMhchem(processed)

        return processed
    } catch (e) {
        console.error("Error in preprocessLaTeX:", e)
        return content
    }
}

// --- Components ---

const CopyButton = ({ code }: { code: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
        >
            {copied ? <Check className="w-[14px] h-[14px]" /> : <Copy className="w-[14px] h-[14px]" />}
            {copied ? 'Copied' : 'Copy'}
        </button>
    )
}

const MarkdownDisplay = memo(function MarkdownDisplay({ content }: { content: any }) {
    const safeContent = typeof content === 'string' ? content : String(content || "");
    const preprocessedContent = useMemo(() => preprocessLaTeX(safeContent), [safeContent])
    const { resolvedTheme } = useTheme()
    const [style, setStyle] = useState<any>(vscDarkPlus)

    React.useEffect(() => {
        setStyle(resolvedTheme === 'dark' ? vscDarkPlus : vs)
    }, [resolvedTheme])

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-code:before:content-none prose-code:after:content-none">
            <Markdown
                remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    table: ({ node, ...props }) => (
                        <div className="not-prose mb-4 mt-0 overflow-hidden rounded-md border">
                            <Table className="!mt-0" {...props} />
                        </div>
                    ),
                    thead: ({ node, ...props }) => <TableHeader {...props} />,
                    tbody: ({ node, ...props }) => <TableBody {...props} />,
                    tr: ({ node, ...props }) => <TableRow {...props} />,
                    th: ({ node, ...props }) => <TableHead className="whitespace-normal h-auto py-2 align-top" {...props} />,
                    td: ({ node, ...props }) => <TableCell className="whitespace-normal align-top" {...props} />,
                    blockquote: ({ children, ...props }) => (
                        <blockquote className="border-l-3 border-border pl-4 text-muted-foreground my-2" {...props}>{children}</blockquote>
                    ),
                    code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '')
                        const codeContent = String(children).replace(/\n$/, '')
                        const language = match ? match[1] : ''

                        if (!inline && match) {
                            if (language.toLowerCase() === "mermaid") {
                                return <MermaidChart code={codeContent} />
                            }
                            return (
                                <div className="rounded-md overflow-hidden my-4 border bg-background">
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b">
                                        <span className="text-xs text-muted-foreground font-sans">{language}</span>
                                        <div className="flex items-center gap-3">
                                            {language.toLowerCase() === 'python' && (
                                                <RunCodeButton code={codeContent} />
                                            )}
                                            <CopyButton code={codeContent} />
                                        </div>
                                    </div>
                                    <SyntaxHighlighter
                                        {...props}
                                        style={style}
                                        language={language}
                                        PreTag="div"
                                        customStyle={{ margin: 0, borderRadius: 0, fontSize: '13px' }}
                                    >
                                        {codeContent}
                                    </SyntaxHighlighter>
                                </div>
                            )
                        }
                        return (
                            <code {...props} className={cn(className, "bg-accent/50 px-1.5 py-0.5 rounded text-sm")}>
                                {children}
                            </code>
                        )
                    }
                }}
            >
                {preprocessedContent}
            </Markdown>
        </div>
    )
})

const RunCodeButton = ({ code }: { code: string }) => {
    const { settings } = useSettings()
    const { runCode } = useCodeRunner()

    if (!settings.enablePythonInterpreter) return null

    return (
        <button
            onClick={() => runCode(code)}
            className="text-xs text-green-500 hover:text-green-400 flex items-center gap-1 transition-colors font-medium border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 rounded hover:bg-green-500/20"
            title="Run in Python Interpreter"
        >
            <Play className="w-[10px] h-[10px] fill-current" />
            Run
        </button>
    )
}

export default MarkdownDisplay
