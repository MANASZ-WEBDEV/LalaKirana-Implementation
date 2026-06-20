$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('c:\MANAS\Projects\LK\Implementation\LalaKirana_ImplementationPlan_v3.docx')
$text = $doc.Content.Text
$doc.Close()
$word.Quit()
$text | Out-File -FilePath 'c:\MANAS\Projects\LK\Implementation\LalaKirana_v3_text.txt' -Encoding UTF8
Write-Output "Done extracting text"
