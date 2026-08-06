param([Parameter(ValueFromRemainingArguments=$true)][string[]]$RemainingArgs)
node (Join-Path $PSScriptRoot 'setup-browser.mjs') @RemainingArgs
