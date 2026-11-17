$base = 'd:\server\htdocs\Final project\Final project - Copy\backend-api'

Write-Host "=== CSS checks ==="
$css = Get-Content "$base\public\assest\css\main.css" -Raw
Write-Host ("track-analytics-card class:   " + $(if ($css -match '\.track-analytics-card\b') {'FOUND'} else {'MISSING'}))
Write-Host ("track-stat-tile class:        " + $(if ($css -match '\.track-stat-tile\b') {'FOUND'} else {'MISSING'}))
Write-Host ("chatbot-card class:           " + $(if ($css -match '\.chatbot-card\b') {'FOUND'} else {'MISSING'}))
Write-Host ("chatbot-messages class:       " + $(if ($css -match '\.chatbot-messages\b') {'FOUND'} else {'MISSING'}))
Write-Host ("star-btn class:               " + $(if ($css -match '\.star-btn\b') {'FOUND'} else {'MISSING'}))
Write-Host ("advice-card class:            " + $(if ($css -match '\.advice-card\b') {'FOUND'} else {'MISSING'}))
Write-Host ("advice-card__title:           " + $(if ($css -match '\.advice-card__title\b') {'FOUND'} else {'MISSING'}))
Write-Host ("feedback-item class:          " + $(if ($css -match '\.feedback-item\b') {'FOUND'} else {'MISSING'}))
Write-Host ("feedback-stars class:         " + $(if ($css -match '\.feedback-stars\b') {'FOUND'} else {'MISSING'}))
Write-Host ("progress-log-item class:      " + $(if ($css -match '\.progress-log-item\b') {'FOUND'} else {'MISSING'}))
Write-Host ("progress-log-weight class:    " + $(if ($css -match '\.progress-log-weight\b') {'FOUND'} else {'MISSING'}))
Write-Host ("followup-section-header:      " + $(if ($css -match '\.followup-section-header\b') {'FOUND'} else {'MISSING'}))
Write-Host ("typing-indicator class:       " + $(if ($css -match '\.typing-indicator\b') {'FOUND'} else {'MISSING'}))
Write-Host ("appearance:auto for selects:  " + $(if ($css -match 'appearance:\s*auto') {'FOUND'} else {'MISSING'}))

Write-Host ""
Write-Host "=== HTML checks ==="
$tc = Get-Content "$base\public\pages\track-calories.html" -Raw
Write-Host ("track-analytics-card in HTML: " + $(if ($tc -match 'track-analytics-card') {'FOUND'} else {'MISSING'}))
Write-Host ("results div id:               " + $(if ($tc -match 'id=\"results\"') {'FOUND'} else {'MISSING'}))
Write-Host ("out-bmr span:                 " + $(if ($tc -match 'id=\"out-bmr\"') {'FOUND'} else {'MISSING'}))
Write-Host ("out-tdee span:                " + $(if ($tc -match 'id=\"out-tdee\"') {'FOUND'} else {'MISSING'}))
Write-Host ("out-target span:              " + $(if ($tc -match 'id=\"out-target\"') {'FOUND'} else {'MISSING'}))
Write-Host ("btn-calc button:              " + $(if ($tc -match 'id=\"btn-calc\"') {'FOUND'} else {'MISSING'}))
Write-Host ("NO chat-messages in track:    " + $(if ($tc -notmatch 'id=\"chat-messages\"') {'CORRECT'} else {'PROBLEM - still there'}))

$cb = Get-Content "$base\public\pages\chatbot.html" -Raw
Write-Host ("chatbot has chat-messages:    " + $(if ($cb -match 'id=\"chat-messages\"') {'FOUND'} else {'MISSING'}))
Write-Host ("chatbot has chat-input:       " + $(if ($cb -match 'id=\"chat-input\"') {'FOUND'} else {'MISSING'}))
Write-Host ("chatbot has btn-send:         " + $(if ($cb -match 'id=\"btn-send\"') {'FOUND'} else {'MISSING'}))
Write-Host ("chatbot loads chatbot.js:     " + $(if ($cb -match 'chatbot\.js') {'FOUND'} else {'MISSING'}))

$msg = Get-Content "$base\public\pages\message.html" -Raw
Write-Host ("message has star-rating-wrap: " + $(if ($msg -match 'star-rating-wrap') {'FOUND'} else {'MISSING'}))
Write-Host ("message has advice-container: " + $(if ($msg -match 'id=\"advice-container\"') {'FOUND'} else {'MISSING'}))
Write-Host ("message advice no card wrap:  " + $(if ($msg -match 'advice-section.*class=\"page-reveal\"') {'CORRECT'} else {'CHECK NEEDED'}))
Write-Host ("message has followup-section-header: " + $(if ($msg -match 'followup-section-header') {'FOUND'} else {'MISSING'}))

Write-Host ""
Write-Host "=== JS checks ==="
$js = Get-Content "$base\public\assest\js\track-calories.js" -Raw
Write-Host ("appendChat null guard:        " + $(if ($js -match 'if \(!messagesEl\) return') {'FOUND'} else {'MISSING'}))
Write-Host ("btn-send null guard:          " + $(if ($js -match "if \(document\.getElementById\('btn-send'\)\)") {'FOUND'} else {'MISSING'}))

Write-Host ""
Write-Host "=== File sizes ==="
Get-Item "$base\public\assest\js\chatbot.js" | Select-Object Name, Length
Get-Item "$base\public\pages\chatbot.html" | Select-Object Name, Length
Get-Item "$base\public\assest\css\main.css" | Select-Object Name, Length
