$ErrorActionPreference = "Continue"
$key = (Select-String -Path .env -Pattern '^DUGHU_API_KEY=(.+)$').Matches[0].Groups[1].Value
$base = "https://apitest.dughu.com/api"

function Get-Api($url) {
  try {
    return (curl.exe -s -w "`n[HTTP %{http_code}]" -X GET "$base/$url" -H "X-AppApiToken: $key" -H "Accept: application/json") -join " "
  } catch { return "ERR $_" }
}
function Post-Api($url, $body, $json = $false) {
  $args = @("-s", "-w", "`n[HTTP %{http_code}]", "-X", "POST", "$base/$url", "-H", "X-AppApiToken: $key", "-H", "Accept: application/json")
  if ($json) { $args += @("-H", "Content-Type: application/json", "-d", $body) }
  else { foreach ($kv in $body -split "&") { $args += @("-d", $kv) } }
  return (curl.exe @args) -join " "
}

function Show($label, $content, $len = 700) {
  Write-Host "=== $label"
  $s = "$content"
  if ($s.Length -gt $len) { $s = $s.Substring(0, $len) }
  Write-Host $s
  Write-Host ""
}

Show "GET getPageCategories" (Get-Api "getPageCategories") 600
Show "POST suggestPages {user_id:28341} page=1" (Post-Api "suggestPages?page=1" "user_id=28341&page=1") 900
Show "POST userPages {auth_user_id:28341,user_id:28341}" (Post-Api "userPages" "auth_user_id=28341&user_id=28341") 900
Show "POST userLikedPages {user_id:28341}" (Post-Api "userLikedPages?page=1" "user_id=28341") 500
Show "POST pageAdminsUser {user_id:28341}" (Post-Api "pageAdminsUser" "user_id=28341") 500
Show "POST boostPrice {days:7}" (Post-Api "boostPrice" "days=7") 300
