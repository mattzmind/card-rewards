"""Builds catalog.json — the Card Maximizer card catalog.

Phase 1, batch 1 (22 cards), researched 2026-09-29 from each issuer's
official product page unless `source.note` says otherwise.

Rates are percent for cash cards and points/miles per dollar for points
cards (valued at `cpp` cents each when ranking).
"""
import json, pathlib

CHECKED = "2026-09-29"

def src(url, note=None):
    s = {"url": url, "checked": CHECKED}
    if note: s["note"] = note
    return s

R = lambda cats, rate, label, cond=None, note=None, excl=None: {k: v for k, v in dict(cats=cats, rate=rate, label=label, cond=cond, note=note, excl=excl).items() if v is not None}
O = lambda id, label, cats: {"id": id, "label": label, "cats": cats}

brands = {
    "amex":     {"name": "American Express", "short": "Amex",            "mono": "AX", "colors": ["#2563eb", "#1e3a8a"]},
    "boa":      {"name": "Bank of America",  "short": "Bank of America", "mono": "BA", "colors": ["#e11d48", "#1e3a8a"]},
    "capone":   {"name": "Capital One",      "short": "Capital One",     "mono": "C1", "colors": ["#0f4c81", "#9a3412"]},
    "chase":    {"name": "Chase",            "short": "Chase",           "mono": "CH", "colors": ["#1d4ed8", "#172554"]},
    "citi":     {"name": "Citi",             "short": "Citi",            "mono": "CI", "colors": ["#0ea5e9", "#075985"]},
    "discover": {"name": "Discover",         "short": "Discover",        "mono": "DI", "colors": ["#f97316", "#9a3412"], "note": "Owned by Capital One"},
    "usbank":   {"name": "U.S. Bank",        "short": "U.S. Bank",       "mono": "US", "colors": ["#dc2626", "#1e3a8a"]},
    "wells":    {"name": "Wells Fargo",      "short": "Wells Fargo",     "mono": "WF", "colors": ["#dc2626", "#a16207"]},
    "apple":    {"name": "Apple",            "short": "Apple",           "mono": "AP", "colors": ["#e5e7eb", "#6b7280"]},
    "ollo":     {"name": "Ollo",             "short": "Ollo",            "mono": "OL", "colors": ["#7c3aed", "#4c1d95"], "note": "Formerly Ally credit cards; issued by Merrick Bank"},
}

CAPONE_NETS = ["visa", "mastercard", "discover"]

