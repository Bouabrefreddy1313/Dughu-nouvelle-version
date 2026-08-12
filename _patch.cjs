const fs = require("fs")
const p = "src/components/feed/PostCard.tsx"
let s = fs.readFileSync(p, "utf8")
const cOld = '<p className="text-[14px] text-[#050505] whitespace-pre-wrap">{c.content}</p>'
const cNew = '<CommentBody content={c.content} image={c.image} video={c.video} />'
const rOld = '<p className="text-[13px] text-[#050505] whitespace-pre-wrap">{r.content}</p>'
const rNew = '<CommentBody size="sm" content={r.content} image={r.image} video={r.video} />'
const countC = s.split(cOld).length - 1
const countR = s.split(rOld).length - 1
s = s.split(cOld).join(cNew)
s = s.split(rOld).join(rNew)
fs.writeFileSync(p, s, "utf8")
console.log(JSON.stringify({ cReplaced: countC, rReplaced: countR }))