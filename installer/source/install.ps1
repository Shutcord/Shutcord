$link = "https://github.com/Shutcord/ShutcordInstaller/releases/latest/download/ShutcordInstallerCli.exe"

$outfile = "$env:TEMP\ShutcordInstallerCli.exe"

Write-Output "Downloading installer to $outfile"

Invoke-WebRequest -Uri "$link" -OutFile "$outfile"

Write-Output ""

Start-Process -Wait -NoNewWindow -FilePath "$outfile"

# Cleanup
Remove-Item -Force "$outfile"
