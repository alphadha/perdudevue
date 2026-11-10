{{ $heading }}

{{ trim(html_entity_decode(strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $bodyHtml)))) }}

@if (filled($highlight))
{{ $highlightLabel }} : {{ $highlight }}
@endif

@if (filled($buttonUrl) && filled($buttonLabel))
{{ $buttonLabel }} : {{ $buttonUrl }}
@endif

Une question ? support@perduesdevue.fr
Perdues de Vue