products = {
  # ── American Express ─────────────────────────────────────
  "amex_blue_cash_preferred": {
    "brand": "amex", "name": "Blue Cash Preferred", "short": "Amex Blue Cash", "network": "amex",
    "fee": 95, "feeNote": "$0 intro annual fee the first year", "type": "cash", "base": 1,
    "rules": [
      R(["grocery"], 6, "U.S. supermarkets", note="Up to $6,000/yr, then 1%"),
      R(["streaming"], 6, "Select U.S. streaming"),
      R(["transit"], 3, "Transit", note="Taxis, rideshare, parking, tolls, trains, buses"),
      R(["gas"], 3, "U.S. gas stations")],
    "perks": ["Up to $10/month Disney streaming credit", "2.7% foreign transaction fee"],
    "source": src("https://www.americanexpress.com/us/credit-cards/card/blue-cash-preferred/")},
  "amex_blue_cash_everyday": {
    "brand": "amex", "name": "Blue Cash Everyday", "short": "Amex BCE", "network": "amex",
    "fee": 0, "type": "cash", "base": 1,
    "rules": [
      R(["grocery"], 3, "U.S. supermarkets", note="Up to $6,000/yr, then 1%"),
      R(["online"], 3, "U.S. online retail", note="Up to $6,000/yr, then 1%"),
      R(["gas"], 3, "U.S. gas stations", note="Up to $6,000/yr, then 1%")],
    "perks": ["Up to $7/month Disney streaming credit", "2.7% foreign transaction fee"],
    "source": src("https://www.americanexpress.com/us/credit-cards/card/blue-cash-everyday/")},
  "amex_gold": {
    "brand": "amex", "name": "Gold Card", "short": "Amex Gold", "network": "amex",
    "fee": 325, "type": "points", "cpp": 1, "base": 1,
    "rules": [
      R(["dining"], 4, "Restaurants worldwide", note="Up to $50,000/yr, then 1x"),
      R(["grocery"], 4, "U.S. supermarkets", note="Up to $25,000/yr, then 1x"),
      R(["travel"], 5, "Prepaid hotels", cond="Only when booked through Amex Travel"),
      R(["travel"], 3, "Flights", cond="Booked with the airline or through Amex Travel")],
    "perks": ["2x on prepaid car rentals and cruises through Amex Travel"],
    "source": src("https://www.americanexpress.com/us/credit-cards/card/gold-card/")},

  # ── Chase ────────────────────────────────────────────────
  "chase_freedom_unlimited": {
    "brand": "chase", "name": "Freedom Unlimited", "short": "Chase Freedom", "network": "visa",
    "fee": 0, "type": "cash", "base": 1.5,
    "rules": [
      R(["travel"], 5, "Chase Travel", cond="Only when booked through Chase Travel"),
      R(["dining"], 3, "Dining, takeout & delivery"),
      R(["drugstore"], 3, "Drugstores"),
      R(["transit"], 2, "Lyft", cond="Lyft rides only, through Sep 30, 2027")],
    "perks": [],
    "source": src("https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited")},
  "chase_freedom_flex": {
    "brand": "chase", "name": "Freedom Flex", "short": "Chase Freedom Flex", "network": "mastercard",
    "fee": 0, "type": "cash", "base": 1,
    "rules": [
      R(["travel"], 5, "Chase Travel", cond="Only when booked through Chase Travel"),
      R(["dining"], 3, "Dining, takeout & delivery"),
      R(["drugstore"], 3, "Drugstores")],
    "rotating": {
      "rate": 5, "cap": "Up to $1,500/quarter combined, then 1%",
      "retroactive": True, "deadlineDay": 14,
      "activateHint": "Activation opens around the 15th of the month before each quarter. Activate by the 14th of the quarter's last month; it counts back to the start of the quarter.",
      "schedule": {
        "2026-Q1": {"cats": ["dining"], "label": "Restaurants"},
        "2026-Q2": {"cats": ["amazon", "wholefoods"], "label": "Amazon, Whole Foods & Chase Travel"},
        "2026-Q3": {"cats": ["gas", "entertainment", "transit"], "label": "Gas & EV charging, live entertainment, public transit"},
        "2026-Q4": {"cats": ["grocery", "dining"], "label": "Grocery stores (not Walmart or Target) & dining", "opens": "2026-09-15"}}},
    "perks": [],
    "source": src("https://creditcards.chase.com/cash-back-credit-cards/freedom/flex",
                  "2026 calendar from NerdWallet's Chase Freedom calendar; Q4 confirmed on Chase's page. Network confirm on your card.")},
  "chase_sapphire_preferred": {
    "brand": "chase", "name": "Sapphire Preferred", "short": "Chase Sapphire", "network": "visa",
    "fee": 95, "type": "points", "cpp": 1, "base": 1,
    "rules": [
      R(["travel"], 5, "Chase Travel", cond="Only when booked through Chase Travel"),
      R(["travel"], 2, "Other travel"),
      R(["dining"], 3, "Dining, takeout & delivery"),
      R(["gas"], 3, "Gas stations & EV charging"),
      R(["streaming"], 3, "Top streaming services"),
      R(["grocery"], 3, "Online grocery", cond="Online orders only; not Target, Walmart or warehouse clubs")],
    "perks": ["3x on select vacation home brands", "5x on Lyft through Sep 30, 2027"],
    "source": src("https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred")},
  "chase_prime_visa": {
    "brand": "chase", "name": "Prime Visa", "short": "Prime Visa", "network": "visa",
    "fee": 0, "type": "cash", "base": 1,
    "rules": [
      R(["amazon", "wholefoods"], 5, "Amazon, Audible & Whole Foods", note="Needs a Prime membership, otherwise 3%"),
      R(["travel"], 5, "Chase Travel", cond="Only when booked through Chase Travel"),
      R(["gas"], 2, "Gas stations"),
      R(["dining"], 2, "Restaurants"),
      R(["transit"], 2, "Local transit & rideshare")],
    "perks": ["Requires an eligible Amazon Prime membership for 5%"],
    "source": src("https://creditcards.chase.com/cash-back-credit-cards/amazon-prime-rewards")},

  # ── Citi ─────────────────────────────────────────────────
  "citi_double_cash": {
    "brand": "citi", "name": "Double Cash", "short": "Citi Double Cash", "network": "mastercard",
    "fee": 0, "type": "cash", "base": 2, "baseLabel": "1% when you buy + 1% when you pay",
    "rules": [R(["travel"], 5, "Citi Travel", cond="Hotels, car rentals & attractions through Citi Travel")],
    "perks": ["Pay at least the minimum on time to earn"],
    "source": src("https://www.citi.com/credit-cards/citi-double-cash-credit-card")},
  "citi_strata": {
    "brand": "citi", "name": "Strata", "short": "Citi Strata", "network": "mastercard",
    "fee": 0, "type": "points", "cpp": 1, "base": 1,
    "rules": [
      R(["travel"], 5, "Citi Travel", cond="Hotels, car rentals & attractions through Citi Travel"),
      R(["grocery"], 3, "Supermarkets"),
      R(["gas"], 3, "Gas & EV charging"),
      R(["transit"], 3, "Select transit"),
      R(["dining"], 2, "Restaurants")],
    "choice": [{
      "id": "select", "rate": 3, "pick": 1, "period": "persistent", "default": "streaming",
      "label": "Your 3x pick", "note": "Starts as streaming. Can change once per quarter.",
      "options": [O("streaming", "Streaming", ["streaming"]), O("fitness", "Fitness clubs", ["fitness"]),
                  O("entertainment", "Live entertainment", ["entertainment"]),
                  O("beauty", "Salons & cosmetics", ["beauty"]), O("pets", "Pet supplies", ["pets"])]}],
    "perks": [],
    "source": src("https://www.citi.com/credit-cards/citi-strata-credit-card")},
  "citi_custom_cash": {
    "brand": "citi", "name": "Custom Cash", "short": "Citi Custom Cash", "network": "mastercard",
    "fee": 0, "type": "cash", "base": 1, "status": "closed",
    "auto": {"rate": 5, "note": "Up to $500 per billing cycle, then 1%",
             "options": ["grocery", "dining", "gas", "streaming", "drugstore", "home", "fitness", "travel", "transit", "entertainment"]},
    "perks": ["5% goes automatically to your top eligible category each billing cycle",
              "Closed to new applicants since May 28, 2026; existing cards keep their rewards"],
    "source": src("https://www.nerdwallet.com/credit-cards/news/citi-custom-cash-closed-to-new-applications",
                  "Citi's page no longer lists terms because the card closed to new applicants")},
  "citi_costco": {
    "brand": "citi", "name": "Costco Anywhere Visa", "short": "Costco Visa", "network": "visa",
    "fee": 0, "feeNote": "Requires a paid Costco membership", "type": "cash", "base": 1,
    "rules": [
      R(["costco_gas"], 5, "Gas at Costco", note="5% + 4% gas share $7,000/yr, then 1%"),
      R(["gas"], 4, "Other gas & EV charging", note="5% + 4% gas share $7,000/yr, then 1%", excl=["costco_gas"]),
      R(["dining"], 3, "Restaurants"),
      R(["travel"], 3, "Travel, including Costco Travel"),
      R(["costco"], 2, "Costco & Costco.com")],
    "perks": ["Cash back comes once a year as a certificate redeemable at Costco"],
    "source": src("https://www.citi.com/credit-cards/citi-costco-anywhere-visa-credit-card")},

  # ── Capital One / Discover ───────────────────────────────
  "capone_venture": {
    "brand": "capone", "name": "Venture", "short": "Capital One Venture", "network": "visa", "networkOptions": CAPONE_NETS,
    "fee": 95, "type": "miles", "cpp": 1, "base": 2,
    "rules": [
      R(["travel"], 5, "Capital One Travel", cond="Hotels, vacation rentals & rental cars through Capital One Travel"),
      R(["entertainment"], 5, "Capital One Entertainment", cond="Tickets bought through Capital One Entertainment")],
    "perks": [],
    "source": src("https://www.capitalone.com/credit-cards/venture/", "Capital One now issues on Visa, Mastercard or Discover; check your card")},
  "capone_savor": {
    "brand": "capone", "name": "Savor", "short": "Capital One Savor", "network": "mastercard", "networkOptions": CAPONE_NETS,
    "fee": 0, "type": "cash", "base": 1,
    "rules": [
      R(["dining"], 3, "Dining"),
      R(["grocery"], 3, "Grocery stores", note="Not superstores like Walmart and Target"),
      R(["entertainment"], 3, "Entertainment"),
      R(["streaming"], 3, "Popular streaming"),
      R(["travel"], 5, "Capital One Travel", cond="Hotels, vacation rentals & rental cars through Capital One Travel")],
    "perks": [],
    "source": src("https://www.capitalone.com/credit-cards/savor/", "Capital One now issues on Visa, Mastercard or Discover; check your card")},
  "capone_quicksilver": {
    "brand": "capone", "name": "Quicksilver", "short": "Quicksilver", "network": "mastercard", "networkOptions": CAPONE_NETS,
    "fee": 0, "type": "cash", "base": 1.5, "perks": [],
    "source": src("https://www.capitalone.com/credit-cards/quicksilver/", "Some Quicksilver cards now run on Discover; check your card")},
  "discover_it_cash_back": {
    "brand": "discover", "name": "it Cash Back", "short": "Discover", "network": "discover",
    "fee": 0, "type": "cash", "base": 1,
    "rotating": {
      "rate": 5, "cap": "Up to $1,500/quarter combined, then 1%", "retroactive": False,
      "activateHint": "Activate in the Discover or Capital One app. Not retroactive, so activate before you spend.",
      "schedule": {
        "2026-Q1": {"cats": ["grocery", "costco", "streaming"], "label": "Grocery, wholesale clubs & select streaming"},
        "2026-Q2": {"cats": ["dining", "home"], "label": "Restaurants & home improvement"},
        "2026-Q3": {"cats": ["gas", "transit", "drugstore"], "label": "Gas & EV charging, airlines & public transit, drugstores"},
        "2026-Q4": {"cats": ["dining", "entertainment", "utilities"], "label": "Restaurants, entertainment & utilities", "opens": "2026-09-01"}}},
    "perks": ["New cardholders: all cash back matched at the end of year one",
              "Accounts are moving to Capital One; rewards stay the same"],
    "source": src("https://www.discover.com/credit-cards/cash-back/it-card.html",
                  "2026 calendar from The Points Guy (Discover's calendar page was down)")},

  # ── Bank of America ──────────────────────────────────────
  "boa_customized_cash": {
    "brand": "boa", "name": "Customized Cash Rewards", "short": "BOA", "network": "visa",
    "fee": 0, "type": "cash", "base": 1,
    "rules": [R(["grocery", "costco"], 2, "Grocery stores & wholesale clubs", note="Shares the $2,500/quarter cap with your 3% choice")],
    "choice": [{
      "id": "choice", "rate": 3, "pick": 1, "period": "persistent",
      "label": "Your 3% choice", "note": "$2,500/quarter shared cap. Can change once a month.",
      "options": [O("gas", "Gas & EV charging", ["gas"]),
                  O("online", "Online shopping, phone, internet & streaming", ["online", "amazon", "phone", "streaming"]),
                  O("dining", "Dining", ["dining"]), O("travel", "Travel", ["travel"]),
                  O("drugstore", "Drugstores", ["drugstore"]),
                  O("home", "Home improvement & furniture", ["home", "furniture"])]}],
    "perks": ["New cardholders earn 6% in the choice category the first year"],
    "source": src("https://www.bankofamerica.com/credit-cards/products/cash-back-credit-card/")},

  # ── Wells Fargo ──────────────────────────────────────────
  "wells_autograph": {
    "brand": "wells", "name": "Autograph", "short": "Wells Autograph", "network": "visa",
    "fee": 0, "type": "points", "cpp": 1, "base": 1,
    "rules": [
      R(["dining"], 3, "Restaurants"), R(["travel"], 3, "Travel"),
      R(["gas"], 3, "Gas stations"), R(["transit"], 3, "Transit"),
      R(["streaming"], 3, "Streaming"), R(["phone"], 3, "Phone plans")],
    "perks": ["No foreign transaction fees"],
    "source": src("https://creditcards.wellsfargo.com/autograph-visa-credit-card/")},
  "wells_active_cash": {
    "brand": "wells", "name": "Active Cash", "short": "Wells Active Cash", "network": "visa",
    "fee": 0, "type": "cash", "base": 2, "perks": ["3% foreign transaction fee"],
    "source": src("https://creditcards.wellsfargo.com/active-cash-credit-card/")},

  # ── U.S. Bank ────────────────────────────────────────────
  "usbank_cash_plus": {
    "brand": "usbank", "name": "Cash+", "short": "US Bank Cash+", "network": "visa",
    "fee": 0, "type": "cash", "base": 1,
    "rules": [R(["travel"], 5, "U.S. Bank Travel Center", cond="Prepaid travel booked in the Travel Center")],
    "choice": [
      {"id": "five", "rate": 5, "pick": 2, "period": "quarter", "label": "Your 5% picks", "note": "Up to $2,000/quarter combined",
       "options": [O("fast_food", "Fast food", ["fast_food"]), O("department", "Department stores", ["department"]),
                   O("phone", "Cell phone", ["phone"]), O("utilities", "Home utilities", ["utilities"]),
                   O("streaming", "TV, internet & streaming", ["streaming"]), O("transit", "Ground transportation", ["transit"]),
                   O("fitness", "Gyms & fitness", ["fitness"]), O("movies", "Movie theaters", ["entertainment"]),
                   O("electronics", "Electronics stores", ["electronics"]), O("furniture", "Furniture stores", ["furniture"]),
                   O("clothing", "Select clothing stores", ["clothing"]), O("sporting", "Sporting goods", ["sporting"])]},
      {"id": "two", "rate": 2, "pick": 1, "period": "quarter", "label": "Your 2% pick", "note": "No cap. Gas and grocery exclude superstores and warehouse clubs.",
       "options": [O("gas", "Gas & EV charging", ["gas"]), O("grocery", "Grocery stores", ["grocery"]), O("dining", "Restaurants", ["dining"])]}],
    "perks": ["Choose your 5% and 2% categories every quarter, or everything earns 1%"],
    "source": src("https://www.usbank.com/credit-cards/cash-plus-visa-signature-credit-card.html")},
  "usbank_altitude_go": {
    "brand": "usbank", "name": "Altitude Go", "short": "US Bank Alt Go", "network": "visa",
    "fee": 0, "type": "points", "cpp": 1, "base": 1,
    "rules": [
      R(["dining"], 4, "Dining, takeout & delivery", note="Up to $2,000/quarter, then 1x"),
      R(["grocery"], 2, "Grocery stores", note="Not discount stores, supercenters or warehouse clubs"),
      R(["gas"], 2, "Gas & EV charging", note="Not warehouse clubs or supercenters", excl=["costco_gas"]),
      R(["streaming"], 2, "Streaming")],
    "perks": [],
    "source": src("https://www.usbank.com/credit-cards/altitude-go-visa-signature-credit-card.html")},

  # ── Others ───────────────────────────────────────────────
  "apple_card": {
    "brand": "apple", "name": "Apple Card", "short": "Apple Card", "network": "mastercard",
    "fee": 0, "type": "cash", "base": 2, "baseLabel": "Paying with Apple Pay (1% with the physical card)",
    "baseExcept": {"cats": ["walmart"], "rate": 1, "label": "Physical card (Walmart doesn't take Apple Pay)"},
    "perks": ["3% at Apple and select merchants with Apple Pay (Walgreens, Exxon Mobil, Uber, Nike and others)",
              "Walmart and Costco don't take Apple Pay, so it earns 1% there",
              "No fees of any kind, including foreign transaction"],
    "source": src("https://www.apple.com/apple-card/")},
  "ollo_everyday_rewards": {
    "brand": "ollo", "name": "Everyday Rewards", "short": "Ollo", "network": "mastercard",
    "fee": 0, "feeNote": "$0 to $39 depending on credit", "type": "cash", "base": 1,
    "rules": [
      R(["gas"], 3, "Gas & EV charging"),
      R(["grocery"], 3, "Grocery stores"),
      R(["drugstore"], 3, "Drugstores")],
    "perks": ["Ally credit cards moved to Ollo (Merrick Bank) in April 2026"],
    "source": src("https://www.nerdwallet.com/credit-cards/learn/ollo-card",
                  "Ollo's own page requires JavaScript; rates from NerdWallet. Confirm your former Ally card earns the same.")},
}

