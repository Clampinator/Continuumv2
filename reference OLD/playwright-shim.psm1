# DEPRECATED - Do not use this module.
# The Start-Process pattern with named persistent sessions replaces this shim entirely.
# See AGENTS.md "Playwright Browser Automation" section for the current pattern.
#
# Example of current pattern:
#   Start-Process powershell -ArgumentList "-Command","playwright-cli -s=fvtt open <URL> --persistent" -NoNewWindow
#   Start-Sleep -Seconds 5
#   playwright-cli -s=fvtt snapshot
#   playwright-cli -s=fvtt close
#
# Playwright CLI Non-Blocking Shim (DEPRECATED)

# Global session tracking
$script:PlaywrightSession = $null
$script:SessionJob = $null

function Start-PlaywrightSession {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 30
    )
    
    if ($script:SessionJob) {
        Write-Host "Session already active. Use Stop-PlaywrightSession to close first." -ForegroundColor Yellow
        return
    }
    
    # Start browser in background job
    $script:SessionJob = Start-Job -ScriptBlock {
        param($TargetUrl, $Timeout)
        $env:PLAYWRIGHT_CLI_HEADLESS = "true"
        playwright-cli open $TargetUrl
        Start-Sleep -Seconds $Timeout
        playwright-cli close
    } -ArgumentList $Url, $TimeoutSeconds
    
    Write-Host "Playwright session started for: $Url" -ForegroundColor Green
    Write-Host "Session will auto-close after $TimeoutSeconds seconds" -ForegroundColor Cyan
}

function Stop-PlaywrightSession {
    if ($script:SessionJob) {
        Stop-Job $script:SessionJob -ErrorAction SilentlyContinue
        Remove-Job $script:SessionJob -ErrorAction SilentlyContinue
        playwright-cli close 2>$null
        playwright-cli kill-all 2>$null
        $script:SessionJob = $null
        Write-Host "Playwright session stopped" -ForegroundColor Green
    } else {
        Write-Host "No active session found" -ForegroundColor Yellow
    }
}

function Get-PlaywrightStatus {
    playwright-cli list
}

function Invoke-PlaywrightScreenshot {
    param(
        [string]$Url,
        [string]$Filename = "screenshot-$(Get-Date -Format 'yyyyMMdd-HHmmss').png",
        [int]$TimeoutSeconds = 10
    )
    
    $job = Start-Job -ScriptBlock {
        param($TargetUrl, $OutputFile, $Timeout)
        playwright-cli open $TargetUrl
        Start-Sleep -Seconds 2  # Wait for page load
        playwright-cli screenshot --filename=$OutputFile
        playwright-cli close
    } -ArgumentList $Url, $Filename, $TimeoutSeconds
    
    # Wait for completion with timeout
    $job | Wait-Job -Timeout $TimeoutSeconds | Out-Null
    
    if ($job.State -eq 'Running') {
        Stop-Job $job
        playwright-cli kill-all 2>$null
    }
    
    Remove-Job $job -ErrorAction SilentlyContinue
    
    if (Test-Path $Filename) {
        Write-Host "Screenshot saved: $Filename" -ForegroundColor Green
        return $Filename
    } else {
        Write-Host "Screenshot failed" -ForegroundColor Red
        return $null
    }
}

# Export functions
Export-ModuleMember -Function Start-PlaywrightSession, Stop-PlaywrightSession, Get-PlaywrightStatus, Invoke-PlaywrightScreenshot
