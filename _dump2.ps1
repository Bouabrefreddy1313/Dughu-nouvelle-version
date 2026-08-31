$ErrorActionPreference = "Stop"
$tok = (Select-String -Path "C:\Users\HP\dughu\.env" -Pattern "DUGHU_API_KEY=([^#]+)" | Select-Object -First 1).Matches.Groups[1].Value.Trim('"').Trim("'")
$tok = $tok -replace "^\s+|\s+$", ""
Write-Host "TOK_LEN=$($tok.Length)"
$hdr = @{ "X-AppApiToken" = $tok; Accept = "application/json" }
$base = "https://apitest.dughu.com/api"

$r = Invoke-RestMethod -Uri "$base/getUserChats/8603" -Headers $hdr -Method GET
$r | ConvertTo-Json -Depth 12 | Set-Content "C:\Users\HP\dughu\\_d2_chats.txt"
Write-Host ("CHATS=" + (Get-Item "C:\Users\HP\dughu\\_d2_chats.txt").Length + "b")

$r2 = Invoke-RestMethod -Uri "$base/getConversationMessages?user_id=8603&target_user_id=2642" -Headers $hdr -Method GET
$r2 | ConvertTo-Json -Depth 12 | Set-Content "C:\Users\HP\dughu\\_d2_conv.txt"
Write-Host ("CONV=" + (Get-Item "C:\Users\HP\dughu\\_d2_conv.txt").Length + "b")