# ════════════════ Batch 2 (2026-09-29): rest of Chase, Amex, Citi, Capital One ════════════════
# cpp = cents per point used for ranking. Transferable bank points stay at 1¢ (cash value);
# airline & hotel currencies use conservative estimates so they don't outrank cash back unfairly.
CH = "https://creditcards.chase.com"
AX = "https://www.americanexpress.com/us/credit-cards/card"
CT = "https://www.citi.com/credit-cards"
CO = "https://www.capitalone.com/credit-cards"
products.update({
  # ── Chase ──
  "chase_sapphire_reserve": {
    "brand": "chase", "name": "Sapphire Reserve", "short": "Sapphire Reserve", "network": "visa",
    "fee": 795, "type": "points", "cpp": 1, "base": 1,
    "rules": [R(["travel"], 8, "Chase Travel", cond="Only when booked through Chase Travel"),
              R(["travel"], 4, "Flights & hotels booked direct", cond="Booked directly with the airline or hotel"),
              R(["dining"], 3, "Dining worldwide")],
    "perks": ["5x on Lyft through Sep 30, 2027", "Purchases covered by the card's credits don't earn points"],
    "source": src(CH + "/rewards-credit-cards/sapphire/reserve")},
  "chase_freedom_rise": {
    "brand": "chase", "name": "Freedom Rise", "short": "Freedom Rise", "network": "visa",
    "fee": 0, "type": "cash", "base": 1.5,
    "rules": [R(["transit"], 2, "Lyft", cond="Lyft rides only, through Sep 30, 2027")],
    "perks": ["Built for new credit; $25 credit for setting up autopay"],
    "source": src(CH + "/cash-back-credit-cards/freedom/rise")},
  "chase_amazon_visa": {
    "brand": "chase", "name": "Amazon Visa", "short": "Amazon Visa", "network": "visa",
    "fee": 0, "type": "cash", "base": 1,
    "rules": [R(["amazon", "wholefoods"], 3, "Amazon, Audible & Whole Foods"),
              R(["travel"], 3, "Chase Travel", cond="Only when booked through Chase Travel"),
              R(["gas"], 2, "Gas stations"), R(["dining"], 2, "Restaurants"), R(["transit"], 2, "Local transit & rideshare")],
    "perks": ["No Prime membership needed (Prime Visa earns 5% with Prime)"],
    "source": src(CH + "/cash-back-credit-cards/amazon-rewards")},
  "chase_united_explorer": {
    "brand": "chase", "name": "United Explorer", "short": "United Explorer", "network": "visa",
    "fee": 150, "feeNote": "$0 the first year, then $150", "type": "miles", "cpp": 1.2, "base": 1,
    "rules": [R(["travel"], 3, "United purchases", cond="United flights & purchases only (6x more on your own fare)"),
              R(["travel"], 2, "Hotels", cond="Booked directly with the hotel"),
              R(["dining"], 2, "Dining & delivery")],
    "perks": ["Miles valued at 1.2¢ for ranking", "10,000-mile award discount after $20,000 spend a year"],
    "source": src(CH + "/travel-credit-cards/united/united-explorer")},
  "chase_united_quest": {
    "brand": "chase", "name": "United Quest", "short": "United Quest", "network": "visa",
    "fee": 350, "type": "miles", "cpp": 1.2, "base": 1,
    "rules": [R(["travel"], 4, "United purchases", cond="United flights & purchases only (6x more on your own fare)"),
              R(["travel", "transit"], 2, "Travel & transit", note="Airfare, hotels, rental cars, rideshare, tolls"),
              R(["dining"], 2, "Dining & delivery"), R(["streaming"], 2, "Select streaming")],
    "perks": ["Miles valued at 1.2¢ for ranking"],
    "source": src(CH + "/travel-credit-cards/united/united-quest")},
  "chase_southwest_plus": {
    "brand": "chase", "name": "Southwest Rapid Rewards Plus", "short": "Southwest Plus", "network": "visa",
    "fee": 99, "type": "points", "cpp": 1.3, "base": 1,
    "rules": [R(["travel"], 2, "Southwest purchases", cond="Southwest flights & Getaways only"),
              R(["gas", "grocery"], 2, "Gas & grocery", note="First $5,000/yr combined, then 1x")],
    "perks": ["Points valued at 1.3¢ for ranking", "3,000 bonus points each anniversary"],
    "source": src(CH + "/travel-credit-cards/southwest/plus")},
  "chase_southwest_priority": {
    "brand": "chase", "name": "Southwest Rapid Rewards Priority", "short": "Southwest Priority", "network": "visa",
    "fee": 229, "type": "points", "cpp": 1.3, "base": 1,
    "rules": [R(["travel"], 4, "Southwest purchases", cond="Southwest flights & Getaways only"),
              R(["gas"], 2, "Gas stations"), R(["dining"], 2, "Restaurants")],
    "perks": ["Points valued at 1.3¢ for ranking", "7,500 bonus points each anniversary"],
    "source": src(CH + "/travel-credit-cards/southwest/priority")},
  "chase_marriott_boundless": {
    "brand": "chase", "name": "Marriott Bonvoy Boundless", "short": "Marriott Boundless", "network": "visa",
    "fee": 95, "type": "points", "cpp": 0.7, "base": 2,
    "rules": [R(["travel"], 6, "Marriott hotels", cond="Marriott Bonvoy hotels only"),
              R(["gas", "grocery", "dining"], 3, "Gas, grocery & dining", note="First $6,000/yr combined, then 2x")],
    "perks": ["Points valued at 0.7¢ for ranking", "Free night award each anniversary"],
    "source": src(CH + "/travel-credit-cards/marriott-bonvoy/boundless")},
  "chase_ihg_premier": {
    "brand": "chase", "name": "IHG One Rewards Premier", "short": "IHG Premier", "network": "mastercard",
    "fee": 99, "type": "points", "cpp": 0.5, "base": 3,
    "rules": [R(["travel"], 10, "IHG hotels", cond="IHG hotels booked direct only"),
              R(["travel"], 5, "Other travel"), R(["dining"], 5, "Dining"), R(["gas"], 5, "Gas stations")],
    "perks": ["Points valued at 0.5¢ for ranking", "$100 credit + 10,000 points after $20,000 spend a year"],
    "source": src(CH + "/travel-credit-cards/ihg-rewards-club/premier")},
  "chase_world_of_hyatt": {
    "brand": "chase", "name": "World of Hyatt", "short": "World of Hyatt", "network": "visa",
    "fee": 95, "type": "points", "cpp": 1.5, "base": 1,
    "rules": [R(["travel"], 4, "Hyatt hotels", cond="Hyatt hotels only"),
              R(["travel"], 2, "Airline tickets", cond="Bought directly from the airline"),
              R(["dining"], 2, "Restaurants"), R(["transit"], 2, "Local transit & commuting"),
              R(["fitness"], 2, "Gyms & fitness clubs")],
    "perks": ["Points valued at 1.5¢ for ranking", "No foreign transaction fees"],
    "source": src(CH + "/travel-credit-cards/world-of-hyatt-credit-card")},
  "chase_disney_premier": {
    "brand": "chase", "name": "Disney Premier Visa", "short": "Disney Premier", "network": "visa",
    "fee": 49, "type": "cash", "base": 1,
    "rules": [R(["streaming"], 5, "Disney+, Hulu & ESPN", cond="Bought directly at DisneyPlus.com, Hulu.com or ESPN"),
              R(["gas"], 2, "Gas stations"), R(["grocery"], 2, "Grocery stores"), R(["dining"], 2, "Restaurants")],
    "perks": ["Earns Disney Rewards Dollars (1 dollar = $1 at Disney)", "2% at Disney locations in the U.S."],
    "source": src(CH + "/rewards-credit-cards/disney/premier")},
  "chase_ink_cash": {
    "brand": "chase", "name": "Ink Business Cash", "short": "Ink Cash", "network": "visa", "business": True,
    "fee": 0, "type": "cash", "base": 1,
    "rules": [R(["office", "utilities", "phone"], 5, "Office supplies, internet, cable & phone", note="First $25,000/yr combined, then 1%"),
              R(["gas", "dining"], 2, "Gas & restaurants", note="First $25,000/yr combined, then 1%"),
              R(["transit"], 5, "Lyft", cond="Lyft rides only, through Sep 30, 2027")],
    "perks": ["Business card"],
    "source": src(CH + "/business-credit-cards/ink/cash")},
  "chase_ink_unlimited": {
    "brand": "chase", "name": "Ink Business Unlimited", "short": "Ink Unlimited", "network": "visa", "business": True,
    "fee": 0, "type": "cash", "base": 1.5,
    "rules": [R(["transit"], 5, "Lyft", cond="Lyft rides only, through Sep 30, 2027")],
    "perks": ["Business card"],
    "source": src(CH + "/business-credit-cards/ink/unlimited")},
  "chase_ink_preferred": {
    "brand": "chase", "name": "Ink Business Preferred", "short": "Ink Preferred", "network": "visa", "business": True,
    "fee": 95, "type": "points", "cpp": 1, "base": 1,
    "rules": [R(["travel", "utilities", "phone"], 3, "Travel, internet, cable & phone", note="Plus shipping & ads. First $150,000/yr combined, then 1x"),
              R(["transit"], 5, "Lyft", cond="Lyft rides only, through Sep 30, 2027")],
    "perks": ["Business card", "No foreign transaction fees"],
    "source": src(CH + "/business-credit-cards/ink/business-preferred")},

  # ── American Express ──
  "amex_platinum": {
    "brand": "amex", "name": "Platinum Card", "short": "Amex Platinum", "network": "amex",
    "fee": 895, "type": "points", "cpp": 1, "base": 1,
    "rules": [R(["travel"], 5, "Flights & prepaid hotels", cond="Flights direct with the airline or Amex Travel; hotels prepaid on Amex Travel")],
    "perks": ["5x on flights capped at $500,000/yr"],
    "source": src(AX + "/platinum/")},
  "amex_green": {
    "brand": "amex", "name": "Green Card", "short": "Amex Green", "network": "amex",
    "fee": 150, "type": "points", "cpp": 1, "base": 1, "status": "closed",
    "rules": [R(["travel", "transit"], 3, "Travel & transit", note="Flights, hotels, rideshare, trains, tolls, parking"),
              R(["dining"], 3, "Restaurants worldwide")],
    "perks": ["Closed to new applicants since July 2026; existing cards keep their rewards"],
    "source": src("https://www.nerdwallet.com/credit-cards/reviews/american-express-green", "Amex's page didn't load; rates from NerdWallet")},
  "amex_delta_gold": {
    "brand": "amex", "name": "Delta SkyMiles Gold", "short": "Delta Gold", "network": "amex",
    "fee": 150, "feeNote": "$0 the first year, then $150", "type": "miles", "cpp": 1.1, "base": 1,
    "rules": [R(["travel"], 2, "Delta purchases", cond="Bought directly from Delta"),
              R(["dining"], 2, "U.S. restaurants"), R(["grocery"], 2, "U.S. supermarkets")],
    "perks": ["Miles valued at 1.1¢ for ranking"],
    "source": src(AX + "/delta-skymiles-gold-american-express-card/")},
  "amex_delta_platinum": {
    "brand": "amex", "name": "Delta SkyMiles Platinum", "short": "Delta Platinum", "network": "amex",
    "fee": 350, "type": "miles", "cpp": 1.1, "base": 1,
    "rules": [R(["travel"], 3, "Delta & hotels", cond="Bought directly from Delta or the hotel"),
              R(["dining"], 2, "U.S. restaurants"), R(["grocery"], 2, "U.S. supermarkets")],
    "perks": ["Miles valued at 1.1¢ for ranking"],
    "source": src(AX + "/delta-skymiles-platinum-american-express-card/")},
  "amex_delta_reserve": {
    "brand": "amex", "name": "Delta SkyMiles Reserve", "short": "Delta Reserve", "network": "amex",
    "fee": 650, "type": "miles", "cpp": 1.1, "base": 1,
    "rules": [R(["travel"], 3, "Delta purchases", cond="Bought directly from Delta")],
    "perks": ["Miles valued at 1.1¢ for ranking", "$1 MQD for every $10 spent"],
    "source": src(AX + "/delta-skymiles-reserve-american-express-card/")},
  "amex_hilton": {
    "brand": "amex", "name": "Hilton Honors", "short": "Hilton Honors", "network": "amex",
    "fee": 0, "type": "points", "cpp": 0.5, "base": 3,
    "rules": [R(["travel"], 7, "Hilton hotels", cond="Booked directly with Hilton hotels"),
              R(["dining"], 5, "U.S. restaurants"), R(["grocery"], 5, "U.S. supermarkets"), R(["gas"], 5, "U.S. gas stations")],
    "perks": ["Points valued at 0.5¢ for ranking"],
    "source": src(AX + "/hilton-honors/")},
  "amex_hilton_surpass": {
    "brand": "amex", "name": "Hilton Honors Surpass", "short": "Hilton Surpass", "network": "amex",
    "fee": 150, "feeNote": "$0 the first year, then $150", "type": "points", "cpp": 0.5, "base": 3,
    "rules": [R(["travel"], 12, "Hilton hotels", cond="Booked directly with Hilton hotels"),
              R(["dining"], 6, "U.S. restaurants"), R(["grocery"], 6, "U.S. supermarkets"), R(["gas"], 6, "U.S. gas stations"),
              R(["online"], 4, "U.S. online retail")],
    "perks": ["Points valued at 0.5¢ for ranking", "Free night after $15,000 spend a year"],
    "source": src(AX + "/hilton-honors-surpass/")},
  "amex_hilton_aspire": {
    "brand": "amex", "name": "Hilton Honors Aspire", "short": "Hilton Aspire", "network": "amex",
    "fee": 550, "type": "points", "cpp": 0.5, "base": 3,
    "rules": [R(["travel"], 14, "Hilton hotels", cond="Booked directly with Hilton hotels"),
              R(["travel"], 7, "Select travel", cond="Flights direct or on Amex Travel; select car rentals"),
              R(["dining"], 7, "U.S. restaurants")],
    "perks": ["Points valued at 0.5¢ for ranking"],
    "source": src(AX + "/hilton-honors-aspire/")},
  "amex_marriott_brilliant": {
    "brand": "amex", "name": "Marriott Bonvoy Brilliant", "short": "Marriott Brilliant", "network": "amex",
    "fee": 650, "type": "points", "cpp": 0.7, "base": 2,
    "rules": [R(["travel"], 6, "Marriott hotels", cond="Marriott Bonvoy hotels only"),
              R(["travel"], 3, "Flights", cond="Booked directly with the airline"),
              R(["dining"], 3, "Restaurants worldwide")],
    "perks": ["Points valued at 0.7¢ for ranking"],
    "source": src(AX + "/marriott-bonvoy-brilliant/")},
  "amex_marriott_bevy": {
    "brand": "amex", "name": "Marriott Bonvoy Bevy", "short": "Marriott Bevy", "network": "amex",
    "fee": 250, "type": "points", "cpp": 0.7, "base": 2,
    "rules": [R(["travel"], 6, "Marriott hotels", cond="Marriott Bonvoy hotels only"),
              R(["dining", "grocery"], 4, "Restaurants & U.S. supermarkets", note="First $15,000/yr combined, then 2x")],
    "perks": ["Points valued at 0.7¢ for ranking", "Free night after $15,000 spend a year"],
    "source": src(AX + "/marriott-bonvoy-bevy/")},
  "amex_blue_business_plus": {
    "brand": "amex", "name": "Blue Business Plus", "short": "Blue Business Plus", "network": "amex", "business": True,
    "fee": 0, "type": "points", "cpp": 1, "base": 2, "baseLabel": "Everything (first $50,000/yr, then 1x)",
    "perks": ["Business card"],
    "source": src("https://www.nerdwallet.com/business/credit-cards/reviews/amex-blue-business-plus", "Amex's business page moved; rates from NerdWallet")},

  # ── Citi ──
  "citi_strata_premier": {
    "brand": "citi", "name": "Strata Premier", "short": "Strata Premier", "network": "mastercard",
    "fee": 95, "type": "points", "cpp": 1, "base": 1,
    "rules": [R(["travel"], 10, "Citi Travel", cond="Hotels, car rentals & attractions through Citi Travel"),
              R(["travel"], 3, "Air travel & other hotels"),
              R(["dining"], 3, "Restaurants"), R(["grocery"], 3, "Supermarkets"), R(["gas"], 3, "Gas & EV charging")],
    "perks": [],
    "source": src(CT + "/citi-strata-premier-credit-card")},
  "citi_strata_elite": {
    "brand": "citi", "name": "Strata Elite", "short": "Strata Elite", "network": "mastercard",
    "fee": 595, "type": "points", "cpp": 1, "base": 1.5,
    "rules": [R(["travel"], 12, "Citi Travel hotels & cars", cond="Hotels, car rentals & attractions through Citi Travel"),
              R(["travel"], 6, "Citi Travel flights", cond="Flights booked through Citi Travel"),
              R(["dining"], 3, "Restaurants", note="6x Fri & Sat 6 PM–6 AM ET (Citi Nights)")],
    "perks": [],
    "source": src(CT + "/citi-strata-elite-credit-card", "Annual fee from One Mile at a Time; Citi's page didn't show it")},
  "citi_aadvantage_platinum": {
    "brand": "citi", "name": "AAdvantage Platinum Select", "short": "AAdvantage Platinum", "network": "mastercard",
    "fee": 99, "feeNote": "$0 the first year, then $99", "type": "miles", "cpp": 1.3, "base": 1,
    "rules": [R(["travel"], 2, "American Airlines", cond="American Airlines purchases only"),
              R(["dining"], 2, "Restaurants"), R(["gas"], 2, "Gas stations")],
    "perks": ["Miles valued at 1.3¢ for ranking"],
    "source": src(CT + "/citi-aadvantage-platinum-select-world-elite-mastercard")},
  "citi_aadvantage_executive": {
    "brand": "citi", "name": "AAdvantage Executive", "short": "AAdvantage Executive", "network": "mastercard",
    "fee": 695, "type": "miles", "cpp": 1.3, "base": 1,
    "rules": [R(["travel"], 12, "AAdvantage Hotels & Cars", cond="Booked through AAdvantage Hotels or Cars"),
              R(["travel"], 4, "American Airlines", cond="American Airlines purchases only (5x after $150,000/yr)")],
    "perks": ["Miles valued at 1.3¢ for ranking"],
    "source": src(CT + "/citi-aadvantage-executive-world-legend-mastercard", "Annual fee from NerdWallet (raised to $695 in 2026)")},
  "citi_aadvantage_globe": {
    "brand": "citi", "name": "AAdvantage Globe", "short": "AAdvantage Globe", "network": "mastercard",
    "fee": 350, "type": "miles", "cpp": 1.3, "base": 1,
    "rules": [R(["travel"], 6, "AAdvantage Hotels", cond="Booked through AAdvantage Hotels"),
              R(["travel"], 3, "American Airlines", cond="American Airlines purchases only"),
              R(["dining"], 2, "Restaurants"), R(["transit"], 2, "Rides & rails", note="Taxis, rideshare, public transit")],
    "perks": ["Miles valued at 1.3¢ for ranking"],
    "source": src(CT + "/citi-aadvantage-globe-mastercard", "Annual fee from Doctor of Credit")},

  # ── Capital One ──
  "capone_venture_x": {
    "brand": "capone", "name": "Venture X", "short": "Venture X", "network": "visa", "networkOptions": CAPONE_NETS,
    "fee": 395, "type": "miles", "cpp": 1, "base": 2,
    "rules": [R(["travel"], 10, "Capital One Travel hotels & cars", cond="Hotels & rental cars through Capital One Travel"),
              R(["travel"], 5, "Capital One Travel flights", cond="Flights & vacation rentals through Capital One Travel"),
              R(["entertainment"], 5, "Capital One Entertainment", cond="Tickets bought through Capital One Entertainment")],
    "perks": [],
    "source": src(CO + "/venture-x/")},
  "capone_ventureone": {
    "brand": "capone", "name": "VentureOne", "short": "VentureOne", "network": "visa", "networkOptions": CAPONE_NETS,
    "fee": 0, "type": "miles", "cpp": 1, "base": 1.25,
    "rules": [R(["travel"], 5, "Capital One Travel", cond="Hotels, vacation rentals & rental cars through Capital One Travel")],
    "perks": ["No foreign transaction fees"],
    "source": src(CO + "/ventureone/")},
  "capone_quicksilverone": {
    "brand": "capone", "name": "QuicksilverOne", "short": "QuicksilverOne", "network": "mastercard", "networkOptions": CAPONE_NETS,
    "fee": 39, "type": "cash", "base": 1.5, "perks": ["For fair credit"],
    "source": src(CO + "/quicksilverone/")},
  "capone_quicksilver_secured": {
    "brand": "capone", "name": "Quicksilver Secured", "short": "Quicksilver Secured", "network": "mastercard", "networkOptions": CAPONE_NETS,
    "fee": 0, "type": "cash", "base": 1.5, "perks": ["$200 minimum refundable deposit"],
    "source": src(CO + "/quicksilver-secured/")},
  "capone_savor_student": {
    "brand": "capone", "name": "Savor for Students", "short": "Savor Student", "network": "mastercard", "networkOptions": CAPONE_NETS,
    "fee": 0, "type": "cash", "base": 1,
    "rules": [R(["dining"], 3, "Dining"), R(["grocery"], 3, "Grocery stores", note="Not superstores like Walmart and Target"),
              R(["entertainment"], 3, "Entertainment"), R(["streaming"], 3, "Popular streaming")],
    "perks": [],
    "source": src(CO + "/savor-student/")},
})

