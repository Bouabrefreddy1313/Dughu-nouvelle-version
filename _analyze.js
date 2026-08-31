const fs = require("fs")
const raw = fs.readFileSync("_d2_conv.txt", "utf8")
let data
try { data = JSON.parse(raw) } catch (e) { console.log("PARSE ERR", e.message); process.exit(0) }
const msgs = (data && data.messages) || []
console.log("TOTAL_MSGS", msgs.length)
// distinct keys containing seen/read/deliv
const keys = new Set()
msgs.forEach((m) => {
  Object.keys(m).forEach((k) => {
    if (/seen|read|deliv|vu/i.test(k)) keys.add(k)
  })
})
console.log("SEEN-like KEYS:", [...keys].sort().join(", "))
// per-message direction vs seen
console.log("---- per-message: from_id -> to_id | seen ----")
msgs.slice(0, 40).forEach((m) => {
  console.log(`from=${m.from_id} to=${m.to_id} seen=${m.seen} seen_one=${m.seen_one} seen_two=${m.seen_two} deliv_one=${m.delivered_one} deliv_two=${m.delivered_two}`)
})
// distribution
let incomingSeen = 0, incomingUnseen = 0, outgoingSeen = 0, outgoingUnseen = 0
msgs.forEach((m) => {
  const isMine = m.from_id === 8603
  const seen = Number(m.seen) > 0
  if (isMine) { if (seen) outgoingSeen++; else outgoingUnseen++ }
  else { if (seen) incomingSeen++; else incomingUnseen++ }
})
console.log("SUMMARY incoming(sent to 8603): seen=" + incomingSeen + " unseen=" + incomingUnseen)
console.log("SUMMARY outgoing(sent by 8603): seen=" + outgoingSeen + " unseen=" + outgoingUnseen)
