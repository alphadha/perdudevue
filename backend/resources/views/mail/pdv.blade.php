<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $heading }}</title>
</head>
<body style="margin:0;padding:0;background-color:#E9F2EE;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E9F2EE;">
    <tr>
        <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;">
                <tr>
                    <td style="background-color:#FCFCFC;padding:28px 28px 0;border-radius:12px 12px 0 0;font-family:Arial,Helvetica,sans-serif;">
                        <img src="{{ $logoUrl }}" alt="Perdues de Vue" width="167" height="60" style="display:block;border:0;outline:none;text-decoration:none;width:167px;height:60px;">
                    </td>
                </tr>
                <tr>
                    <td style="background-color:#FCFCFC;padding:24px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:#13263F;">
                        <h1 style="margin:0 0 16px;font-size:22px;line-height:28px;font-weight:700;color:#24364D;">{{ $heading }}</h1>
                        <div style="margin:0 0 24px;font-size:16px;line-height:24px;color:#13263F;">
                            {!! $bodyHtml !!}
                        </div>
                        @if (filled($highlight))
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                                <tr>
                                    <td style="background-color:#EBEFF4;border-radius:8px;padding:16px;text-align:center;">
                                        @if (filled($highlightLabel))
                                            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#3C5A80;">{{ $highlightLabel }}</p>
                                        @endif
                                        <p style="margin:0;font-size:28px;line-height:34px;font-weight:700;letter-spacing:0.12em;color:#24364D;">{{ $highlight }}</p>
                                    </td>
                                </tr>
                            </table>
                        @endif
                        @if (filled($buttonUrl) && filled($buttonLabel))
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 8px;">
                                <tr>
                                    <td style="background-color:#24364D;border-radius:8px;">
                                        <a href="{{ $buttonUrl }}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#FCFCFC;text-decoration:none;font-weight:700;">{{ $buttonLabel }}</a>
                                    </td>
                                </tr>
                            </table>
                        @endif
                    </td>
                </tr>
                <tr>
                    <td style="background-color:#24364D;padding:20px 28px;border-radius:0 0 12px 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#BBC8DD;">
                        Une question ? Écrivez-nous à
                        <a href="mailto:support@perduesdevue.fr" style="color:#7CB19A;text-decoration:none;">support@perduesdevue.fr</a><br>
                        Perdues de Vue — Perdues aujourd’hui, retrouvées demain.
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
