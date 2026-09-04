"use client"

export default function AkwaVideoSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {/* Thumbnail */}
      <div
        className="w-full aspect-video rounded-xl"
        style={{ backgroundColor: "#2a2a2a" }}
      />
      {/* Meta */}
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full shrink-0"
          style={{ backgroundColor: "#2a2a2a" }}
        />
        <div className="flex-1 space-y-2 pt-1">
          <div
            className="h-3.5 rounded"
            style={{ backgroundColor: "#2a2a2a", width: "80%" }}
          />
          <div
            className="h-3 rounded"
            style={{ backgroundColor: "#2a2a2a", width: "55%" }}
          />
          <div
            className="h-3 rounded"
            style={{ backgroundColor: "#2a2a2a", width: "40%" }}
          />
        </div>
      </div>
    </div>
  )
}
