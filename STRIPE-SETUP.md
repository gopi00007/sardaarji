# Turning on real payments (Stripe)

Right now checkout is a **demo** — it starts a "trial" but never charges a card. To actually collect
money you connect **Stripe**. For a site like yours (no complex server), the fastest, safest route is
**Stripe Payment Links** — no coding, and card details never touch your site or me.

## Why Stripe Payment Links (recommended)
- You create one link per plan in Stripe's dashboard (5 min each).
- I wire your "Start free trial" buttons to open those links.
- Stripe hosts the secure checkout page, handles cards, taxes, receipts, and recurring billing.
- You can add a **7-day free trial** and **monthly OR annual** pricing right in Stripe.

## Part 1 — You do this (create the account + links)
1. Go to **https://stripe.com** → create an account (use your business email). Stripe will ask for
   basic business + bank details to pay you out — that's normal and required to receive money.
2. **START HERE — the easiest first sale.** In **Product catalog** → **Add product**, create:
   | Product | Price | Type |
   |---------|-------|------|
   | Starter Systems Pack (3 PDFs) | $20 | **One-time** |
   - Create its payment link, then open the link's settings and set
     **After payment → Redirect customers to**: `https://fitnessandtradingcoach.netlify.app/downloads.html`
   - That's a complete, working digital business: they pay $20, Stripe redirects them
     straight to your download page. No subscriptions, no access control, no complexity.

3. Then the memberships. Create one product per plan:
   | Plan | Monthly price | Annual price |
   |------|---------------|--------------|
   | Starter Trader | $29/mo | $290/yr |
   | Pro Trader | $79/mo | $790/yr |
   | Elite Trader | $199/mo | $1990/yr |
   | Kickstart | $19/mo | $190/yr |
   | Transform | $49/mo | $490/yr |
   | Peak Performance | $99/mo | $990/yr |
   - For each price, set **Recurring**, and under the price add a **free trial** of 7 days.
4. For each price, click **Create payment link** → copy the link (looks like `https://buy.stripe.com/xxxx`).
5. Paste all the links back to me (tell me which link is which plan + cycle).

### What to actually send me
Just the public links, labelled. Example:
```
$20 Pack:              https://buy.stripe.com/aaa111
Pro Trader monthly:    https://buy.stripe.com/bbb222
Pro Trader annual:     https://buy.stripe.com/ccc333
```
Those `buy.stripe.com` links are **safe to share** — they're meant to be public on your site.

## Part 2 — I do this
- Replace the demo checkout so each "Start free trial" button opens the correct Stripe link.
- Keep the annual/monthly toggle pointing at the right link.
- Push it live. Done — you're taking real payments.

## Later upgrades (optional, when you're bigger)
- **Automatic access control** (unlock paid features only for paying members) needs a small serverless
  function + Stripe webhook. Worth doing once you have paying customers; I can build it then.
- **Razorpay** instead of Stripe if most customers are in India — same idea, tell me and I'll adapt.

> Safety note: I will never ask for your card number, bank details, or Stripe secret key. You enter those
> only inside Stripe's own dashboard. I only ever need the public `buy.stripe.com` payment links.