# ════════════════ Batch 3 (2026-09-29): all remaining brands + popular store cards ════════════════
# storeOnly: card only works at these tiles (store cards). Rules with `cond` show as special cases.
brands.update({
    "barclays":   {"name": "Barclays",                  "short": "Barclays",      "mono": "BC", "colors": ["#0ea5e9", "#0c4a6e"]},
    "bilt":       {"name": "Bilt",                      "short": "Bilt",          "mono": "BI", "colors": ["#18181b", "#52525b"], "note": "Issued by Cardless since Feb 2026"},
    "walmart":    {"name": "Walmart (OnePay)",          "short": "OnePay",        "mono": "WM", "colors": ["#2563eb", "#facc15"], "note": "Issued by Synchrony"},
    "target":     {"name": "Target",                    "short": "Target",        "mono": "TG", "colors": ["#dc2626", "#991b1b"], "note": "Issued by TD Bank"},
    "amazon":     {"name": "Amazon",                    "short": "Amazon",        "mono": "AZ", "colors": ["#f59e0b", "#1f2937"], "note": "Store card by Synchrony. Prime Visa is under Chase."},
    "lowes":      {"name": "Lowe's",                    "short": "Lowe's",        "mono": "LW", "colors": ["#1d4ed8", "#1e3a8a"], "note": "Issued by Synchrony"},
    "bestbuy":    {"name": "Best Buy",                  "short": "Best Buy",      "mono": "BB", "colors": ["#1d4ed8", "#facc15"], "note": "Issued by Citi"},
    "samsclub":   {"name": "Sam's Club",                "short": "Sam's Club",    "mono": "SC", "colors": ["#1d4ed8", "#0c4a6e"], "note": "Issued by Synchrony"},
    "paypal":     {"name": "PayPal",                    "short": "PayPal",        "mono": "PP", "colors": ["#1d4ed8", "#0ea5e9"], "note": "Issued by Synchrony"},
    "venmo":      {"name": "Venmo",                     "short": "Venmo",         "mono": "VE", "colors": ["#0ea5e9", "#0369a1"], "note": "Issued by Synchrony"},
    "verizon":    {"name": "Verizon",                   "short": "Verizon",       "mono": "VZ", "colors": ["#dc2626", "#111827"], "note": "Issued by Synchrony"},
    "navyfederal":{"name": "Navy Federal Credit Union", "short": "Navy Federal",  "mono": "NF", "colors": ["#1e3a8a", "#ca8a04"], "note": "Membership required"},
    "penfed":     {"name": "PenFed Credit Union",       "short": "PenFed",        "mono": "PF", "colors": ["#1e40af", "#0f172a"]},
    "usaa":       {"name": "USAA",                      "short": "USAA",          "mono": "UA", "colors": ["#1e3a8a", "#0f172a"], "note": "Membership required"},
    "fidelity":   {"name": "Fidelity",                  "short": "Fidelity",      "mono": "FI", "colors": ["#15803d", "#14532d"], "note": "Issued by Elan"},
    "robinhood":  {"name": "Robinhood",                 "short": "Robinhood",     "mono": "RH", "colors": ["#ca8a04", "#422006"]},
    "creditone":  {"name": "Credit One Bank",           "short": "Credit One",    "mono": "CO", "colors": ["#1e3a8a", "#0f172a"]},
})
DROT = products["discover_it_cash_back"]["rotating"]
FROT = products["chase_freedom_flex"]["rotating"]
DS = "https://www.discover.com/credit-cards"
BA = "https://www.bankofamerica.com/credit-cards/products"
UB = "https://www.usbank.com/credit-cards"
products.update({
  # ── Chase legacy ──
  "chase_freedom": {
    "brand": "chase", "name": "Freedom (original)", "short": "Chase Freedom (original)", "network": "visa", "status": "closed",
    "fee": 0, "type": "cash", "base": 1, "rotating": FROT,
    "perks": ["No longer offered, but existing cards earn the same quarterly 5% as Freedom Flex"],
    "source": src("https://www.nerdwallet.com/credit-cards/learn/chase-freedom-calendar", "Same quarterly calendar as Freedom Flex")},

  # ── Discover ──
  "discover_it_miles": {
    "brand": "discover", "name": "it Miles", "short": "Discover Miles", "network": "discover",
    "fee": 0, "type": "miles", "cpp": 1, "base": 1.5, "perks": ["New cardholders: all miles matched at the end of year one"],
    "source": src(DS + "/travel/")},
  "discover_it_chrome": {
    "brand": "discover", "name": "it Chrome", "short": "Discover Chrome", "network": "discover",
    "fee": 0, "type": "cash", "base": 1,
    "rules": [R(["gas", "dining"], 2, "Gas stations & restaurants", note="First $1,000/quarter combined, then 1%")],
    "perks": ["New cardholders: all cash back matched at the end of year one"],
    "source": src(DS + "/cash-back/chrome/")},
  "discover_it_student": {
    "brand": "discover", "name": "it Student Cash Back", "short": "Discover Student", "network": "discover",
    "fee": 0, "type": "cash", "base": 1, "rotating": DROT,
    "perks": ["Same quarterly 5% calendar as Discover it Cash Back"],
    "source": src(DS + "/student/it-card.html")},
  "discover_it_secured": {
    "brand": "discover", "name": "it Secured", "short": "Discover Secured", "network": "discover",
    "fee": 0, "type": "cash", "base": 1, "rotating": DROT,
    "perks": ["Refundable deposit from $49", "Same quarterly 5% calendar as Discover it Cash Back"],
    "source": src(DS + "/secured/")},

  # ── Bank of America ──
  "boa_unlimited_cash": {
    "brand": "boa", "name": "Unlimited Cash Rewards", "short": "BofA Unlimited Cash", "network": "visa",
    "fee": 0, "type": "cash", "base": 1.5, "perks": [],
    "source": src(BA + "/unlimited-cash-back-credit-card/")},
  "boa_travel_rewards": {
    "brand": "boa", "name": "Travel Rewards", "short": "BofA Travel Rewards", "network": "visa",
    "fee": 0, "type": "points", "cpp": 1, "base": 1.5, "perks": ["No foreign transaction fees"],
    "source": src(BA + "/travel-rewards-credit-card/")},
  "boa_premium_rewards": {
    "brand": "boa", "name": "Premium Rewards", "short": "BofA Premium Rewards", "network": "visa",
    "fee": 95, "type": "points", "cpp": 1, "base": 1.5,
    "rules": [R(["travel", "transit"], 2, "Travel"), R(["dining"], 2, "Dining")],
    "perks": ["Up to $100 airline incidental credit each year", "No foreign transaction fees"],
    "source": src(BA + "/premium-rewards-credit-card/")},
  "boa_atmos_ascent": {
    "brand": "boa", "name": "Atmos Rewards Ascent", "short": "Alaska Atmos Ascent", "network": "visa",
    "fee": 95, "type": "points", "cpp": 1.3, "base": 1,
    "rules": [R(["travel"], 3, "Alaska & Hawaiian Airlines", cond="Alaska and Hawaiian Airlines purchases only"),
              R(["gas"], 2, "Gas & EV charging"), R(["transit"], 2, "Local transit & rideshare"),
              R(["streaming", "utilities"], 2, "Cable & select streaming")],
    "perks": ["Points valued at 1.3¢ for ranking", "Companion fare after $6,000 spend a year"],
    "source": src("https://onemileatatime.com/guides/atmos-rewards-ascent-visa-card/", "Formerly the Alaska Airlines Visa")},

  # ── Wells Fargo ──
  "wells_autograph_journey": {
    "brand": "wells", "name": "Autograph Journey", "short": "Autograph Journey", "network": "visa",
    "fee": 95, "type": "points", "cpp": 1, "base": 1,
    "rules": [R(["travel"], 5, "Hotels", cond="Hotel and motel purchases"),
              R(["travel"], 4, "Airlines", cond="Airline purchases"),
              R(["travel"], 3, "Other travel"), R(["dining"], 3, "Restaurants")],
    "perks": ["$50 airline credit each year"],
    "source": src("https://creditcards.wellsfargo.com/autograph-journey-visa-credit-card/")},
  "wells_one_key": {
    "brand": "wells", "name": "One Key", "short": "One Key", "network": "mastercard",
    "fee": 0, "type": "points", "cpp": 1, "base": 1.5,
    "rules": [R(["travel"], 3, "Expedia, Hotels.com & Vrbo", cond="Booked on Expedia, Hotels.com or Vrbo"),
              R(["gas"], 3, "Gas stations"), R(["grocery"], 3, "Grocery stores"), R(["dining"], 3, "Dining")],
    "perks": ["Earns OneKeyCash, usable only on Expedia, Hotels.com and Vrbo"],
    "source": src("https://awardwallet.com/credit-cards/hotels/one-key-credit-card/", "Wells Fargo's page didn't load")},

  # ── U.S. Bank ──
  "usbank_altitude_connect": {
    "brand": "usbank", "name": "Altitude Connect", "short": "Altitude Connect", "network": "visa",
    "fee": 0, "type": "points", "cpp": 1, "base": 1,
    "rules": [R(["travel"], 5, "U.S. Bank Travel Center", cond="Prepaid hotels & car rentals in the Travel Center"),
              R(["travel", "transit"], 4, "Travel", note="Airlines, hotels, car rentals, taxis, trains, cruises"),
              R(["gas"], 4, "Gas & EV charging", note="First $1,000/quarter, then 1x"),
              R(["dining"], 2, "Dining"), R(["streaming"], 2, "Streaming"),
              R(["grocery"], 2, "Grocery stores", note="Not discount stores, supercenters or warehouse clubs")],
    "perks": [],
    "source": src(UB + "/altitude-connect-visa-signature-credit-card.html")},
  "usbank_smartly": {
    "brand": "usbank", "name": "Smartly", "short": "US Bank Smartly", "network": "visa",
    "fee": 0, "type": "cash", "base": 2,
    "perks": ["Up to 4% on the first $10,000 each billing cycle with a U.S. Bank Smartly Savings balance tier"],
    "source": src(UB + "/smartly-visa-signature-credit-card.html")},

  # ── Barclays ──
  "barclays_aviator_red": {
    "brand": "barclays", "name": "AAdvantage Aviator Red", "short": "Aviator Red", "network": "mastercard",
    "fee": 95, "type": "miles", "cpp": 1.3, "base": 1,
    "rules": [R(["travel"], 2, "American Airlines", cond="American Airlines purchases only")],
    "perks": ["Miles valued at 1.3¢ for ranking"],
    "source": src("https://cards.barclaycardus.com/banking/cards/aadvantage-aviator-red-world-elite-mastercard/")},
  "barclays_jetblue_plus": {
    "brand": "barclays", "name": "JetBlue Plus", "short": "JetBlue Plus", "network": "mastercard",
    "fee": 99, "type": "points", "cpp": 1.3, "base": 1,
    "rules": [R(["travel"], 6, "JetBlue", cond="JetBlue purchases only"),
              R(["dining"], 2, "Restaurants"), R(["grocery"], 2, "Grocery stores")],
    "perks": ["Points valued at 1.3¢ for ranking", "5,000 bonus points each anniversary"],
    "source": src("https://cards.barclaycardus.com/banking/cards/jetblue-plus-card/")},

  # ── Store & partner cards ──
  "walmart_onepay": {
    "brand": "walmart", "name": "OnePay CashRewards", "short": "Walmart OnePay", "network": "mastercard",
    "fee": 0, "type": "cash", "base": 1.5,
    "rules": [R(["walmart"], 5, "Walmart", note="5% with Walmart+, otherwise 3%")],
    "perks": ["Replaced the Capital One Walmart card"],
    "source": src("https://www.onepay.com/credit-card")},
  "target_circle": {
    "brand": "target", "name": "Target Circle Card", "short": "Target Circle Card", "network": "store", "storeOnly": ["target"],
    "fee": 0, "type": "cash", "base": 0,
    "rules": [R(["target"], 5, "5% off at Target", note="Instant discount at checkout, in store and online")],
    "perks": ["Works only at Target (the credit card version)", "Also 5% off at Starbucks inside Target"],
    "source": src("https://www.target.com/circlecard")},
  "amazon_store_card": {
    "brand": "amazon", "name": "Amazon Store Card", "short": "Amazon Store Card", "network": "store", "storeOnly": ["amazon", "wholefoods"],
    "fee": 0, "type": "cash", "base": 0,
    "rules": [R(["amazon", "wholefoods"], 5, "Amazon & Whole Foods", note="5% with Prime")],
    "perks": ["Works only at Amazon and Whole Foods"],
    "source": src("https://upgradedpoints.com/credit-cards/best-store-credit-cards/")},
  "lowes_mylowes": {
    "brand": "lowes", "name": "MyLowe's Rewards Card", "short": "Lowe's Card", "network": "store", "storeOnly": ["home"],
    "fee": 0, "type": "cash", "base": 0,
    "rules": [R(["home"], 5, "5% off at Lowe's", cond="Lowe's only")],
    "perks": ["Works only at Lowe's; 5% off or special financing"],
    "source": src("https://upgradedpoints.com/credit-cards/best-store-credit-cards/")},
  "bestbuy_visa": {
    "brand": "bestbuy", "name": "My Best Buy Visa", "short": "Best Buy Visa", "network": "visa",
    "fee": 0, "feeNote": "Some accounts have an annual fee depending on credit", "type": "cash", "base": 1,
    "rules": [R(["electronics"], 5, "Best Buy", cond="Best Buy purchases only"),
              R(["gas"], 3, "Gas"), R(["grocery"], 2, "Grocery"), R(["dining"], 2, "Dining & takeout")],
    "perks": ["Rewards come as Best Buy certificates", "No foreign transaction fees"],
    "source": src("https://www.citi.com/credit-cards/citi-best-buy-credit-cards")},
  "samsclub_mastercard": {
    "brand": "samsclub", "name": "Sam's Club Mastercard", "short": "Sam's Club Card", "network": "mastercard",
    "fee": 0, "feeNote": "Requires a Sam's Club membership", "type": "cash", "base": 1,
    "rules": [R(["gas"], 5, "Gas", note="First $6,000/yr, then 1%"), R(["dining"], 3, "Dining")],
    "perks": ["Plus members may earn more at Sam's Club"],
    "source": src("https://upgradedpoints.com/credit-cards/best-store-credit-cards/")},
  "paypal_cashback": {
    "brand": "paypal", "name": "PayPal Cashback Mastercard", "short": "PayPal Card", "network": "mastercard",
    "fee": 0, "type": "cash", "base": 1.5,
    "rules": [R(["online", "amazon"], 3, "Checking out with PayPal", cond="Only when you pay through PayPal")],
    "perks": [],
    "source": src("https://www.paypal.com/us/digital-wallet/manage-money/paypal-cashback-mastercard")},
  "venmo_card": {
    "brand": "venmo", "name": "Venmo Credit Card", "short": "Venmo Card", "network": "visa",
    "fee": 0, "type": "cash", "base": 1,
    "rules": [R(["dining", "entertainment", "streaming"], 3, "Dining, entertainment & streaming", note="+1% when friends pay you back through Venmo"),
              R(["online"], 3, "Paying with Venmo", cond="Only when you pay with Venmo")],
    "perks": [],
    "source": src("https://venmo.com/about/creditcard/")},
  "verizon_visa": {
    "brand": "verizon", "name": "Verizon Visa", "short": "Verizon Visa", "network": "visa",
    "fee": 0, "type": "cash", "base": 1,
    "rules": [R(["grocery", "gas", "dining"], 4, "Grocery, gas & dining"),
              R(["phone"], 4, "Verizon", cond="Verizon purchases only")],
    "perks": ["Rewards redeem toward your Verizon bill"],
    "source": src("https://upgradedpoints.com/credit-cards/best-store-credit-cards/")},

  # ── Bilt ──
  "bilt_blue": {
    "brand": "bilt", "name": "Bilt Blue Card", "short": "Bilt Blue", "network": "mastercard",
    "fee": 0, "type": "points", "cpp": 1, "base": 1,
    "perks": ["Also earns 4% in Bilt Cash, used to unlock points on rent or mortgage (not counted in ranking)"],
    "source": src("https://upgradedpoints.com/news/bilt-new-credit-card-details/")},
  "bilt_obsidian": {
    "brand": "bilt", "name": "Bilt Obsidian Card", "short": "Bilt Obsidian", "network": "mastercard",
    "fee": 95, "type": "points", "cpp": 1, "base": 1,
    "rules": [R(["travel"], 2, "Travel")],
    "choice": [{"id": "pick", "rate": 3, "pick": 1, "period": "persistent", "label": "Your 3x pick",
                "note": "First $25,000/yr, then 1x. Can change once a year.",
                "options": [O("dining", "Dining", ["dining"]), O("grocery", "Grocery", ["grocery"])]}],
    "perks": ["Also earns 4% in Bilt Cash (not counted in ranking)"],
    "source": src("https://upgradedpoints.com/news/bilt-new-credit-card-details/")},
  "bilt_palladium": {
    "brand": "bilt", "name": "Bilt Palladium Card", "short": "Bilt Palladium", "network": "mastercard",
    "fee": 495, "type": "points", "cpp": 1, "base": 2,
    "perks": ["Also earns 4% in Bilt Cash (not counted in ranking)"],
    "source": src("https://upgradedpoints.com/news/bilt-new-credit-card-details/")},

  # ── Credit unions & others ──
  "nfcu_cashrewards": {
    "brand": "navyfederal", "name": "cashRewards", "short": "NFCU cashRewards", "network": "visa", "networkOptions": ["visa", "mastercard"],
    "fee": 0, "type": "cash", "base": 1.5, "perks": ["cashRewards Plus (limits of $5,000+) earns 2%"],
    "source": src("https://www.navyfederal.org/loans-cards/credit-cards/cash-rewards.html")},
  "nfcu_cashrewards_plus": {
    "brand": "navyfederal", "name": "cashRewards Plus", "short": "NFCU cashRewards Plus", "network": "visa", "networkOptions": ["visa", "mastercard"],
    "fee": 0, "type": "cash", "base": 2, "perks": [],
    "source": src("https://www.navyfederal.org/loans-cards/credit-cards/cash-rewards.html")},
  "nfcu_more_rewards": {
    "brand": "navyfederal", "name": "More Rewards", "short": "NFCU More Rewards", "network": "amex",
    "fee": 0, "type": "points", "cpp": 1, "base": 1,
    "rules": [R(["dining"], 3, "Restaurants & delivery"), R(["grocery"], 3, "Supermarkets"),
              R(["gas", "transit"], 3, "Gas & transit")],
    "perks": ["Points valued at 1¢ for ranking; some redemptions are worth less"],
    "source": src("https://www.navyfederal.org/loans-cards/credit-cards/more-rewards.html")},
  "penfed_power_cash": {
    "brand": "penfed", "name": "Power Cash Rewards", "short": "PenFed Power Cash", "network": "visa",
    "fee": 0, "type": "cash", "base": 1.5,
    "perks": ["2% with Honors Advantage (military, or a qualifying PenFed checking account)"],
    "source": src("https://www.penfed.org/credit-cards/power-cash-honors-advantage")},
  "usaa_preferred_cash": {
    "brand": "usaa", "name": "Preferred Cash Rewards", "short": "USAA Preferred Cash", "network": "visa",
    "fee": 0, "type": "cash", "base": 1.5, "perks": [],
    "source": src("https://awardwallet.com/credit-cards/cash-back/usaa-preferred-cash-rewards/", "USAA's page needs a login/cookies")},
  "fidelity_rewards": {
    "brand": "fidelity", "name": "Rewards Visa Signature", "short": "Fidelity Visa", "network": "visa",
    "fee": 0, "type": "cash", "base": 2, "baseLabel": "Everything (deposited into a Fidelity account)",
    "perks": ["No foreign transaction fees"],
    "source": src("https://www.fidelity.com/cash-management/visa-signature-card")},
  "robinhood_gold": {
    "brand": "robinhood", "name": "Robinhood Gold Card", "short": "Robinhood Gold", "network": "visa",
    "fee": 0, "feeNote": "Requires Robinhood Gold ($50/yr)", "type": "points", "cpp": 1, "base": 3,
    "rules": [R(["travel"], 5, "Robinhood travel portal", cond="Booked through Robinhood's travel portal")],
    "perks": ["Points worth 1¢ for travel or investing; cash redemptions are worth less"],
    "source": src("https://upgradedpoints.com/news/robinhood-gold-card-pros-cons/")},
  "creditone_platinum": {
    "brand": "creditone", "name": "Platinum Rewards Visa", "short": "Credit One Platinum", "network": "visa",
    "fee": 0, "type": "cash", "base": 0,
    "rules": [R(["gas"], 1, "Gas"), R(["grocery"], 1, "Grocery"), R(["utilities", "phone"], 1, "Internet, cable, satellite & phone")],
    "perks": ["No-annual-fee version; other Credit One cards may differ"],
    "source": src("https://www.creditonebank.com/credit-cards/platinum-no-fee")},
})

