# Customer Application — Jewellery E-commerce Legal & Market Benchmark

Research date: 17 July 2026  
Application: Sai Suryaa Jewellers customer application  
Implementation version: Legal policy suite 1.0  

> This is an engineering and commercial compliance brief, not legal advice. Indian consumer, privacy, tax, referral-programme and franchise counsel should approve the seller model and production wording before public launch.

## 1. Executive outcome

The application is currently a catalogue and store-request service, not an end-to-end online checkout. It lets a customer browse products, select a store and submit product IDs and quantities. The selected store later confirms availability, final weight, live metal rate, charges, tax, billing, payment and fulfilment.

The legal implementation therefore avoids presenting a request as a completed sale. It uses a layered policy suite rather than one generic Terms page:

1. Terms of Use & Order Request Terms
2. Privacy Notice
3. Store Fulfilment, Pickup & Delivery Policy
4. Cancellation, Returns, Exchanges & Refunds Policy
5. Product, Pricing & Hallmarking Disclosures
6. Referral & Wallet Terms
7. Customer Grievance Redressal

## 2. Jewellery market comparison

| Brand | Standard online return pattern | Jewellery-specific features disclosed | Drafting lesson for this app |
|---|---|---|---|
| Tanishq | Commonly 7 days for eligible domestic online goods; category exceptions | Prevailing-rate exchange valuation, making/tax/discount deductions, PAN controls, seller/company details | Short windows and deductions must be conspicuous; never use a broad “easy returns” headline without conditions. |
| CaratLane | 15-day return/exchange for eligible products | BIS/certification, insured delivery, lifetime exchange, warranty, old-gold exchange | Separate short-window returns, warranty, and lifetime exchange; they are not the same promise. |
| BlueStone | 30-day domestic policy for eligible goods | Lifetime exchange/buyback, pricing tied to rates, PAN and QC | The app’s former “30-day” claim reflected one generous competitor, not a safe industry default. |
| Malabar Gold & Diamonds | 14-day online refund with exclusions and QC | Itemised gold/stone/making/tax pricing, government-ID delivery, exchange and buyback tables | Itemised jewellery pricing and high-value delivery controls are strong practice. |
| Candere | 15-day policy, but refund/exchange economics and high-value rules vary | Final manufactured-weight adjustment, partial COD, delivery OTP/ID, published exchange percentages | Manufactured-weight variance needs a clear consent/refund mechanism, not an unlimited price-change clause. |
| GIVA | 15-day eligible gold return after inspection | Weight tolerance, invoice weight, warranty, wallet-based lifetime exchange | A tolerance should be defined and cannot remove remedies for wrong or defective goods. |
| Melorra | 15-day online return; channel and product exclusions | Exchange vs cash-buyback percentages, hallmark/certification, insured delivery | “100% exchange” must immediately state which components and deductions are included. |

Market sources:

