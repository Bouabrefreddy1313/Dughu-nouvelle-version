const fs = require("fs")
const raw = fs.readFileSync("_d2_chats.txt", "utf8")
let data
try { data = JSON.parse(raw) } catch (e) { console.log("PARSE ERR", e.message); process.exit(0) }
console.log("TOP KEYS:", Object.keys(data || {}).slice(0, 30).join(", "))
const chats = data.chats || data.result?.chats || data.data?.chats
console.log("CHAT LIST TYPE:", Array.isArray(chats) ? "array" : typeof chats)
const keys = new Set()
function walk(o, depth=0) {
  if (depth > 3) return
  if (Array.isArray(o)) { o.forEach((x) => walk(x, depth+1)); return }
  if (o && typeof o === "object") {
    Object.keys(o).forEach((k) => {
      if (/unread|seen|read|count|status/i.test(k)) keys.add(k)
      walk(o[k], depth+1)
    })
  }
}
walk(data)
console.log("UNREAD/SEEN KEYS anywhere:", [...keys].sort().join(", "))
// For each conversation key, summarize
if (chats && typeof chats === "object" && !Array.isArray(chats)) {
  for (const [ck, arr] of Object.entries(chats)) {
    if (!Array.isArray(arr)) { console.log(ck, "=> not array"); continue }
    let incomingSeen=0, incomingUnseen=0, outgoingSeen=0, outgoingUnseen=0
    let topUnread = arr[0]?.unread_count ?? arr[0]?.unreadCount ?? arr[0]?.unread ?? "(none)"
    arr.forEach((m) => {
      const isMine = String(m.from_id) === "8603"
      const s = Number(m.seen) > 0
      if (isMine) { if(s) outgoingSeen++; else outgoingUnseen++ } else { if(s) incomingSeen++; else incomingUnseen++ }
    })
    console.log(`CONV ${ck}: msgs=${arr.length} unread_field=${topUnread} | incoming seen/unseen=${incomingSeen}/${incomingUnseen} outgoing seen/unseen=${outgoingSeen}/${outgoingUnseen}`)
  }
} else if (Array.isArray(chats)) {
  chats.slice(0,8).forEach((c) => console.log("chat top keys:", Object.keys(c).join(",")))
}
