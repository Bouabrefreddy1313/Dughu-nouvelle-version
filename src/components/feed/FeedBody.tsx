"use client"

interface FeedBodyProps {
  content?: string
  image?: string
  className?: string
}

export function FeedBody({ content, image, className }: FeedBodyProps) {
  return (
    <div className={className}>
      {content && (
        <p className="text-[15px] text-[#050505] whitespace-pre-wrap leading-relaxed mb-3">
          {content}
        </p>
      )}
      {image && (
        <img
          src={image}
          alt=""
          className="w-full object-cover rounded-2xl max-h-[500px]"
        />
      )}
    </div>
  )
}