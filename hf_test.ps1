$envFile = ".env.local"
if (-not (Test-Path $envFile)) { Write-Error ".env.local not found in repo root"; exit 1 }
$lines = Get-Content $envFile
$keyLine = ($lines | Where-Object { $_ -match '^\s*HUGGINGFACE_API_KEY\s*=' }) -join ''
if (-not $keyLine) { Write-Error 'No HUGGINGFACE_API_KEY found in .env.local'; exit 1 }
$key = $keyLine -replace '^\s*HUGGINGFACE_API_KEY\s*=\s*"?','' -replace '"?$',''
$mask = if ($key.Length -gt 8) { $key.Substring(0,4) + '...' + $key.Substring($key.Length-4) } else { '***' }
Write-Output "HUGGINGFACE_API_KEY=$mask"

$modelLine = ($lines | Where-Object { $_ -match '^\s*HUGGINGFACE_MODEL\s*=' }) -join ''
if ($modelLine) { $model = $modelLine -replace '^\s*HUGGINGFACE_MODEL\s*=\s*"?','' -replace '"?$',''; Write-Output "Configured HUGGINGFACE_MODEL: $model" } else { $model = $null; Write-Output 'No HUGGINGFACE_MODEL set in .env.local' }

$candidates = @()
if ($model) { $candidates += $model }
$candidates += @('sshleifer/tiny-gpt2','gpt2','bigscience/bloom-560m','google/flan-t5-small','EleutherAI/gpt-neo-125M')
$candidates = $candidates | Select-Object -Unique

$body = '{"inputs":"Say hello in one short sentence.","parameters":{"max_new_tokens":20}}'

foreach ($m in $candidates) {
    Write-Output ([string]::Format("`n--- Testing model: {0} ---", $m))
    $url = "https://api-inference.huggingface.co/models/$m"
    try {
        $resp = Invoke-RestMethod -Uri $url -Method Post -Headers @{ Authorization = "Bearer $key" } -Body $body -ContentType 'application/json' -ErrorAction Stop
        Write-Output ([string]::Format("Response for {0}:", $m))
        $resp | ConvertTo-Json -Depth 5 | Write-Output
    } catch {
        Write-Output ([string]::Format("Error calling {0}: {1}", $m, $_.Exception.Message))
    }
}