# ════════════════ Stores (chains with known rules) + merchant tags on card rules ════════════════
# Only brands where knowing the store changes the answer: its real category, network limits,
# or a card that pays more there. Small businesses just use the category tiles.
# (id, display name, category, aliases, tags)
S = [
 # Warehouse clubs & superstores
 ("costco","Costco","costco","",[]),("costco_gas","Costco Gas","costco_gas","costco fuel costco gas station",[]),
 ("samsclub","Sam's Club","warehouse","sams",[]),("bjs","BJ's Wholesale","warehouse","bjs",[]),
 ("walmart","Walmart","walmart","walmart supercenter",[]),("target","Target","target","",[]),
 ("amazon","Amazon","amazon","amazon.com prime audible",[]),("wholefoods","Whole Foods","wholefoods","whole foods market",[]),
 # Grocery
 *[(x.lower().replace(" ","").replace("'","").replace("-","").replace("&",""),x,"grocery","",[]) for x in
   ["Safeway","Kroger","Albertsons","Vons","Ralphs","Publix","Trader Joe's","Aldi","H-E-B","Wegmans","Sprouts","Food Lion",
    "Stop & Shop","Giant","Meijer","Fred Meyer","WinCo","Smart & Final","Lucky","Save Mart","Harris Teeter","Hy-Vee",
    "Stater Bros","Winn-Dixie","ShopRite","Jewel-Osco","King Soopers","Fry's Food","Food 4 Less","Grocery Outlet","99 Ranch","H Mart"]],
 # Fast food & coffee
 *[(x.lower().replace(" ","").replace("'","").replace("-","").replace("&","").replace(".",""),x,"fast_food","",[]) for x in
   ["McDonald's","Chipotle","Starbucks","Chick-fil-A","Taco Bell","Wendy's","Burger King","Subway","Panda Express","In-N-Out",
    "Domino's","Pizza Hut","Dunkin'","Panera","Jack in the Box","Sonic","KFC","Popeyes","Five Guys","Shake Shack",
    "Jersey Mike's","Wingstop","Dutch Bros","Raising Cane's","Del Taco","El Pollo Loco","Carl's Jr.","Arby's","Culver's",
    "Whataburger","Peet's Coffee","Jamba","Little Caesars","Papa John's","Noodles & Company","Qdoba","Sweetgreen","CAVA"]],
 # Restaurants & delivery
 *[(x.lower().replace(" ","").replace("'","").replace("-","").replace("&",""),x,"dining","",[]) for x in
   ["Olive Garden","Applebee's","Chili's","Cheesecake Factory","Red Robin","IHOP","Denny's","Buffalo Wild Wings",
    "Outback","Texas Roadhouse","P.F. Chang's","Red Lobster","BJ's Restaurant","Cracker Barrel","Benihana"]],
 ("doordash","DoorDash","dining","door dash",[]),("ubereats","Uber Eats","dining","",[]),("grubhub","Grubhub","dining","",[]),("instacart","Instacart","grocery","",[]),
 # Gas
 *[(x.lower().replace(" ","").replace("-","").replace("'",""),x,"gas","",[]) for x in
   ["Shell","Chevron","Exxon","Mobil","ARCO","76","BP","Valero","Circle K","Speedway","QuikTrip","Wawa","Sheetz",
    "Marathon","Sunoco","Casey's","Buc-ee's","Kwik Trip","Texaco","Citgo","Phillips 66","Conoco","Sinclair"]],
 # Drugstores
 ("cvs","CVS","drugstore","cvs pharmacy",[]),("walgreens","Walgreens","drugstore","",[]),("riteaid","Rite Aid","drugstore","",[]),
 # Home improvement
 ("homedepot","Home Depot","home","the home depot",[]),("lowes","Lowe's","home","lowes",[]),("acehardware","Ace Hardware","home","ace",[]),
 ("menards","Menards","home","",[]),("truevalue","True Value","home","",[]),
 # Department & clothing
 *[(x.lower().replace(" ","").replace("'","").replace(".",""),x,"department","",[]) for x in
   ["Macy's","Nordstrom","Kohl's","JCPenney","Dillard's","Bloomingdale's","Belk","Nordstrom Rack","Saks"]],
 *[(x.lower().replace(" ","").replace("&","").replace(".",""),x,"clothing","",[]) for x in
   ["Old Navy","Gap","H&M","Zara","Uniqlo","TJ Maxx","Marshalls","Ross","Nike","Lululemon","Banana Republic","Burlington"]],
 # Electronics, furniture, sporting, pets, beauty, office
 ("bestbuy","Best Buy","electronics","",[]),("applestore","Apple Store","electronics","apple",[]),
 ("ikea","IKEA","furniture","",[]),("wayfair","Wayfair","furniture","",[]),("ashley","Ashley","furniture","ashley furniture",[]),
 ("dicks","Dick's Sporting Goods","sporting","dicks",[]),("rei","REI","sporting","",[]),("academy","Academy Sports","sporting","",[]),
 ("petco","Petco","pets","",[]),("petsmart","PetSmart","pets","",[]),("chewy","Chewy","pets","",[]),
 ("ulta","Ulta Beauty","beauty","ulta",[]),("sephora","Sephora","beauty","",[]),("greatclips","Great Clips","beauty","haircut",[]),
 ("staples","Staples","office","",[]),("officedepot","Office Depot","office","office max officemax",[]),
 # Streaming & phone & utilities
 *[(x.lower().replace(" ","").replace("+","plus"),x,"streaming","",[]) for x in
   ["Netflix","Hulu","Disney+","Spotify","YouTube TV","Max","Peacock","Apple TV+","Paramount+","ESPN+","Sling"]],
 ("verizon","Verizon","phone","",[]),("att","AT&T","phone","at&t att",[]),("tmobile","T-Mobile","phone","tmobile",[]),
 ("xfinity","Xfinity","utilities","comcast",[]),("spectrum","Spectrum","utilities","",[]),
 # Transit
 ("uber","Uber","transit","",[]),("lyft","Lyft","transit","",[]),
 # Entertainment & fitness
 ("amc","AMC Theatres","entertainment","amc",[]),("regal","Regal","entertainment","",[]),("ticketmaster","Ticketmaster","entertainment","",[]),
 ("disneyland","Disneyland / Disney World","entertainment","disney parks",[]),
 ("planetfitness","Planet Fitness","fitness","",[]),("24hourfitness","24 Hour Fitness","fitness","",[]),("lafitness","LA Fitness","fitness","",[]),
 ("orangetheory","Orangetheory","fitness","",[]),("equinox","Equinox","fitness","",[]),
 # Online
 ("ebay","eBay","online","",[]),("etsy","Etsy","online","",[]),("walmartcom","Walmart.com","online","walmart online",[]),
 ("paypal","PayPal checkout","online","paypal",[]),
 # Airlines
 *[(i,n,"travel",a,["airline"]) for i,n,a in
   [("delta","Delta","delta airlines"),("united","United","united airlines"),("american","American Airlines","aa"),
    ("southwest","Southwest","southwest airlines"),("alaska","Alaska Airlines","alaska"),("hawaiian","Hawaiian Airlines","hawaiian"),
    ("jetblue","JetBlue","jet blue"),("spirit","Spirit","spirit airlines"),("frontier","Frontier","frontier airlines")]],
 # Hotels
 *[(i,n,"travel",a,["hotel"]) for i,n,a in
   [("marriott","Marriott","bonvoy westin sheraton ritz courtyard"),("hilton","Hilton","hampton doubletree embassy"),
    ("hyatt","Hyatt",""),("ihg","IHG","holiday inn intercontinental"),("bestwestern","Best Western","")]],
 ("airbnb","Airbnb","travel","",[]),("expedia","Expedia","travel","",[]),("hotelscom","Hotels.com","travel","",[]),("vrbo","Vrbo","travel","",[]),
 ("hertz","Hertz","travel","rental car",[]),("enterprise","Enterprise","travel","rental car",[]),
]
NOTES = {"costco":"Costco takes only Visa credit cards","costco_gas":"Costco takes only Visa credit cards",
 "walmart":"Walmart doesn't take Apple Pay, and most cards don't count it as grocery",
 "target":"Most cards don't count Target as grocery","starbucks":"Usually counts as fast food or dining",
 "samsclub":"Warehouse clubs usually don't count as grocery","bjs":"Warehouse clubs usually don't count as grocery",
 "instacart":"Often counts as grocery; some cards treat it as online","paypal":"Pick this when you pay through PayPal online"}
