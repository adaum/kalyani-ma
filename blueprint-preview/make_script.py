import base64

parts = [
    # Part 1: Script header & CSS
    "import base64, os, subprocess\n\ndef img_data_uri(path):\n    if not os.path.exists(path):\n        return \"\"\n    ext = os.path.splitext(path)[1].lower().lstrip(\".\")\n    mime = \"image/webp\" if ext == \"webp\" else (\"image/png\" if ext == \"png\" else \"image/jpeg\")\n    with open(path, \"rb\") as f:\n        return f\"data:{mime};base64,{base64.b64encode(f.read()).decode()}\"\n\nimgs = {\n    \"p1\": img_data_uri(\"preview-k92x/images/pillar-01-frankincense.webp\"),\n    \"p2\": img_data_uri(\"preview-k92x/images/pillar-02-rosemary.webp\"),\n    \"p3\": img_data_uri(\"preview-k92x/images/pillar-03-peppermint-eucalyptus.webp\"),\n    \"p4\": img_data_uri(\"preview-k92x/images/pillar-04-wintergreen-camphor.webp\"),\n    \"p5\": img_data_uri(\"preview-k92x/images/pillar-05-lavender.webp\"),\n    \"verified\": img_data_uri(\"preview-k92x/images/bottle-bottom-verified.webp\"),\n    \"blank\": img_data_uri(\"preview-k92x/images/bottle-bottom-blank.webp\"),\n}\n"
]
print("Helper ready")
