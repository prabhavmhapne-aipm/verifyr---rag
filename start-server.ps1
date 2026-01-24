# Simple HTTP Server for Verifyr Landing Page
# Run this script from PowerShell: .\start-server.ps1

$port = 8000
$path = $PSScriptRoot

Write-Host "Starting local server..." -ForegroundColor Green
Write-Host "Server running at: http://localhost:$port" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Check if port is available
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "✓ Server started successfully!" -ForegroundColor Green
    Write-Host ""
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") {
            $localPath = "/index.html"
        }
        
        $filePath = Join-Path $path $localPath.TrimStart('/')
        
        if (Test-Path $filePath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $extension = [System.IO.Path]::GetExtension($filePath)
            
            # Set content type
            $contentType = "text/html"
            switch ($extension) {
                ".css" { $contentType = "text/css" }
                ".js" { $contentType = "application/javascript" }
                ".png" { $contentType = "image/png" }
                ".jpg" { $contentType = "image/jpeg" }
                ".jpeg" { $contentType = "image/jpeg" }
                ".ico" { $contentType = "image/x-icon" }
                ".svg" { $contentType = "image/svg+xml" }
            }
            
            $response.ContentType = $contentType
            $response.ContentLength64 = $content.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
            $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found")
            $response.ContentLength64 = $notFound.Length
            $response.OutputStream.Write($notFound, 0, $notFound.Length)
        }
        
        $response.Close()
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Install Python and run: python -m http.server 8000" -ForegroundColor Yellow
    Write-Host "Or use VS Code Live Server extension" -ForegroundColor Yellow
} finally {
    $listener.Stop()
    $listener.Close()
}

