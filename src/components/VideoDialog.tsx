import React from 'react'
import { X } from 'lucide-react'
import { useDialog } from '../lib/useDialog'

interface VideoDialogProps {
  open: boolean
  embedUrl: string
  onClose: () => void
}

export const VideoDialog: React.FC<VideoDialogProps> = ({ open, embedUrl, onClose }) => {
  const ref = useDialog<HTMLDivElement>(open, onClose)
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/80" aria-hidden="true" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-dialog-title"
        tabIndex={-1}
        className="relative w-full max-w-4xl rounded-card bg-navy p-3 shadow-2xl"
      >
        <div className="flex items-center justify-between px-1 pb-3">
          <h2 id="video-dialog-title" className="text-sm font-semibold text-white">
            Video giới thiệu AI Desk
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
            aria-label="Đóng video"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="aspect-video overflow-hidden rounded-lg bg-black">
          <iframe
            src={embedUrl}
            title="Video giới thiệu AI Desk"
            className="h-full w-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </div>
  )
}
