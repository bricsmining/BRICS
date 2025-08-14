# PowerShell script to set up Telegram bot webhook

$botToken = "7689055729:AAEtSkOpdognz7LzD5IbE5s0JcqtkhNw0RI"
$webhookUrl = "https://skyton.vercel.app/api/telegram-bot"
$webhookSecret = "skyton-webhook-secret"

Write-Host "🤖 Setting up Telegram bot webhook..." -ForegroundColor Green

# Create the request body
$body = @{
    url = $webhookUrl
    secret_token = $webhookSecret
    allowed_updates = @("message", "callback_query")
    drop_pending_updates = $true
} | ConvertTo-Json

Write-Host "📡 Webhook URL: $webhookUrl" -ForegroundColor Cyan
Write-Host "🔐 Secret: $webhookSecret" -ForegroundColor Cyan

try {
    # Set the webhook
    $response = Invoke-WebRequest -Uri "https://api.telegram.org/bot$botToken/setWebhook" -Method POST -Body $body -ContentType "application/json"
    
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.ok) {
        Write-Host "✅ Webhook set successfully!" -ForegroundColor Green
        Write-Host "📝 Description: $($result.description)" -ForegroundColor White
    } else {
        Write-Host "❌ Failed to set webhook: $($result.description)" -ForegroundColor Red
    }
    
    # Now set bot commands
    Write-Host "`n📋 Setting bot commands..." -ForegroundColor Green
    
    $commands = @(
        @{ command = "start"; description = "Start the bot and open SkyTON app" },
        @{ command = "help"; description = "Show help information" },
        @{ command = "stats"; description = "View your mining stats" },
        @{ command = "invite"; description = "Get your referral link" }
    )
    
    $commandsBody = @{ commands = $commands } | ConvertTo-Json -Depth 3
    
    $commandsResponse = Invoke-WebRequest -Uri "https://api.telegram.org/bot$botToken/setMyCommands" -Method POST -Body $commandsBody -ContentType "application/json"
    $commandsResult = $commandsResponse.Content | ConvertFrom-Json
    
    if ($commandsResult.ok) {
        Write-Host "✅ Bot commands set successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Commands setup failed: $($commandsResult.description)" -ForegroundColor Yellow
    }
    
    # Get bot info
    Write-Host "`nℹ️ Getting bot information..." -ForegroundColor Green
    $botInfoResponse = Invoke-WebRequest -Uri "https://api.telegram.org/bot$botToken/getMe" -Method GET
    $botInfo = ($botInfoResponse.Content | ConvertFrom-Json).result
    
    Write-Host "✅ Bot Info:" -ForegroundColor Green
    Write-Host "   Name: $($botInfo.first_name)" -ForegroundColor White
    Write-Host "   Username: @$($botInfo.username)" -ForegroundColor White
    Write-Host "   ID: $($botInfo.id)" -ForegroundColor White
    
    Write-Host "`n🎉 Setup Complete! Next steps:" -ForegroundColor Green
    Write-Host "1. Add these environment variables to Vercel:" -ForegroundColor Yellow
    Write-Host "   TG_BOT_TOKEN=$botToken" -ForegroundColor Gray
    Write-Host "   ADMIN_API_KEY=adminsumon7891" -ForegroundColor Gray
    Write-Host "   VITE_WEB_APP_URL=https://skyton.vercel.app" -ForegroundColor Gray
    Write-Host "   TELEGRAM_WEBHOOK_SECRET=$webhookSecret" -ForegroundColor Gray
    Write-Host "   BOT_USERNAME=$($botInfo.username)" -ForegroundColor Gray
    
    Write-Host "`n2. Test your bot:" -ForegroundColor Yellow
    Write-Host "   Open: https://t.me/$($botInfo.username)" -ForegroundColor Cyan
    Write-Host "   Send: /start" -ForegroundColor Cyan
    Write-Host "   Test referral: https://t.me/$($botInfo.username)?start=123456" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check your bot token and try again." -ForegroundColor Yellow
}
