param(
    [switch]$StagedOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$lastChanged = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Get-TargetFiles {
    if ($StagedOnly) {
        $files = git diff --cached --name-only --diff-filter=ACMR
        if (-not $files) { return @() }

        return $files |
            Where-Object { $_ -match '\.(php|css|js)$' } |
            ForEach-Object { Join-Path $repoRoot $_ } |
            Where-Object { Test-Path $_ }
    }

    return Get-ChildItem -Path $repoRoot -Recurse -File -Include *.php,*.css,*.js |
        Select-Object -ExpandProperty FullName
}

function Update-Php([string]$content) {
    if ($content -match '(?m)^\s*//\s*LastChanged:\s*.+$') {
        return [regex]::Replace($content, '(?m)^\s*//\s*LastChanged:\s*.+$', "// LastChanged: $lastChanged", 1)
    }

    if ($content.StartsWith("<?php")) {
        return $content -replace '^<\?php\r?\n', "<?php`r`n// LastChanged: $lastChanged`r`n"
    }

    return "// LastChanged: $lastChanged`r`n" + $content
}

function Update-Js([string]$content) {
    if ($content -match '(?m)^\s*//\s*LastChanged:\s*.+$') {
        return [regex]::Replace($content, '(?m)^\s*//\s*LastChanged:\s*.+$', "// LastChanged: $lastChanged", 1)
    }

    if ($content -match '(?m)^\s*/\*\s*LastChanged:\s*.+\*/\s*$') {
        return [regex]::Replace($content, '(?m)^\s*/\*\s*LastChanged:\s*.+\*/\s*$', "/* LastChanged: $lastChanged */", 1)
    }

    return "// LastChanged: $lastChanged`r`n" + $content
}

function Update-StyleCssHeader([string]$content) {
    if ($content -match '(?m)^\s*LastChanged:\s*.+$') {
        return [regex]::Replace($content, '(?m)^\s*LastChanged:\s*.+$', "LastChanged: $lastChanged", 1)
    }

    if ($content -match '(?m)^\s*Updated:\s*.+$') {
        return [regex]::Replace($content, '(?m)^\s*Updated:\s*.+$', "`$0`r`nLastChanged: $lastChanged", 1)
    }

    return [regex]::Replace($content, '(?s)^/\*', "/*`r`nLastChanged: $lastChanged", 1)
}

function Update-Css([string]$content, [string]$fileName) {
    if ($fileName -ieq 'style.css') {
        return Update-StyleCssHeader $content
    }

    if ($content -match '(?m)^\s*/\*\s*LastChanged:\s*.+\*/\s*$') {
        return [regex]::Replace($content, '(?m)^\s*/\*\s*LastChanged:\s*.+\*/\s*$', "/* LastChanged: $lastChanged */", 1)
    }

    if ($content -match '(?m)^\s*//\s*LastChanged:\s*.+$') {
        return [regex]::Replace($content, '(?m)^\s*//\s*LastChanged:\s*.+$', "/* LastChanged: $lastChanged */", 1)
    }

    return "/* LastChanged: $lastChanged */`r`n" + $content
}

$targetFiles = Get-TargetFiles
if (-not $targetFiles -or $targetFiles.Count -eq 0) {
    Write-Host 'No matching files to update.'
    exit 0
}

$changed = @()
foreach ($file in $targetFiles) {
    $ext = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
    $name = [System.IO.Path]::GetFileName($file)
    $original = [System.IO.File]::ReadAllText($file)

    switch ($ext) {
        '.php' { $updated = Update-Php $original }
        '.js'  { $updated = Update-Js $original }
        '.css' { $updated = Update-Css $original $name }
        default { $updated = $original }
    }

    if ($updated -ne $original) {
        [System.IO.File]::WriteAllText($file, $updated, $utf8NoBom)
        $changed += $file
    }
}

if ($changed.Count -gt 0) {
    Write-Host "Updated LastChanged in $($changed.Count) file(s)."

    if ($StagedOnly) {
        foreach ($file in $changed) {
            $relative = Resolve-Path -Relative $file
            git add -- "$relative"
        }
    }
} else {
    Write-Host 'All files already up to date.'
}