- [Tanishq Terms and Conditions](https://www.tanishq.co.in/terms-and-conditions.html)
- [CaratLane Terms and Conditions](https://www.caratlane.com/terms-and-conditions)
- [CaratLane Returns and Exchanges](https://www.caratlane.com/returns-exchanges)
- [BlueStone Terms and Conditions](https://www.bluestone.com/tnc.html)
- [BlueStone Privacy Policy](https://www.bluestone.com/privacy.html)
- [Kalyan Jewellers Terms and Conditions](https://www.kalyanjewellers.net/terms-and-conditions.php)
- [Malabar Terms of Service and policies](https://malabar191.malabargoldanddiamonds.com/terms-of-service.html)
- [Candere Terms and Conditions](https://www.candere.com/terms-and-conditions.html)
- [Candere Returns](https://www.candere.com/return.html)
- [GIVA Terms of Service](https://www.giva.co/pages/terms-of-service)
- [Melorra Terms of Use](https://www.melorra.com/terms-of-use/)

## 3. Current Indian requirements mapped to the app

### Consumer and e-commerce

The Consumer Protection (E-Commerce) Rules require prominent entity/contact information, a grievance mechanism, clear return/refund/exchange/warranty/delivery/payment information, explicit affirmative purchase consent, no automatic pre-ticked acceptance, reasonable refund handling and truthful product/price presentation.

Implementation mapping:

- The footer and Legal Centre now expose the merchant identity, address, GSTIN, support email and phone.
- The request button requires an unchecked affirmative acknowledgement.
- The server records the accepted Terms version and server timestamp on the request.
- The request flow clearly says no payment or completed sale has occurred.
- Unsupported online-payment, free-shipping, 30-day-return and 24/7-support claims were removed.

Sources:

- [Consumer Protection (E-Commerce) Rules, 2020](https://consumeraffairs.nic.in/sites/default/files/E%20commerce%20rules_0.pdf)
- [Department of Consumer Affairs — Consumer Protection rules and guidelines](https://consumeraffairs.nic.in/acts-and-rules/consumer-protection/consumer-protection)
- [CCPA Misleading Advertisement Guidelines](https://consumeraffairs.nic.in/sites/default/files/CCPA_Notification.pdf)
- [Dark Patterns Guidelines, 2023](https://consumeraffairs.nic.in/sites/default/files/The%20Guidelines%20for%20Prevention%20and%20Regulation%20of%20Dark%20Patterns%2C%202023.pdf)

### Jewellery hallmarking and invoices

Applicable precious-metal jewellery should use the required BIS hallmark components. A six-character HUID can be verified through BIS Care. The final invoice should identify the seller and disclose required item, quantity/value and tax particulars; jewellery-specific purity and weight information should be supplied as applicable.

Sources:

- [BIS hallmarking FAQ](https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/?lang=en)
- [BIS consumer protection guidance](https://www.bis.gov.in/hallmarking-overview/consumer-protection/?lang=en)
- [CBIC tax invoice rules](https://cbic-gst.gov.in/gst-invoice-rules.html)
- [CBIC jewellery GST sectoral FAQ](https://cbic-gst.gov.in/sectoral-faq.html)

### Privacy — present and future-dated requirements

As of the research date, the core private-sector duties in the Digital Personal Data Protection Act and Rules are scheduled to commence after the notified 18-month transition on 13 May 2027. The current implementation is drafted forward toward clear purpose notice, data minimisation, access/correction/erasure, consent withdrawal, grievance handling, security and breach readiness.

Sources:

- [Digital Personal Data Protection Act, 2023](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf)
- [DPDP Rules, 2025](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)
- [DPDP commencement timeline notification](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf)
- [SPDI Rules](https://upload.indiacode.nic.in/showfile?actid=AC_CEN_45_76_00001_200021_1517807324077&filename=GSR313E_10511%281%29_0.pdf&type=rule)

### High-value transactions

- PAN quoting applies at the applicable high-value goods/services threshold, currently above ₹2 lakh per transaction under the cited rule material.
- Cash receipts of ₹2 lakh or more are restricted under the applicable per-person/day, single-transaction and related-event tests.
- The store must explain the collection purpose, provide a secure channel and retain identity data only as required.

Sources:

- [Income-tax Rule 114B material](https://www.incometaxindia.gov.in/documents/20117/11892059/Rule%2B-%2B114B_en.pdf/b0686efb-0bac-7c3e-cd9b-39ae4d69e81a)
- [Income Tax Department cash-transaction guidance](https://www.incometaxindia.gov.in/w/prohibited-transaction-in-cash/limit-on-cash-transactions%E2%80%8B)

## 4. Claims removed or corrected

| Previous public statement/UI | Risk | Implemented correction |
|---|---|---|
| “Up to 60% off & Free Shipping” | Unsubstantiated offer and fulfilment promise | Replaced with catalogue/store-request description. |
| “24/7 Customer Support” | No verified 24-hour operation | Replaced with store/customer support wording. |
| “All jewellery comes with authenticity certification” | Overbroad; hallmark and stone certificates differ | Replaced with applicable hallmark/purity/certificate disclosure. |
| “Hassle-free 30-day returns” | No approved operational return policy | Replaced with direct link to actual eligibility and statutory-remedy policy. |
| “100% secure payment gateway” and payment badges | App collects no online payment | Replaced with verified billing and no-payment notice. |
| “Transit Insurance” | Not supported by current flow | Replaced with store-confirmed fulfilment. |
| Auto-restarting deal countdown | False urgency risk | Replaced with a non-timed featured collection. |
| Coupon field | No coupon logic | Removed. |
| Newsletter success alert | No subscription was stored | Removed. |
| Contact success alert | No message was sent | Replaced with real email/phone paths and privacy notice. |
| Dummy Mumbai contact and UK number | False business information | Removed. |

## 5. Production decisions still required

These must not be invented by the policy writer:

1. Confirm whether Sivappa Jewellers is always the seller, or each selected franchise/store is the seller of record.
2. Provide the Grievance Officer’s individual full name and confirm designation/contact details.
3. Confirm legal entity/proprietor name, registered/principal office, all branch addresses and whether the existing GSTIN covers the operator.
4. Approve an optional change-of-mind return window, if the business will operationally support one.
5. Approve product exclusions and condition rules for personalised, engraved, sized, made-to-order, coin and stone products.
6. Approve refund timing, original-payment handling, return logistics and inspection steps.
7. Approve store pickup/delivery service area, charges, recipient identity controls and insurance.
8. Define warranty, cleaning, resizing and repair scope and duration.
9. Define lifetime exchange, old-gold exchange and cash-buyback valuation formulas before advertising them.
10. Define referral earning rates, caps, coin conversion, expiry, reversal, redemption and tax treatment.

## 6. Critical technical compliance backlog

Publishing policies does not fix insecure data processing. Before production launch:

- Restrict CORS to approved production origins.
- Protect wallet and referral endpoints with authentication and object-level authorisation.
- Stop returning other customers’ mobile numbers and wallet balances in referral APIs/UI.
- Replace long-lived localStorage-only authentication with a shorter, revocable session design and XSS/CSP hardening.
- Enforce HTTPS and disable Android cleartext/mixed-content allowances for production.
- Rotate the operational database credential found in the repository and remove it from version history.
- Implement a grievance ticket workflow with acknowledgement/status tracking.
- Implement privacy access, correction, deletion/deactivation and data-export workflows.
- Map retention periods and deletion jobs for account, request, invoice, referral, support and security records.
- Maintain processor contracts and an incident/breach response process.

## 7. Referral programme counsel review

The multi-level referral tree is the highest legal-risk commercial feature. It should not charge entry/activation fees, reward recruitment alone, require purchase as an enrolment condition, promise income or investment returns, or present downline rewards as guaranteed earnings. Rewards should be tied only to genuine completed retail sales and have clear reversal, cap, expiry, tax and fraud rules.

Sources:

- [Consumer Protection (Direct Selling) Rules, 2021](https://consumeraffairs.nic.in/sites/default/files/232214.pdf)
- [Prize Chits and Money Circulation Schemes (Banning) Act, 1978](https://www.indiacode.nic.in/bitstream/123456789/1628/1/197843.pdf)
- [RBI PPI Master Directions](https://www.rbi.org.in/Scripts/NotificationUser.aspx/NotificationUser.aspx?Id=12156)

## 8. Release gate

Do not label the policy suite “final counsel-approved” until the decisions in section 5 are resolved and Indian counsel signs off. The engineering implementation is suitable as a versioned, review-ready baseline for the current store-request model.
