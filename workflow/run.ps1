param([Parameter(ValueFromRemainingArguments=$true)][string[]]$RemainingArgs)
node (Join-Path $PSScriptRoot 'run.mjs') @RemainingArgs
