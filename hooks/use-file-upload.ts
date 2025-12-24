import * as pdfjs from 'pdfjs-dist';
import { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';
import { useState } from 'react';
import { toast } from 'sonner';

// Configure PDF.js worker
// Using local worker file copied to public/ folder for maximum stability
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface FileAttachment {
    name: string;
    type: string;
    data: string; // Base64 data URL or string content for text
    content?: string; // Extracted text content for PDF/Text
}

export interface FileUploadApi {
    /** Array of uploaded files/items */
    attachments: FileAttachment[];
    /** Adds new items to the upload list */
    addAttachments: (items: FileAttachment[]) => void;
    /** Removes an item at the specified index */
    removeAttachment: (idx: number) => void;
    /** Clears all items from the upload list */
    clearAttachments: () => void;
    /** Handles file uploads and processes them based on type */
    handleFiles: (files: FileList | File[]) => Promise<void>;
}

interface UseFileUploadOptions {
    pdfAsImage?: boolean;
}

/**
 * Custom React hook for handling file uploads and processing various file types
 */
export function useFileUpload(
    options: UseFileUploadOptions = { pdfAsImage: false }
): FileUploadApi {
    const { pdfAsImage } = options;
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);

    const addAttachments = (newItems: FileAttachment[]) => {
        setAttachments((prev) => [...prev, ...newItems]);
    };

    const removeAttachment = (idx: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== idx));
    };

    const clearAttachments = () => {
        setAttachments([]);
    };

    const handleFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);

        for (const file of fileArray) {
            try {
                const mimeType = file.type;

                // Limit file size (e.g. 50MB) 
                if (file.size > 50 * 1024 * 1024) {
                    toast.error(`File ${file.name} is too large (max 50MB)`);
                    continue;
                }

                if (mimeType.startsWith('image/')) {
                    const base64Url = await getFileAsBase64(file, true);
                    addAttachments([{
                        name: file.name,
                        type: mimeType,
                        data: base64Url
                    }]);
                }
                else if (mimeType === 'application/pdf') {
                    if (pdfAsImage) {
                        const base64Urls = await convertPDFToImage(file);
                        addAttachments(base64Urls.map(url => ({
                            name: `${file.name}`,
                            type: 'image/png',
                            data: url
                        })));
                    } else {
                        // Extract text
                        const content = await convertPDFToText(file);
                        addAttachments([{
                            name: file.name,
                            type: 'application/pdf',
                            data: '[PDF Content]', // Placeholder for UI
                            content: content
                        }]);
                        toast.success(`PDF ${file.name} converted to text context`);
                    }
                }
                else if (mimeType.startsWith('text/') || mimeType === 'application/json' || file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.js') || file.name.endsWith('.md')) {
                    const content = await getFileAsText(file);
                    addAttachments([{
                        name: file.name,
                        type: 'text/plain',
                        data: '[Text File]',
                        content: content
                    }]);
                }
                else {
                    toast.error(`Unsupported file type: ${mimeType}`);
                }

            } catch (error) {
                console.error("File processing error:", error);
                toast.error(`Failed to process ${file.name}`);
            }
        }
    };

    return {
        attachments,
        addAttachments,
        removeAttachment,
        clearAttachments,
        handleFiles
    };
}


// --- Helper Functions ---

function getFileAsBase64(file: File, outputUrl = true): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                let result = event.target.result as string;
                if (!outputUrl) {
                    result = result.substring(result.indexOf(',') + 1);
                }
                resolve(result);
            } else {
                reject(new Error("Failed to read file"));
            }
        };
        reader.readAsDataURL(file);
    });
}

function getFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                resolve(event.target.result as string);
            } else {
                reject(new Error("Failed to read text file"));
            }
        };
        reader.readAsText(file);
    });
}

async function getFileAsBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                resolve(event.target.result as ArrayBuffer);
            } else {
                reject(new Error("Failed to read file buffer"));
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

async function convertPDFToText(file: File): Promise<string> {
    const buffer = await getFileAsBuffer(file);
    const pdf = await pdfjs.getDocument(buffer).promise;
    const numPages = pdf.numPages;
    const textContentPromises: Promise<TextContent>[] = [];

    for (let i = 1; i <= numPages; i++) {
        textContentPromises.push(
            pdf.getPage(i).then((page) => page.getTextContent())
        );
    }

    const textContents = await Promise.all(textContentPromises);
    const textItems = textContents.flatMap((textContent) =>
        textContent.items.map((item) => (item as TextItem).str ?? '')
    );

    return textItems.join('\n');
}

async function convertPDFToImage(file: File): Promise<string[]> {
    const buffer = await getFileAsBuffer(file);
    const doc = await pdfjs.getDocument(buffer).promise;
    const pages: Promise<string>[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (!ctx) continue;

        const task = page.render({ canvasContext: ctx, viewport: viewport } as any);
        pages.push(
            task.promise.then(() => {
                return canvas.toDataURL();
            })
        );
    }

    return await Promise.all(pages);
}
