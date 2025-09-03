# Read the current main.js content
$mainJsPath = 'c:\Users\mauricio.oliveira\Downloads\feedback-app-frontend\main\main.js'
$newFunctionPath = 'c:\Users\mauricio.oliveira\Downloads\feedback-app-frontend\main\renderUsersTable_updated.js'

# Read the files
$mainContent = [System.IO.File]::ReadAllText($mainJsPath)
$newFunctionContent = [System.IO.File]::ReadAllText($newFunctionPath)

# Replace the function content
$pattern = 'async function renderUsersTable\(\s*\/\*\*[\s\S]*?\*\/\s*\n[\s\S]*?\n}'
$mainContent = [regex]::Replace($mainContent, $pattern, $newFunctionContent, [System.Text.RegularExpressions.RegexOptions]::Singleline)

# Write the updated content back to main.js
[System.IO.File]::WriteAllText($mainJsPath, $mainContent, [System.Text.Encoding]::UTF8)

Write-Host "Function updated successfully!"
