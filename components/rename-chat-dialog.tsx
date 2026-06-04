"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldGroup, Field, FieldLabel, FieldContent, FieldDescription } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

interface RenameChatDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentTitle: string
    onRename: (newTitle: string) => Promise<void>
    isSaving?: boolean
}

export function RenameChatDialog({
    open,
    onOpenChange,
    currentTitle,
    onRename,
    isSaving = false,
}: RenameChatDialogProps) {
    const [title, setTitle] = useState(currentTitle)

    useEffect(() => {
        if (open) {
            setTitle(currentTitle)
        }
    }, [open, currentTitle])

    const handleSave = async () => {
        if (!title.trim() || isSaving) return
        await onRename(title)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Rename Chat</DialogTitle>
                </DialogHeader>
                <FieldGroup className="gap-5 py-4">
                    <Field orientation="vertical">
                        <FieldLabel htmlFor="name">Chat name</FieldLabel>
                        <FieldContent>
                            <Input
                                id="name"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter chat name..."
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSave()
                                }}
                            />
                            <FieldDescription>Give your chat a memorable name.</FieldDescription>
                        </FieldContent>
                    </Field>
                </FieldGroup>
                <DialogFooter className="flex gap-2 pt-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!title.trim() || isSaving}
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