stores=[]; seen=set()
for sid,name,cat,aka,tags in S:
    if sid in seen: raise SystemExit("duplicate store "+sid)
    seen.add(sid)
    e={"id":sid,"name":name,"cat":cat}
    if aka: e["aka"]=aka
    if tags: e["tags"]=tags
    if sid in NOTES: e["note"]=NOTES[sid]
    stores.append(e)

# Merchant tags on conditional rules: when you pick one of these stores, the rule applies for real.
MERCH = [("Lowe's",["lowes"]),("Best Buy",["bestbuy"]),("United purchases",["united"]),("Southwest purchases",["southwest"]),
 ("Delta purchases",["delta"]),("Delta & hotels",["delta","hotel"]),("Marriott hotels",["marriott"]),("IHG hotels",["ihg"]),
 ("Hyatt hotels",["hyatt"]),("Hilton hotels",["hilton"]),("American Airlines",["american"]),("JetBlue",["jetblue"]),
 ("Alaska & Hawaiian Airlines",["alaska","hawaiian"]),("Lyft",["lyft"]),("Verizon",["verizon"]),
 ("Disney+, Hulu & ESPN",["disneyplus","hulu","espnplus"]),("5% off at Lowe's",["lowes"]),("Expedia, Hotels.com & Vrbo",["expedia","hotelscom","vrbo"]),
 ("Airline tickets",["airline"]),("Flights & hotels booked direct",["airline","hotel"]),("Airlines",["airline"]),
 ("Checking out with PayPal",["paypal"])]
