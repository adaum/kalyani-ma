# WhatsApp Cloud API — Blueprint auto-reply

`https://kalyanima.in/api/whatsapp` answers an inbound WhatsApp message with the Household Botanical Blueprint link.

The webhook replies to **text**, **button**, and **interactive** messages (`button_reply` and `list_reply`). It reads a referral id from `(Ref: 99999)` (spacing and case do not matter) and falls back to `44405`. The id is stripped to letters, numbers, `_`, and `-`, then capped at 32 characters, the same character set `api/blueprint.js` allows.

It does **not** reply to status callbacks (`delivered`, `read`, and the rest) or to other non-text messages (image, audio, video, sticker, location). Those events are acknowledged and ignored.

A valid POST always returns 200, including when the Graph send fails, so Meta does not retry-storm. Message ids are remembered on the warm serverless instance so a retry does not send a second link.

Reply copy:

```
Namaste! 🌿 Here is your Household Botanical Blueprint: https://kalyanima.in/api/blueprint?ref=<ID>
With love, Kalyani
```

## Vercel environment variables

Set these on the Vercel project for Production (and Preview, if you exercise the webhook there). Do not commit them.

| Name | Purpose |
| --- | --- |
| `WHATSAPP_TOKEN` | Permanent System User token with the `whatsapp_business_messaging` permission. Business Settings → Users → System users → generate a token for this Meta app. |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID from WhatsApp Manager (a long numeric id). This is not the display number `+1 430-340-4160`. |
| `WHATSAPP_VERIFY_TOKEN` | Any long random string you invent. Enter the same string in the Meta webhook form. |
| `WHATSAPP_APP_SECRET` | Recommended. App Secret from the Meta app (App settings → Basic). Every POST is checked with HMAC SHA-256 of the raw body (`X-Hub-Signature-256`). A mismatch returns 401. |

## Meta webhook

1. Meta app → WhatsApp → Configuration → Webhook.
2. Callback URL: `https://kalyanima.in/api/whatsapp`
3. Verify token: the same value as `WHATSAPP_VERIFY_TOKEN`.
4. Subscribe the **`messages`** field. Status events may arrive on that field too; the handler ignores them.

`middleware.js` matches only `/preview-k92x/:path*`. The staging basic-auth gate does not cover `/api/whatsapp`, so Meta can reach the webhook without credentials. No exemption was added.

## The number cannot stay on the phone app

A number registered on the WhatsApp Business Cloud API is removed from the WhatsApp and WhatsApp Business phone apps. The phone app and the Cloud API cannot be signed in to the same number at the same time.

## 24-hour customer service window

A reply to a message the person just sent is free-form for 24 hours. This webhook only answers inbound messages, so that reply does not need a template. Outside the window Meta rejects free-form sends. We never message someone first.

## Go-live options

`+1 430-340-4160` is on the WhatsApp Business phone app today. It is not on the Cloud API yet. Pick one path when you turn the bot on. The webhook code is the same either way.

### A. Migrate +1-430-340-4160

This removes the number from the phone app. Chat history on that phone is deleted.

1. On the phone, open WhatsApp Business for this number.
2. Settings → Account → Delete my account. Confirm with the phone number. That deregisters it.
3. Leave WhatsApp and WhatsApp Business logged out of this number. Do not verify it on a phone again.
4. Wait until Meta will accept the number (usually minutes).
5. Meta Business Suite → WhatsApp Manager → Phone numbers → Add phone number. Register `+1 430-340-4160` and finish the SMS or voice code.
6. Copy that number's **Phone number ID** into `WHATSAPP_PHONE_NUMBER_ID`.
7. Leave the site link alone. `WHATSAPP_NUMBER` is already `14303404160`.

### B. Dedicated second bot number

Leave `+1 430-340-4160` on the phone app. Register a different number on the Cloud API, and point the site at that number. People who tap the preview button must reach the number whose webhook is this one.

1. Set `WHATSAPP_PHONE_NUMBER_ID` to the new number's Phone number ID.
2. In `preview-k92x/index.html`, change `WHATSAPP_NUMBER` (line 1226) from `"14303404160"` to the new digits: country code, no plus sign. The script on line 1252 builds `https://wa.me/${WHATSAPP_NUMBER}?text=...` from that constant.
3. Change the same digits in the fallback `href` on `#blueprintWaBtn` (line 1134). That href is only used before the script runs. Keep it identical to `WHATSAPP_NUMBER`.

## Curl test for the GET challenge

Use your real `WHATSAPP_VERIFY_TOKEN`. A match returns the challenge as plain text. Anything else returns 403.

```bash
curl -i "https://kalyanima.in/api/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=1234567890"
```

Expect `HTTP/2 200` (or `HTTP/1.1 200`) and a body of exactly:

```
1234567890
```
