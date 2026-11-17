$pages = @('home.html', 'settings.html', 'myplan.html', 'plan-sport.html', 'message.html')
$dir = 'd:\server\htdocs\Final project\Final project - Copy\backend-api\public\pages'
$botLink = "            <a href=""chatbot.html"">`r`n             <span class=""material-symbols-outlined"">smart_toy</span>`r`n             <h3 data-i18n=""nav.chatbot"">AI Assistant</h3>`r`n            </a>`r`n"

foreach ($page in $pages) {
  $path = Join-Path $dir $page
  $content = [System.IO.File]::ReadAllText($path)
  if ($content -notmatch 'chatbot\.html') {
    # Find the closing tag of track-calories link and insert chatbot link after it
    $pattern = '(<a href="track-calories\.html"[^>]*>[\s\S]*?</a>)'
    $replacement = '$1' + "`r`n" + $botLink
    $content = [regex]::Replace($content, $pattern, $replacement)
    [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $page"
  } else {
    Write-Host "Already has chatbot link: $page"
  }
}
