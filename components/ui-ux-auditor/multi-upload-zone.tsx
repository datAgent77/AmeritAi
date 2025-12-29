"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import Image from "next/image"

interface MultiUploadZoneProps {
    onFilesChange: (files: File[]) => void
    isAnalyzing?: boolean
    maxFiles?: number
}

export function MultiUploadZone({ onFilesChange, isAnalyzing, maxFiles = 5 }: MultiUploadZoneProps) {
    const { t } = useLanguage()
    const [files, setFiles] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (files.length + acceptedFiles.length > maxFiles) {
            alert(t('maxFilesExceeded'))
            return
        }

        const newFiles = [...files, ...acceptedFiles]
        setFiles(newFiles)
        onFilesChange(newFiles)

        const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file))
        setPreviews(prev => [...prev, ...newPreviews])
    }, [files, maxFiles, onFilesChange, t])

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index)
        const newPreviews = previews.filter((_, i) => i !== index)

        setFiles(newFiles)
        setPreviews(newPreviews)
        onFilesChange(newFiles)
    }

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        },
        disabled: isAnalyzing
    })

    return (
        <div className="w-full space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {previews.map((preview, index) => (
                    <div key={index} className="relative aspect-[9/16] rounded-lg overflow-hidden border bg-muted/20 group">
                        <Image src={preview} alt={`Screen ${index + 1}`} fill className="object-cover" unoptimized />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-bold text-xl">#{index + 1}</span>
                        </div>
                        {!isAnalyzing && (
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 rounded-full w-6 h-6"
                                onClick={() => removeFile(index)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                ))}

                {files.length < maxFiles && !isAnalyzing && (
                    <div
                        {...getRootProps()}
                        className={`aspect-[9/16] rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors
                            ${isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"}`}
                    >
                        <input {...getInputProps()} />
                        <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-center text-muted-foreground font-medium px-2">
                            {t('addScreen')}
                        </p>
                    </div>
                )}
            </div>

            {files.length === 0 && (
                <div
                    {...getRootProps()}
                    className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                >
                    <input {...getInputProps()} />
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">{t('dragDropScreens')}</p>
                </div>
            )}
        </div>
    )
}
