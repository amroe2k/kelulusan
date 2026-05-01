# PSScriptAnalyzer Settings
# Dokumentasi: https://github.com/PowerShell/PSScriptAnalyzer
#
# File ini mengkonfigurasi rule PSScriptAnalyzer untuk seluruh workspace.

@{
    # Rule yang dikecualikan sepenuhnya
    ExcludeRules = @(
        # PSAvoidUsingCmdletAliases dikecualikan karena 'echo' dalam
        # deploy-dashboard.ps1 adalah konten bash script di dalam
        # @'...'@ heredoc (string literal), bukan PowerShell alias.
        'PSAvoidUsingCmdletAliases'
    )
}
