import sys,os,re,subprocess
sys.path[:0]=["blueprint-v2","blueprint-preview"]
import parts_v2 as v2, parts_b as ob, parts_c as oc
def cv(h,cov=False):
    if cov:
        h=h.replace("<div class=\"page cover\">",f"<div class=\"page cover\"><div class=\"archival-frame\"><span class=\"filigree fl-tl\">{v2.CORNER_SVG}</span><span class=\"filigree fl-tr\">{v2.CORNER_SVG}</span><span class=\"filigree fl-bl\">{v2.CORNER_SVG}</span><span class=\"filigree fl-br\">{v2.CORNER_SVG}</span><div class=\"page-inner\">",1)
        h=re.sub(r"<div class=\"cstrip\">.*?</div>",f"<div class=\"cstrip\">{v2.plate('p1')}{v2.plate('p2')}{v2.plate('p3')}{v2.plate('p4')}{v2.plate('p5')}</div>",h,1,re.S)
        return h[:-6]+v2.COVER_EMBLEM+"</div></div></div>"
    h=re.sub(r"^<div class=\"page\"( id=\"[^\"]+\")?><div><div class=\"rhead\"><span>The Household Botanical Blueprint</span><span>([^<]+)</span></div>",lambda m:v2.frame_open(m.group(2),m.group(1)[5:-1] if m.group(1) else ""),h,1)
    h=re.sub(r"</div><div class=\"rfoot\"><span>[^<]+</span><span>Page (\d+)</span></div></div>$",lambda m:v2.NOTES_HTML+v2.frame_close(m.group(1)),h,1)
    h=re.sub(r"(</h2>)",rf"\1<div class=\"title-flourish\">{v2.DIVIDER_SVG}</div>",h,1)
    for k in ["p1","p2","p3","p4","p5"]: h=re.sub(r"<img[^>]*class=\"pimg\"[^>]*>",v2.plate(k,"plate-sm" if k in "p3p4p5" else "plate-box"),h,1)
    h=re.sub(r"<img[^>]*class=\"bphoto\"[^>]*>|<div class=\"sblank\">.*?</div>",f"<div class=\"stamp-wrap\">{v2.PLATES['blk']}</div>",h,1)
    return re.sub(r"<img[^>]*class=\"bphoto\"[^>]*>|<div class=\"smock\">.*?</div>",f"<div class=\"stamp-wrap\">{v2.PLATES['ver']}</div>",h,1)
ps=[cv(ob.P1,True)]+[cv(x) for x in [ob.P2,ob.P3,ob.P4,ob.P5,ob.P6,ob.P7,ob.P8,ob.P9,oc.P10,oc.P11,oc.P12,oc.P13,oc.P14,oc.P15,oc.P16]]
open("blueprint-v2/blueprint-v2.html","w").write(f"<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><style>{v2.CSS}</style></head><body>{''.join(ps)}</body></html>")
pdf="blueprint-v2/household-botanical-blueprint-v2.pdf"; subprocess.run(["google-chrome","--headless","--disable-gpu","--no-sandbox",f"--print-to-pdf={pdf}","--no-pdf-header-footer",os.path.abspath("blueprint-v2/blueprint-v2.html")],check=True)
os.makedirs("blueprint-v2/pages",exist_ok=True); subprocess.run(["pdftoppm","-png","-r","220",pdf,"blueprint-v2/pages/p"],check=True); print("V2 BUILT:",os.path.getsize(pdf),"bytes")
