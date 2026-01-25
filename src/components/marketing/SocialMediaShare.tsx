'use client'

import { ClipboardIcon, Linkedin } from 'lucide-react'
import * as simpleIcons from 'simple-icons'

type Props = {
    url: string
}
const ICON_SIZE = 20

const renderIcon = (iconSlug: string) => {
    const icon = (simpleIcons as any)[iconSlug]
    if (!icon) return null
    return (
        <span
            dangerouslySetInnerHTML={{ __html: icon.svg }}
            style={{ width: ICON_SIZE, height: ICON_SIZE, display: 'inline-block', color: `#${icon.hex}` }}
        />
    )
}

export function SocialMediaShare({ url }: Props) {
    const copyToClipboard = () => {
        navigator.clipboard.writeText(url)
    }

    return (
        <div className="flex gap-3 mt-1 items-center">
            {/* Copy to clipboard */}
            <button
                onClick={copyToClipboard}
                className="flex items-center justify-center p-1 text-gray-700 hover:text-gray-900 transition"
                aria-label="Copy link"
            >
                <ClipboardIcon className="w-5 h-5" />
            </button>

            {/* Facebook */}
            <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center p-1 hover:opacity-80 transition"
                aria-label="Share on Facebook"
            >
                {renderIcon('siFacebook')}
            </a>

            {/* X */}
            <a
                href={`https://x.com/intent/tweet?url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center p-1 hover:opacity-80 transition"
                aria-label="Share on Twitter"
            >
                {renderIcon('siX')}
            </a>

            {/* LinkedIn */}
            <button
                onClick={copyToClipboard}
                className="flex items-center justify-center p-1 text-gray-700 hover:text-gray-900 transition"
                aria-label="Copy link"
            >
                <Linkedin className="w-5 h-5" />
            </button>


        </div>

    )
}
