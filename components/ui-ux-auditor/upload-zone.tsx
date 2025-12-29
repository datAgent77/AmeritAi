"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, FileImage } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import Image from "next/image"

interface UploadZoneProps {
    onFileSelect: (file: File) => void
    isAnalyzing?: boolean
}

export function UploadZone({ onFileSelect, isAnalyzing }: UploadZoneProps) {
    const { t } = useLanguage()
    const [preview, setPreview] = useState<string | null>(null)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (file) {
            setPreview(URL.createObjectURL(file))
            onFileSelect(file)
        }
    }, [onFileSelect])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        },
        maxFiles: 1,
        disabled: isAnalyzing
    })

    const removeFile = (e: React.MouseEvent) => {
        e.stopPropagation()
        setPreview(null)
    }

    if (preview) {
        return (
            <div className="relative w-full h-64 rounded-lg overflow-hidden border bg-muted/20 flex items-center justify-center">
                <Image src={preview} alt="Upload preview" fill className="object-contain" unoptimized />
                {!isAnalyzing && (
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full"
                        onClick={removeFile}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        )
    }

    return (
        <div
            {...getRootProps()}
            className={`w-full h-64 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors
                ${isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"}`}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-4 text-center p-4">
                <div className="p-4 rounded-full bg-muted">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <p className="text-lg font-medium">
                        {isDragActive ? t('uploadZoneDrop') : t('uploadZoneDrag')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {t('supportsFormats')}
                    </p>
                </div>
            </div>
        </div>
    )
}
