param(
    [Parameter(Mandatory = $true)]
    [string]$Url
)

$ErrorActionPreference = "Stop"

try {
    $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 30
    Write-Output "Ping OK: $Url -> HTTP $($response.StatusCode)"
} catch {
    Write-Error "Ping failed for $Url. $($_.Exception.Message)"
    exit 1
}
