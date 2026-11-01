$ErrorActionPreference = 'SilentlyContinue'
$urls = [ordered]@{
 '5091 Ascona'='https://www.ascona.ch/Messaggi-municipali'
 '5096 Brione'='https://www.brione.ch/Messaggi-municipali-di-nuova-promulgazione-a459ef00'
 '5097 Brissago'='https://www.brissago.ch/comune/amministrazione/consiglio-comunale/documenti-consiglio-comunale/'
 '5108 Gordola'='https://www.gordola.ch/Messaggi-municipali-f3c97f00'
 '5112 Lavertezzo'='https://www.lavertezzo.ch/documenti-albo-comunale/messaggi-municipali/mm-2026'
 '5113 Locarno'='https://www.locarno.ch/it/messaggi-municipali/2024-2028'
 '5113 Locarno-fin'='https://www.locarno.ch/it/finanze'
 '5115 Losone'='https://www.losone.ch/Conti-del-Comune-519c1a00'
 '5117 Mergoscia'='https://www.comune-mergoscia.ch/Messaggi-municipali-861f7d00'
 '5118 Minusio'='https://www.minusio.ch/Messaggi-municipali-584f1a00'
 '5120 Muralto'='https://www.muralto.ch/Messaggi-municipali/IT-ac4d1f00'
 '5121 Orselina'='https://www.orselina.ch/index.php?node=326&lng=1&vis=2&rif=b07ebc24cc'
 '5125 Ronco'='https://ronco-s-ascona.ch/istituzione/conti-consuntivi/'
 '5131 Tenero'='https://www.tenero-contra.ch/Messaggi-municipali-43c4a500'
 '5136 Onsernone'='https://www.onsernone.swiss/Messaggi-861f7d00'
 '5138 Cugnasco'='https://www.cugnasco-gerra.ch/I-conti-del-Comune-43c4a500'
 '5396 Pedemonte'='https://www.pedemonte.ch/Messaggi-861f7d00'
 '5397 Centovalli'='https://centovalli.swiss/category/a4-messaggi-municipali/'
 '5398 Gambarogno'='https://www.gambarogno.ch/Messaggi-861f7d00'
 '5399 Verzasca'='https://www.verzasca.swiss/Documenti-Consiglio-comunale-d5961d00'
}
$ua = 'Mozilla/5.0 (compatible; ResearchProbe/0.1; feasibility check)'
foreach ($k in $urls.Keys) {
  $u = $urls[$k]
  $status = ''; $len = ''; $title = ''; $gen=''; $final=''
  try {
    $r = Invoke-WebRequest -Uri $u -UserAgent $ua -TimeoutSec 20 -UseBasicParsing -MaximumRedirection 5
    $status = $r.StatusCode; $len = $r.RawContentLength
    if ($r.Content -match '<title>([^<]{0,80})') { $title = $Matches[1].Trim() }
    if ($r.Content -match 'generator"\s+content="([^"]{0,40})') { $gen = $Matches[1] }
    elseif ($r.Content -match 'assolo') { $gen = 'assolo?' }
    elseif ($r.Content -match 'wp-content') { $gen = 'wordpress?' }
    elseif ($r.Content -match 'joomla|jdownloads') { $gen = 'joomla?' }
    $pdfs = ([regex]::Matches($r.Content, '(\.pdf|\?i=1|downdoc\.php|/send/)')).Count
  } catch { $status = 'ERR ' + $_.Exception.Message.Substring(0, [Math]::Min(60, $_.Exception.Message.Length)); $pdfs = '' }
  $host_ = ([uri]$u).GetLeftPart('Authority')
  $robots = ''
  try { $rb = Invoke-WebRequest -Uri "$host_/robots.txt" -UserAgent $ua -TimeoutSec 10 -UseBasicParsing; $robots = ($rb.Content -split "`n" | Where-Object { $_ -match '^(Disallow|Crawl-delay)' } | Select-Object -First 4) -join ' ; ' ; if (-not $robots) { $robots = '(nessun Disallow)' } } catch { $robots = 'n/d' }
  "{0,-18} | {1,-6} | {2,8} | links:{3,-4} | gen:{4,-12} | {5} | robots: {6}" -f $k, $status, $len, $pdfs, $gen, $title, $robots
}
