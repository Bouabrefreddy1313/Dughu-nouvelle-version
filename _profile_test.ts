import "dotenv/config"
import { mapPosts, getPageInfo } from "./src/lib/dughu.ts"

const KEY = process.env.DUGHU_API_KEY
const BASE = "https://apitest.dughu.com/api"

async function main() {
  // Test with a profile user (non-Dughu profile) — uses Prisma path
  // Test with a Dughu profile — uses getUserPosts
  // First, let's test getPostPageUser
  const page1 = await fetch(`${BASE}/getPostPageUser/1?page=1`, { headers: { "X-AppApiToken": KEY } }).then(r => r.json())
  const posts1 = mapPosts(page1)
  const info1 = getPageInfo(page1)
  console.log("getPostPageUser: posts=", posts1.length, "hasMore=", info1.hasMore, "page=", info1.page)

  // Test getUserPosts (profile view)
  const userPosts = await fetch(`${BASE}/userPost?page=1`, {
    method: "POST",
    headers: { "X-AppApiToken": KEY, "Content-Type": "application/x-www-form-urlencoded" },
    body: "user_id=1&auth_user_id=1&page=1"
  }).then(r => r.json())
  const posts2 = mapPosts(userPosts)
  const info2 = getPageInfo(userPosts)
  console.log("getUserPosts: posts=", posts2.length, "hasMore=", info2.hasMore, "page=", info2.page)

  // Check if the returned posts have content
  if (posts2.length > 0) {
    console.log("First post content:", posts2[0].content.slice(0, 60))
  }
}

main().catch(e => { console.error(e); process.exit(1) })