for pid,p in products.items():
    for r in p.get("rules",[]):
        if not r.get("cond"): continue
        for label,m in MERCH:
            if r["label"]==label: r["m"]=m
        if r["label"]=="Hotels" and "Hotel" in r["cond"] or r["label"]=="Hotels" and "hotel" in r["cond"]: r["m"]=["hotel"]
        if r["label"] in ("Flights","Flights & prepaid hotels","Select travel") and "airline" in r["cond"].lower(): r["m"]=["airline"]
        # warehouse clubs join wholesale-club rules
    for r in p.get("rules",[]):
        if "costco" in r["cats"] and "grocery" in r["cats"]: r["cats"].append("warehouse")
    rot=p.get("rotating")
    if rot:
        for q in rot["schedule"].values():
            if "costco" in q["cats"] and "warehouse" not in q["cats"]: q["cats"].append("warehouse")

# Where "Activate now" / "Change" send you. A plain https sign-in link opens the
# bank's app when the phone has it and the bank supports app links; otherwise the browser.
LOGIN = {
    "chase":    "https://secure.chase.com/web/auth/dashboard",
    "discover": "https://www.discover.com/login/",
    "usbank":   "https://www.usbank.com/",
    "boa":      "https://www.bankofamerica.com/",
    "citi":     "https://online.citi.com/",
    "bilt":     "https://www.biltrewards.com/",
}
for k, u in LOGIN.items():
    brands[k]["login"] = u

catalog = {"version": "2026.10.02-v1", "updated": CHECKED, "brands": brands, "products": products, "stores": stores}
out = pathlib.Path(__file__).resolve().parent.parent / "catalog.json"  # repo root, next to index.html
out.write_text(json.dumps(catalog, indent=1, ensure_ascii=False))
print(f"{len(products)} cards, {len(brands)} brands -> {out}")
