interface UploadOptions {
    file: File
    userId: string
    path: string
    token: string
    onSuccess: (url: string) => void
    onError?: (error: Error) => void
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export async function uploadImage({
    file,
    userId,
    path,
    token,
    onSuccess,
    onError,
}: UploadOptions): Promise<string | null> {
    if (file.size > MAX_FILE_SIZE) {
        const error = new Error("File size exceeds 2MB limit.")
        onError?.(error)
        throw error
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', path)

    const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    })

    if (!response.ok) {
        const errorData = await response.json()
        const error = new Error(errorData.error || 'Upload failed')
        onError?.(error)
        throw error
    }

    const data = await response.json()
    onSuccess(data.url)
    return data.url
}

export async function uploadLogo(
    file: File,
    userId: string,
    token: string,
    onSuccess: (url: string) => void,
    onError?: (error: Error) => void
): Promise<string | null> {
    const timestamp = Date.now()
    const path = `users/${userId}/logos/${timestamp}-${file.name}`
    
    return uploadImage({
        file,
        userId,
        path,
        token,
        onSuccess,
        onError,
    })
}

export async function uploadHeaderLogo(
    file: File,
    userId: string,
    token: string,
    onSuccess: (url: string) => void,
    onError?: (error: Error) => void
): Promise<string | null> {
    const timestamp = Date.now()
    const path = `users/${userId}/header_logos/${timestamp}-${file.name}`
    
    return uploadImage({
        file,
        userId,
        path,
        token,
        onSuccess,
        onError,
    })
}

export async function uploadLauncherIcon(
    file: File,
    userId: string,
    token: string,
    onSuccess: (url: string) => void,
    onError?: (error: Error) => void
): Promise<string | null> {
    const timestamp = Date.now()
    const path = `users/${userId}/launcher_icons/${timestamp}-${file.name}`
    
    return uploadImage({
        file,
        userId,
        path,
        token,
        onSuccess,
        onError,
    })
}

export async function uploadLauncherFullImage(
    file: File,
    userId: string,
    token: string,
    onSuccess: (url: string) => void,
    onError?: (error: Error) => void
): Promise<string | null> {
    const timestamp = Date.now()
    const path = `users/${userId}/launcher_full/${timestamp}-${file.name}`
    
    return uploadImage({
        file,
        userId,
        path,
        token,
        onSuccess,
        onError,
    })
}
