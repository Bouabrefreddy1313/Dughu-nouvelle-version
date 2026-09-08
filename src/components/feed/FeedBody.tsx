import Image from "next/image"

interface FeedBodyProps {
  content?: string
  image?: string
  className?: string
}

export function FeedBody({ content, image, className }: FeedBodyProps) {
  return (
    <div className={className}>
      {content && (
        <p className="text-[15px] text-[#050505] dark:text-[#F3F4F6] whitespace-pre-wrap leading-relaxed mb-3">
          {content}
        </p>
      )}
      {image && (
        <div className="w-full rounded-2xl overflow-hidden max-h-[500px] relative">
          <Image
            src={image}
            alt=""
            width={800}
            height={500}
            className="w-full object-cover"
            style={{ maxHeight: 500 }}
          />
        </div>
      )}
    </div>
  )
}