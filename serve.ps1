param(
  [int]$Port = 5173,
  [string]$Root = "."
)

$rootPath = (Resolve-Path $Root).Path
$prefix = "http://localhost:$Port/"

Add-Type -AssemblyName System.Net.HttpListener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "Preview URL: $prefix"
Write-Host "Serving directory: $rootPath"

function Get-ContentType([string]$path) {
  switch -regex ($path) {
    '.*\.html$' { return 'text/html; charset=utf-8' }
    '.*\.css$'  { return 'text/css; charset=utf-8' }
    '.*\.js$'   { return 'application/javascript; charset=utf-8' }
    '.*\.svg$'  { return 'image/svg+xml' }
    '.*\.png$'  { return 'image/png' }
    '.*\.jpe?g$' { return 'image/jpeg' }
    '.*\.ico$'  { return 'image/x-icon' }
    default     { return 'application/octet-stream' }
  }
}

while ($true) {
  $context = $listener.GetContext()
  try {
    $requested = $context.Request.Url.AbsolutePath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($requested)) { $requested = 'index.html' }

    $full = [System.IO.Path]::GetFullPath((Join-Path $rootPath $requested))
    if (-not $full.StartsWith($rootPath)) { throw 'Path outside root' }
    if (Test-Path $full -PathType Container) { $full = Join-Path $full 'index.html' }

    if (Test-Path $full -PathType Leaf) {
      $resp = $context.Response
      $resp.ContentType = Get-ContentType $full
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $resp.ContentLength64 = $bytes.Length
      $resp.OutputStream.Write($bytes, 0, $bytes.Length)
      $resp.OutputStream.Close()
    } else {
      $resp = $context.Response
      $resp.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
      $resp.OutputStream.Write($bytes, 0, $bytes.Length)
      $resp.OutputStream.Close()
    }
  } catch {
    $resp = $context.Response
    $resp.StatusCode = 500
    $bytes = [System.Text.Encoding]::UTF8.GetBytes('Server Error')
    $resp.OutputStream.Write($bytes, 0, $bytes.Length)
    $resp.OutputStream.Close()
  }
}
