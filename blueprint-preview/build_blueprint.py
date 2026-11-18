import base64, os, subprocess

def u(p):
    if not os.path.exists(p): return ""
    ext = os.path.splitext(p)[1].lower().lstrip(".")
    m = "image/webp" if ext == "webp" else ("image/png" if ext == "png" else "image/jpeg")
    return f"data:{m};base64," + base64.b64encode(open(p, "rb").read()).decode()

imgs = {
    "p1": u("preview-k92x/images/pillar-01-frankincense.webp"),
    "p2": u("preview-k92x/images/pillar-02-rosemary.webp"),
    "p3": u("preview-k92x/images/pillar-03-peppermint-eucalyptus.webp"),
    "p4": u("preview-k92x/images/pillar-04-wintergreen-camphor.webp"),
    "p5": u("preview-k92x/images/pillar-05-lavender.webp"),
    "ver": u("preview-k92x/images/bottle-bottom-verified.webp"),
    "blk": u("preview-k92x/images/bottle-bottom-blank.webp"),
}

def pic(k, alt, cls="pimg"):
    return f'<img src="{imgs[k]}" alt="{alt}" class="{cls}">' if imgs[k] else f'<div class="ph">{alt}</div>'

ver_v = f'<img src="{imgs["ver"]}" class="bphoto">' if imgs["ver"] else '<div class="smock">260636A<br>EXP 2031.03</div>'
blk_v = f'<img src="{imgs["blk"]}" class="bphoto">' if imgs["blk"] else '<div class="sblank">BLANK GLASS BASE<br>NO LOT / NO EXP</div>'
CSS = """
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght:600;700&family=Newsreader:ital,opsz,wght:0,6..72,400;0,6..72,600;1,6..72,400&family=Inter:wght:400;600;700&display=swap');
@page { size: letter; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Newsreader', Georgia, serif; color: #102217; background: #F7F2E7; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 8.5in; height: 11in; padding: 0.56in 0.68in; background: #F7F2E7; page-break-after: always; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #E5DEC9; overflow: hidden; }
.page:last-child { page-break-after: auto; }
.cover { background: linear-gradient(165deg, #102217 0%, #173021 55%, #0D1C13 100%); color: #F7F2E7; padding: 0.72n; border: 12px solid #F7F2E7; outline: 2px solid #CBB279; outline-offset: -22px; }
.ctop { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
.cbadge { font: 600 8.5pt 'Inter', sans-serif; letter-spacing: 2.2px; text-transform: uppercase; color: #CBB279; border: 1px solid rgba(203,178,121,.55); padding: 6px 14px; }
.crest { width: 42px; height: 42px; border: 1.5px solid #CBB279; border-radius: 50%; display: flex; align-items: center; justify-content: center; font: 600 12pt 'Cinzel', serif; color: #CBB279; }
.cover h1 { font: 600 31pt/1.15 'Cinzel', serif; color: #FFF; margin-bottom: 14px; }
.crule { width: 96px; height: 2px; background: #CBB279; margin: 14px 0 20px; }
.csub { font-size: 13pt; line-height: 1.58; color: #EAE3D2; margin-bottom: 22px; }
.toc { background: rgba(255,255,255,.04); border: 1px solid rgba(203,178,121,.35); border-radius: 4px; padding: 14px 18px; margin-bottom: 18px; }
.toct { font: 700 8pt 'Inter', sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #CBB279; margin-bottom: 8px; }
.tocg { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; font: 400 8.5pt 'Inter', sans-serif; color: #F7F2E7; }
.tocg strong { color: #CBB279; margin-right: 5px; }
.cstrip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 12px 0 16px; }
.cstrip img { width: 100%; height: 1.08in; object-fit: cover; border-radius: 3px; border: 1.5px solid rgba(203,178,121,.55); }
.cfoot { border-top: 1px solid rgba(203,178,121,.35); padding-top: 12px; display: flex; juÍÑ¥™äµ½¹Ñ•¹ĞèÍÁ…”µ‰•Ñİ••¸ì™½¹Ğè€ĞÀÀ€à¸ÕÁĞ€%¹Ñ•Èœ°Í…¹ÌµÍ•É¥˜ì½±½Èè€	ÈÜäì±•ÑÑ•ÈµÍÁ…¥¹œè€ÅÁàìÑ•áĞµÑÉ…¹Í™½É´èÕÁÁ•É…Í”ìô(¹É¡•…°€¹É™½½Ğì‘¥ÍÁ±…äè™±•àì©ÕÍÑ¥™äµ½¹Ñ•¹ĞèÍÁ…”µ‰•Ñİ••¸ì™½¹Ğè€ØÀÀ€Ü¸ÕÁĞ€%¹Ñ•Èœ°Í…¹ÌµÍ•É¥˜ì½±½Èè€ŒÕØØÕì‰½É‘•Èµ‰½ÑÑ½´è€ÅÁàÍ½±¥€ÕØìÁ…‘‘¥¹œµ‰½ÑÑ½´è€ÙÁàìµ…É¥¸µ‰½ÑÑ½´è€ÄÍÁàì±•ÑÑ•ÈµÍÁ…¥¹œè€Ä¸ÕÁàìÑ•áĞµÑÉ…¹Í™½É´èÕÁÁ•É…Í”ìô(¹É™½½Ğì‰½É‘•Èµ‰½ÑÑ½´è¹½¹”ì‰½É‘•ÈµÑ½Àè€ÅÁàÍ½±¥€ÕØìÁ…‘‘¥¹œµÑ½Àè€ÙÁàìµ…É¥¸µÑ½Àè€ÄÁÁàìµ…É¥¸µ‰½ÑÑ½´è€Àì™½¹Ğµİ•¥¡Ğè€ĞÀÀì±•ÑÑ•ÈµÍÁ…¥¹œè€À¸ÕÁàìô(¹­¥­•Èì™½¹Ğè€ÜÀÀ€áÁĞ€%¹Ñ•Èœ°Í…¹ÌµÍ•É¥˜ì±•ÑÑ•ÈµÍÁ…¥¹œè€ÉÁàìÑ•áĞµÑÉ…¹Í™½É´èÕÁÁ•É…Í”ì½±½Èè€ŒåİÍìµ…É¥¸µ‰½ÑÑ½´è€ÑÁàìô) Èì™½¹Ğè€ØÀÀ€ÄáÁĞ¼Ä¸È€¥¹é•°œ°Í•É¥˜ì½±½Èè€ŒÄÀÈÈÄÜìµ…É¥¸µ‰½ÑÑ½´è€åÁàìô) Ìì™½¹Ğè€ØÀÀ€ÄÄ¸áÁĞ€¥¹é•°œ°Í•É¥˜ì½±½Èè€ŒÄÀÈÈÄÜìµ…É¥¸µ‰½ÑÑ½´è€ÑÁàìô)Àì™½¹ĞµÍ¥é”è€ä¸áÁĞì±¥¹”µ¡•¥¡Ğè€Ä¸ÔÈì½±½Èè€ŒÅÉÈĞìµ…É¥¸µ‰½ÑÑ½´è€áÁàìô(¹±•…ì™½¹ĞµÍ¥é”è€ÄÀ¸áÁĞì±¥¹”µ¡•¥¡Ğè€Ä¸ÔØì½±½Èè€ŒÄÀÈÈÄÜìô(.wcard { background: #FFF; border: 1px solid #DED5C0; border-radius: 5px; padding: 12px 15px; margin-bottom: 10px; }
.ctitle { font: 700 8.4pt 'Inter', sans-serif; letter-spacing: 1.2px; text-transform: uppercase; color: #102217; margin-bottom: 5px; }
.gl { border-left: 3.5px solid #CBB279; } .grl { border-left: 3.5px solid #102217; }
.rt { border-top: 3px solid #9E3B2B; } .gt { border-top: 3px solid #102217; }
.gcard { background: #FFF; border: 1.5px solid #CBB279; outline: 1px solid rgba(203,178,121,.55); outline-offset: -6px; border-radius: 4px; padding: 18px 22px; position: relative; margin-top: 8px; }
.gc { position: absolute; width: 12px; height: 12px; border-color: #9A7B3E; border-style: solid; }
.tl { top: 3px; left: 3px; border-width: 2px 0 0 2px; } .tr { top: 3px; right: 3px; border-width: 2px 2px 0 0; }
.bl { bottom: 3px; left: 3px; border-width: 0 0 2px 2px; } .br { bottom: 3px; right: 3px; border-width: 0 2px 2px 0; }
.gbadge { display: inline-block; font: 700 7.4pt 'Inter', sans-serif; letter-spacing: 1.8px; text-transform: uppercase; color: #9A7B3E; background: #F7F2E7; border: 1px solid #CBB279; padding: 3px 10px; margin-bottom: 8px; }
.glink { color: #102217; font-weight: 700; text-decoration: none; border-bottom: 1.5px solid #CBB279; padding-bottom: 1px; }
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; margin: 7px 0; }
.g3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 7px 0; }
.bphoto, .smock, .sblank { width: 104px; height: 104px; border-radius: 50%; margin: 4px auto 8px; display: flex; align-items: center; justify-content: center; text-align: center; }
.bphoto { object-fit: cover; border: 2px solid #CBB279; display: block; }
.smock { background: #1B140E; color: #9BE86B; font: bold 9.5pt monospace; border: 2.5px solid #CBB279; }
.sblank { background: #2B1F16; color: rgba(255,255,255,.45); font: 600 7.5pt 'Inter', sans-serif; border: 2.5px solid #8A7A68; }
.pfeat { display: grid; grid-template-columns: 1.65in 1fr; gap: 14px; background: #FFF; border: 1px solid #DED5C0; border-top: 3px solid #102217; border-radius: 5px; padding: 11px 14px; margin-bottom: 10px; align-items: start; }
.pimg { width: 1.65in; height: 1.75in; object-fit: cover; border-radius: 4px; border: 1px solid #CBB279; }
.latin { font-style: italic; color: #526358; font-size: 9pt; margin-bottom: 5px; }
.cbar { background: #F7F2E7; border: 1px solid #DED5C0; border-left: 3px solid #CBB279; padding: 5px 9px; font: 400 8pt 'Inter', sans-serif; color: #102217; margin-bottom: 7px; }
.rgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 5px; }
.rbox { background: #FAF7F0; border: 1px solid #E3DAC6; border-radius: 4px; padding: 7px 9px; font-size: 8.8pt; line-height: 1.42; }
.bcard { background: #FFF; border: 1px solid #DED5C0; border-left: 3.5px solid #CBB279; border-radius: 4px; padding: 10px 13px; margin-bottom: 9px; }
.bhdr { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #EFE9DA; padding-bottom: 4px; margin-bottom: 5px; }
.btag { font: 700 7.4pt 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 1px; color: #9A7B3E; }
table { width: 100%; border-collapse: collapse; margin: 7px 0; font-size: 8.6pt; }
th { background: #102217; color: #F7F2E7; text-align: left; padding: 6px 8px; font: 600 7.6pt 'Inter', sans-serif; letter-spacing: 0.7px; text-transform: uppercase; border: 1px solid #102217; }
td { padding: 6px 8px; border: 1px solid #DED5C0; background: #FFF; vertical-align: top; line-height: 1.38; }
tr:nth-child(even) td { background: #FCFBF7; }
ul, ol { padding-left: 16px; margin-bottom: 7px; }
li { font-size: 9.2pt; line-height: 1.45; margin-bottom: 4px; color: #1E2E24; }
.gbul { list-style: none; padding-left: 0; margin: 8px 0 12px; }
.gbul li { position: relative; padding-left: 18px; margin-bottom: 8px; font-size: 9.6pt; line-height: 1.48; }
.gbul li::before { content: "â—†"; position: absolute; left: 0; top: 1px; color: #9A7B3E; font-size: 8.5pt; }
.btn { display: block; width: 100%; text-align: center; background: #102217; color: #CBB279; border: 1.5px solid #CBB279; font: 700 9.8pt 'Inter', sans-serif; letter-spacing: 0.6px; padding: 12px 16px; border-radius: 4px; text-decoration: none; margin-top: 6px; }
"""
print("Step 3 OK")
.wcard { background: #FFF; border: 1px solid #DED5C0; border-radius: 5px; padding: 12px 15px; margin-bottom: 10px; }
.ctitle { font: 700 8.4pt 'Inter', sans-serif; letter-spacing: 1.2px; text-transform: uppercase; color: #102217; margin-bottom: 5px; }
.gl { border-left: 3.5px solid #CBB279; } .grl { border-left: 3.5px solid #102217; }
.rt { border-top: 3px solid #9E3B2B; } .gt { border-top: 3px solid #102217; }
.gcard { background: #FFF; border: 1.5px solid #CBB279; outline: 1px solid rgba(203,178,121,.55); outline-offset: -6px; border-radius: 4px; padding: 18px 22px; position: relative; margin-top: 8px; }
.gc { position: absolute; width: 12px; height: 12px; border-color: #9A7B3E; border-style: solid; }
.tl { top: 3px; left: 3px; border-width: 2px 0 0 2px; } .tr { top: 3px; right: 3px; border-width: 2px 2px 0 0; }
.bl { bottom: 3px; left: 3px; border-width: 0 0 2px 2px; } .br { bottom: 3px; right: 3px; border-width: 0 2px 2px 0; }
.gbadge { display: inline-block; font: 700 7.4pt 'Inter', sans-serif; letter-spacing: 1.8px; text-transform: uppercase; color: #9A7B3E; background: #F7F2E7; border: 1px solid #CBB279; padding: 3px 10px; margin-bottom: 8px; }
.glink { color: #102217; font-weight: 700; text-decoration: none; border-bottom: 1.5px solid #CBB279; padding-bottom: 1px; }
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; margin: 7px 0; }
.g3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 7px 0; }
.bphoto, .smock, .sblank { width: 104px; height: 104px; border-radius: 50%; margin: 4px auto 8px; display: flex; align-items: center; justify-content: center; text-align: center; }
.bphoto { object-fit: cover; border: 2px solid #CBB279; display: block; }
.smock { background: #1B140E; color: #9BE86B; font: bold 9.5pt monospace; border: 2.5px solid #CBB279; }
.sblank { background: #2B1F16; color: rgba(255,255,255,.45); font: 600 7.5pt 'Inter', sans-serif; border: 2.5px solid #8A7A68; }
.pfeat { display: grid; grid-template-columns: 1.65in 1fr; gap: 14px; background: #FFF; border: 1px solid #DED5C0; border-top: 3px solid #102217; border-radius: 5px; padding: 11px 14px; margin-bottom: 10px; align-items: start; }
.pimg { width: 1.65in; height: 1.75in; object-fit: cover; border-radius: 4px; border: 1px solid #CBB279; }
.latin { font-style: italic; color: #526358; font-size: 9pt; margin-bottom: 5px; }
.cbar { background: #F7F2E7; border: 1px solid #DED5C0; border-left: 3px solid #CBB279; padding: 5px 9px; font: 400 8pt 'Inter', sans-serif; color: #102217; margin-bottom: 7px; }
.rgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 5px; }
.rbox { background: #FAF7F0; border: 1px solid #E3DAC6; border-radius: 4px; padding: 7px 9px; font-size: 8.8pt; line-height: 1.42; }
.bcard { background: #FFF; border: 1px solid #DED5C0; border-left: 3.5px solid #CBB279; border-radius: 4px; padding: 10px 13px; margin-bottom: 9px; }
.bhdr { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #EFE9DA; padding-bottom: 4px; margin-bottom: 5px; }
.btag { font: 700 7.4pt 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 1px; color: #9A7B3E; }
table { width: 100%; border-collapse: collapse; margin: 7px 0; font-size: 8.6pt; }
th { background: #102217; color: #F7F2E7; text-align: left; padding: 6px 8px; font: 600 7.6pt 'Inter', sans-serif; letter-spacing: 0.7px; text-transform: uppercase; border: 1px solid #102217; }
td { padding: 6px 8px; border: 1px solid #DED5C0; background: #FFF; vertical-align: top; line-height: 1.38; }
tr:nth-child(even) td { background: #FCFBF7; }
ul, ol { padding-left: 16px; margin-bottom: 7px; }
li { font-size: 9.2pt; line-height: 1.45; margin-bottom: 4px; color: #1E2E24; }
.gbul { list-style: none; padding-left: 0; margin: 8px 0 12px; }
.gbul li { position: relative; padding-left: 18px; margin-bottom: 8px; font-size: 9.6pt; line-height: 1.48; }
.gbul li::before { content: "â—†"; position: absolute; left: 0; top: 1px; color: #9A7B3E; font-size: 8.5pt; }
.btn { display: block; width: 100%; text-align: center; background: #102217; color: #CBB279; border: 1.5px solid #CBB279; font: 700 9.8pt 'Inter', sans-serif; letter-spacing: 0.6px; padding: 12px 16px; border-radius: 4px; text-decoration: none; margin-top: 6px; }
"""
print("Step 3 OK")
