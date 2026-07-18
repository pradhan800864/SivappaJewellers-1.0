export const policyMeta = {
  version: "1.0",
  effectiveDate: "17 July 2026",
  lastUpdated: "17 July 2026",
};

export const businessDetails = {
  brandName: "Sai Suryaa Jewellers",
  merchantName: "Sai Suryaa Jewellers",
  address: "Shop No. 1, H.No. 18/100A/1, S.V.C. Shroff Bazar, Kurnool, Andhra Pradesh, India",
  gstin: "37AIBPA3539R1ZZ",
  email: "jewellerssaisurya@gmail.com",
  phoneDisplay: "+91 94402 55766",
  phoneHref: "+919440255766",
  grievanceOfficer: "Customer Grievance Officer",
};

const orderRequestSummary =
  "This application accepts a request for a selected store to contact you. It does not collect payment or, by itself, complete a jewellery sale.";

export const legalPolicies = {
  terms: {
    path: "/terms",
    title: "Terms of Use & Order Request Terms",
    shortTitle: "Terms of Use",
    summary: orderRequestSummary,
    sections: [
      {
        id: "who-we-are",
        heading: "1. Who we are",
        paragraphs: [
          `The customer application is presented under the ${businessDetails.brandName} brand. For these Terms, “we”, “us” and “our” refer to ${businessDetails.merchantName}, unless the final tax invoice identifies a selected store as the seller.`,
          `Our contact address is ${businessDetails.address}. GSTIN: ${businessDetails.gstin}.`,
        ],
      },
      {
        id: "eligibility",
        heading: "2. Eligibility and account access",
        paragraphs: [
          "You must be at least 18 years old and legally competent to enter a contract to submit an order request. If you use the application for another person, you confirm that you are authorised to provide their details.",
          "Login uses a one-time password sent to the mobile number you provide. Verifying the OTP creates or signs you into a customer account. You are responsible for access to that mobile number and for notifying us promptly if you suspect unauthorised access.",
        ],
      },
      {
        id: "catalogue",
        heading: "3. Catalogue information and availability",
        paragraphs: [
          "Product photographs, descriptions, dimensions, weights, purity, stone details and availability are catalogue information. Screen settings, lighting, hand finishing and natural variations may cause reasonable differences in colour or appearance.",
          "A product shown in the application may be unavailable, made to order, available only at some stores, or require a size or design confirmation. A selected store will confirm these details before a sale is completed.",
        ],
      },
      {
        id: "pricing",
        heading: "4. Indicative jewellery pricing",
        paragraphs: [
          "Prices displayed in the application are estimates calculated from available metal rates, recorded net weight, value addition or making component, stone value and applicable tax assumptions. Jewellery is weight-sensitive and metal rates can change.",
          "The selected store will disclose the final metal rate, verified weight, purity, making or value-addition charges, stone value, discounts and applicable taxes before seeking payment. The tax invoice and the amount you approve at the store-confirmation stage govern the completed sale.",
        ],
      },
      {
        id: "request-process",
        heading: "5. How an order request works",
        paragraphs: [
          "Adding an item to the bag does not reserve it. When you select a store and press “Submit Order Request”, you expressly ask us to send your contact, address, selected products and quantities to that store for follow-up.",
          "An automated request acknowledgement is not acceptance of an order, a tax invoice or a promise to supply. A sale is formed only after the seller confirms availability and final terms, you accept those terms, and the seller accepts the transaction in the manner communicated to you.",
        ],
      },
      {
        id: "payment-fulfilment",
        heading: "6. Payment, pickup and delivery",
        paragraphs: [
          "This application does not currently collect payment. Pay only against verified instructions and a bill or receipt from the identified seller. We will never ask you to share an OTP, PIN or complete card credentials by phone or message.",
          "Pickup, delivery availability, charges, identity checks, timelines and insurance—if offered—must be confirmed by the selected store before payment. See the Store Fulfilment Policy for details.",
        ],
      },
      {
        id: "cancellation-returns",
        heading: "7. Cancellation, returns, exchange and buyback",
        paragraphs: [
          "You may withdraw an unconfirmed order request without a cancellation fee. Once you accept a store’s final quotation or complete a purchase, the cancellation, return, exchange, repair and buyback terms disclosed by the seller and on the invoice apply, together with rights that cannot be excluded under applicable law.",
          "Change-of-mind return, lifetime exchange and buyback are voluntary commercial programmes and are not implied unless the seller confirms them in writing. See our Cancellation, Returns & Refunds Policy.",
        ],
      },
      {
        id: "acceptable-use",
        heading: "8. Acceptable use",
        bullets: [
          "Do not submit false identities, addresses, requests or reviews.",
          "Do not attempt to access another customer’s account, wallet, invoice or referral information.",
          "Do not scrape, reverse engineer, disrupt or misuse the application or its content.",
          "Do not use the application for fraud, unlawful resale, money laundering or any unlawful purpose.",
        ],
      },
      {
        id: "wallet",
        heading: "9. Referral and wallet features",
        paragraphs: [
          "Referral coins are promotional ledger units, not money, a deposit or an investment. Eligibility, credit, reversal, redemption and programme changes are governed by the Referral & Wallet Terms.",
        ],
      },
      {
        id: "intellectual-property",
        heading: "10. Intellectual property",
        paragraphs: [
          "The application, brand assets, product imagery, copy, layout and software are owned by or licensed to us. You may use them only for personal shopping and may not reproduce or commercially exploit them without written permission.",
        ],
      },
      {
        id: "liability",
        heading: "11. Liability and statutory rights",
        paragraphs: [
          "Nothing in these Terms excludes liability or consumer rights that cannot lawfully be excluded. Subject to that rule, we are not responsible for indirect or consequential loss, loss caused by your inaccurate information, or events beyond reasonable control.",
          "A selected store identified on the final invoice remains responsible for its sale, invoice, product and fulfilment obligations. We remain responsible for obligations that applicable law places directly on the application operator.",
        ],
      },
      {
        id: "law",
        heading: "12. Governing law and disputes",
        paragraphs: [
          "These Terms are governed by Indian law. Courts and consumer authorities with jurisdiction under applicable law may hear disputes; nothing here restricts your right to approach a competent Consumer Commission or other statutory authority.",
          "Please first use our grievance process so we have an opportunity to investigate and resolve the issue.",
        ],
      },
      {
        id: "changes",
        heading: "13. Changes to these Terms",
        paragraphs: [
          "We may update these Terms for legal, security, operational or service changes. We will publish the updated version and effective date. Material changes affecting an existing confirmed sale will not retrospectively reduce rights already agreed for that sale.",
        ],
      },
    ],
  },
  privacy: {
    path: "/privacy",
    title: "Privacy Notice",
    shortTitle: "Privacy Notice",
    summary: "How we collect, use, share, retain and protect personal data when you use the customer application.",
    sections: [
      {
        id: "scope",
        heading: "1. Scope and data fiduciary",
        paragraphs: [
          `This notice applies to the ${businessDetails.brandName} customer website and application operated for ${businessDetails.merchantName}. It also explains when the store you select receives data to respond to your request.`,
        ],
      },
      {
        id: "data-collected",
        heading: "2. Personal data we collect",
        bullets: [
          "Account and identity data: mobile number, OTP verification status, name, email, address and state.",
          "Shopping data: bag contents stored on your device, favourites, product interactions, selected store and order-request details.",
          "Transaction data: billed invoices, seller information, products, values, payment mode, returns and adjustments received from participating stores.",
          "Referral and loyalty data: referral code, referrer relationship, eligible invoice activity, coin credits, reversals and redemptions.",
          "Support data: messages and information you provide when requesting help or exercising a privacy right.",
          "Technical and security data: IP address, device/browser information, timestamps, server logs and authentication events where generated by our systems or service providers.",
        ],
      },
      {
        id: "collection",
        heading: "3. How data is collected",
        paragraphs: [
          "We collect data directly from you when you verify a mobile number, update your profile, save a favourite, submit an order request or contact us. We also receive invoice and fulfilment information from participating stores, and technical records from the systems that deliver the service.",
          "Verifying an OTP for a mobile number not already registered may create a basic customer account so you can use account features and receive store follow-up.",
        ],
      },
      {
        id: "purposes",
        heading: "4. Why we use personal data",
        bullets: [
          "Authenticate you, maintain your account and protect it from misuse.",
          "Save favourites and bag information and provide requested shopping features.",
          "Send an order request to the selected store and support availability, quotation, billing, fulfilment and after-sales service.",
          "Maintain invoices, tax records, wallet entries, referral attribution and fraud controls.",
          "Respond to support, grievance and privacy requests.",
          "Secure, troubleshoot, audit and improve the application.",
          "Comply with tax, accounting, consumer-protection, law-enforcement and other legal obligations.",
          "Send promotional communications only where you have chosen to receive them; you may opt out at any time.",
        ],
      },
      {
        id: "sharing",
        heading: "5. When we share data",
        bullets: [
          "Selected store or seller: contact, address, product and request information needed to respond to your request and complete a transaction you approve.",
          "OTP and communications providers: mobile number and delivery/verification data needed to send and validate messages.",
          "Hosting, database, security and technical service providers acting under our instructions.",
          "Professional advisers, auditors, insurers, banks or payment providers where necessary for an approved transaction or legal claim.",
          "Government, courts or regulators where disclosure is required by law.",
          "A successor in a merger, reorganisation or business transfer, subject to applicable safeguards and notice requirements.",
        ],
        paragraphs: [
          "We do not sell personal data. We do not authorise a participating store to use order-request data for unrelated marketing without an appropriate basis and notice.",
        ],
      },
      {
        id: "storage",
        heading: "6. Device storage, cookies and maps",
        paragraphs: [
          "The application uses essential browser storage to keep your sign-in token and shopping bag on your device. Bag data can remain until you remove items, clear the bag or clear browser/app storage. Protect access to shared devices and sign out after use.",
          "We do not currently use advertising cookies in the customer application. If optional analytics, advertising or embedded map tools are introduced, this notice and any consent controls will be updated before they are used where consent is required.",
        ],
      },
      {
        id: "retention",
        heading: "7. Retention",
        paragraphs: [
          "We retain data only for the purpose described or as required by law. Account and preference data is normally retained while the account is active; unconfirmed request data is retained for follow-up, complaint handling and fraud prevention; invoice, tax, accounting, return and wallet records are retained for statutory and audit periods.",
          "A deletion request may remove or de-identify data that is no longer needed. We may preserve restricted records required for tax, accounting, fraud prevention, dispute resolution or legal compliance, and will explain this when responding.",
        ],
      },
      {
        id: "security",
        heading: "8. Security",
        paragraphs: [
          "We use reasonable technical and organisational safeguards designed to prevent unauthorised access, alteration, disclosure or loss. No system is completely secure. If a personal-data breach creates a risk to you, we will provide notifications required by applicable law and practical steps you can take.",
        ],
      },
      {
        id: "rights",
        heading: "9. Your choices and rights",
        bullets: [
          "Ask for a summary of personal data being processed and relevant sharing information.",
          "Ask us to correct, complete or update inaccurate personal data.",
          "Ask for erasure of data that is no longer necessary, subject to lawful retention duties.",
          "Withdraw optional consent, including marketing consent, without affecting prior lawful processing.",
          "Nominate another individual to exercise applicable rights in the event of death or incapacity where the law provides.",
          "Raise a grievance and, where applicable, approach the Data Protection Board of India after using our grievance process.",
        ],
        paragraphs: [
          `To exercise a right, email ${businessDetails.email} from your registered contact details. We may verify your identity before acting on the request.`,
        ],
      },
      {
        id: "children",
        heading: "10. Children",
        paragraphs: [
          "The application and jewellery order-request service are intended for adults. We do not knowingly enable a person under 18 to transact. A parent or lawful guardian who believes a child’s data was provided should contact us for review and appropriate deletion.",
        ],
      },
      {
        id: "transfers",
        heading: "11. Data location and transfers",
        paragraphs: [
          "Service providers may process data from locations where they operate. Where personal data is transferred outside India, we will follow restrictions and safeguards required by applicable Indian law.",
        ],
      },
      {
        id: "contact",
        heading: "12. Privacy contact and grievances",
        paragraphs: [
          `Contact ${businessDetails.grievanceOfficer} at ${businessDetails.email} or ${businessDetails.phoneDisplay}. Please include “Privacy Request” in the subject and enough information to identify your account and request.`,
        ],
      },
    ],
  },
  fulfilment: {
    path: "/store-fulfilment",
    title: "Store Fulfilment, Pickup & Delivery Policy",
    shortTitle: "Store Fulfilment",
    summary: "What happens after you submit a request and how pickup or delivery is confirmed.",
    sections: [
      {
        id: "request",
        heading: "1. Request acknowledgement",
        paragraphs: [
          "Submitting a request sends your selected items and contact details to the selected store. It does not reserve stock or create a confirmed delivery date. Keep the request number shown in the application for reference.",
        ],
      },
      {
        id: "confirmation",
        heading: "2. Store confirmation",
        bullets: [
          "Availability, size, purity, stone and customisation details.",
          "Final weight, live metal rate, making/value-addition component, stone value, discounts and tax.",
          "Seller identity and GSTIN shown on the final invoice.",
          "Whether the product is for store pickup or eligible for delivery.",
          "Estimated readiness or delivery date, charges, recipient checks and any insurance offered.",
        ],
      },
      {
        id: "payment",
        heading: "3. Payment safety",
        paragraphs: [
          "No payment is collected in this application. Use only a payment method and beneficiary verified by the seller. Obtain a receipt for any advance and a tax invoice for a completed sale. Never share banking OTPs, card PINs or full credentials with store staff or callers.",
        ],
      },
      {
        id: "pickup",
        heading: "4. Store pickup",
        paragraphs: [
          "For pickup, the store may ask for the registered mobile number, request reference, invoice and a suitable government-issued identity document for high-value jewellery. Authorised-person pickup must be approved by the seller in advance.",
        ],
      },
      {
        id: "delivery",
        heading: "5. Delivery, where offered",
        paragraphs: [
          "Delivery is available only if the selected store confirms serviceability and terms. The recipient may need to be present and show matching identification. Inspect the outer package before acknowledging receipt and promptly report visible tampering, shortage, wrong goods or transit damage.",
          "Do not send jewellery back without return authorisation and secure instructions from the seller. The seller will explain the approved pickup or insured return method, if applicable.",
        ],
      },
      {
        id: "delays",
        heading: "6. Delays and failed fulfilment",
        paragraphs: [
          "Made-to-order work, hallmarking, sizing, quality checks, logistics disruption or events outside reasonable control can affect estimates. The seller should notify you of a material delay and allow you to accept a revised date or use available cancellation rights.",
          "If the seller cannot fulfil an accepted purchase after receiving money, it must arrange the appropriate refund in accordance with the accepted terms and applicable law.",
        ],
      },
    ],
  },
  returns: {
    path: "/cancellations-returns-refunds",
    title: "Cancellation, Returns, Exchanges & Refunds",
    shortTitle: "Returns & Refunds",
    summary: "Rules for withdrawing a request, reporting a problem, and understanding store-specific exchange or buyback programmes.",
    sections: [
      {
        id: "unconfirmed",
        heading: "1. Unconfirmed order requests",
        paragraphs: [
          "You may withdraw an order request at any time before you accept the selected store’s final quotation or pay an advance. We do not charge a cancellation fee for withdrawing an unconfirmed request.",
        ],
      },
      {
        id: "confirmed",
        heading: "2. Confirmed or made-to-order purchases",
        paragraphs: [
          "Before you approve payment, the seller must disclose any cancellation restriction for a confirmed, customised, engraved, sized or made-to-order product. If the seller cancels or cannot supply after taking payment, it must explain the remedy and process any accepted refund without unreasonable delay.",
        ],
      },
      {
        id: "problem",
        heading: "3. Damaged, defective, wrong or misdescribed product",
        paragraphs: [
          "Contact the seller or our grievance channel promptly if the product is damaged, defective, different from the accepted description, short in quantity, or delivered in tampered packaging. Preserve the product, tags, invoice, certificate, packaging and unboxing evidence where available.",
          "The seller may inspect the item to verify the issue. An inspection cannot remove remedies available to you under the Consumer Protection Act or other applicable law.",
        ],
      },
      {
        id: "change-of-mind",
        heading: "4. Change-of-mind returns",
        paragraphs: [
          "A general change-of-mind return is available only when the identified seller has expressly offered it in writing for that product or purchase. The seller must disclose the return window, starting date, condition requirements, exclusions, return method and any lawful deduction before payment.",
          "Unless the seller agrees otherwise, used, altered, resized, engraved, personalised or damaged jewellery; products with removed tags; missing invoices/certificates; and certain coins or made-to-order products may be ineligible for a voluntary change-of-mind return. These conditions do not override statutory remedies for defective, wrong or misdescribed goods.",
        ],
      },
      {
        id: "refunds",
        heading: "5. Refund processing",
        paragraphs: [
          "An approved refund should normally be made to the original payment source or another verified method agreed with you. Processing begins after the seller receives and, where relevant, verifies the item. Bank or payment-network settlement time may apply.",
          "The seller must explain any deduction before you accept a voluntary return or exchange. Making charges, stone value, discounts or taxes must not be deducted from a statutory remedy merely because a standard voluntary-policy deduction exists.",
        ],
      },
      {
        id: "exchange-buyback",
        heading: "6. Exchange and buyback are different",
        paragraphs: [
          "A short-term exchange, lifetime exchange and buyback are separate voluntary programmes. Their valuation can depend on current metal/stone rates, purity testing, net recoverable weight, condition, invoice and certificate, and disclosed deductions. No lifetime exchange or guaranteed buyback applies unless the seller provides written programme terms.",
        ],
      },
      {
        id: "initiate",
        heading: "7. How to request help",
        paragraphs: [
          `Contact the seller shown on your invoice or email ${businessDetails.email} with your registered mobile number, request/invoice number, product, issue, preferred resolution and supporting photographs. Do not send jewellery through an unapproved courier or to an unverified address.`,
        ],
      },
    ],
  },
  product: {
    path: "/product-disclosures",
    title: "Product, Pricing & Hallmarking Disclosures",
    shortTitle: "Pricing & Hallmarking",
    summary: "How jewellery estimates, final weights, product appearance, hallmarking and certificates should be understood.",
    sections: [
      {
        id: "estimate",
        heading: "1. Price estimates",
        paragraphs: [
          "A catalogue estimate may include the available metal rate multiplied by recorded net metal weight, plus value addition/making component, stone value and estimated tax. It may change before billing because rates, verified weight, selections and store offers change.",
          "Ask the seller for an itemised quotation showing purity, gross and net weight where applicable, metal rate and date/time, making/value-addition basis, stone details/value, discounts and tax before payment.",
        ],
      },
      {
        id: "weight",
        heading: "2. Weight and handcrafted variation",
        paragraphs: [
          "Hand finishing, sizing, stones, findings and manufacturing tolerances can cause reasonable variation between catalogue and finished weight. The verified weight recorded on the final invoice controls billing. A material variation should be disclosed for your approval before the sale is completed.",
        ],
      },
      {
        id: "images",
        heading: "3. Images, scale and colour",
        paragraphs: [
          "Images may be enlarged to show detail and are not always to scale. Lighting and display settings can change apparent colour. Natural gemstones may vary in colour, inclusion and pattern. The seller must disclose any material substitution or design change for approval.",
        ],
      },
      {
        id: "hallmark",
        heading: "4. BIS hallmark and HUID",
        paragraphs: [
          "Where Indian hallmarking law applies, the item should carry the applicable BIS hallmark components, including purity/fineness and the six-character HUID. You can verify HUID details using the BIS Care application before accepting the product.",
          "Hallmarking confirms the fineness of the precious-metal article; it does not by itself certify a diamond or coloured stone. Keep the invoice and any separate product or laboratory certificate provided for stones.",
        ],
      },
      {
        id: "invoice",
        heading: "5. Invoice and certificates",
        paragraphs: [
          "The final seller invoice should identify the seller/GSTIN and product description and include the quantities, taxable value, tax rate/amount and other legally required particulars. Jewellery-specific weight, purity, HUID and stone/certificate information should be recorded or supplied with the sale as applicable.",
        ],
      },
      {
        id: "care",
        heading: "6. Care, sizing, repair and warranty",
        paragraphs: [
          "Care, resizing, repair and manufacturing-defect warranty depend on the product and seller’s written terms. Normal wear, impact, chemical exposure, unauthorised alteration and loss of stones may not be covered by a voluntary warranty. Ask for the scope, duration, charges and exclusions before purchase.",
        ],
      },
    ],
  },
  referral: {
    path: "/referral-wallet-terms",
    title: "Referral & Wallet Terms",
    shortTitle: "Referral & Wallet",
    summary: "Rules for promotional referral eligibility, coin credits, redemptions, reversals and responsible participation.",
    sections: [
      {
        id: "nature",
        heading: "1. Nature of the programme",
        paragraphs: [
          "The referral and wallet feature is a discretionary customer loyalty programme. Coins are promotional ledger units that may be used only in the manner shown by the application or accepted by a participating store. They are not cash, stored value, a deposit, securities or an investment, and do not earn interest.",
        ],
      },
      {
        id: "eligibility",
        heading: "2. Eligibility",
        paragraphs: [
          "Referral access or benefits may begin only after an eligible billed purchase and any verification shown in the application. A referral must be genuine, attributable in our records and compliant with programme rules. Self-referrals, duplicate accounts, false transactions and misleading recruitment are prohibited.",
        ],
      },
      {
        id: "credits",
        heading: "3. Credits and reversals",
        paragraphs: [
          "The wallet ledger in the application records provisional or confirmed credits and redemptions. A credit may be corrected or reversed when the underlying invoice is cancelled, returned, refunded, edited, unpaid, fraudulent or attributed in error.",
          "A displayed estimate or referral relationship does not guarantee a credit. The programme rules or store communication must disclose the applicable earning basis, level, caps and eligibility before you rely on a benefit.",
        ],
      },
      {
        id: "redemption",
        heading: "4. Redemption",
        paragraphs: [
          "Redemption is subject to available balance, participating store acceptance, eligible products, limits and the conversion value disclosed at the time. Coins cannot be transferred, sold, inherited or withdrawn as cash unless a written programme rule expressly permits it.",
        ],
      },
      {
        id: "conduct",
        heading: "5. Responsible promotion",
        paragraphs: [
          "Do not promise guaranteed income, investment returns or employment. Do not spam, impersonate the brand, buy advertisements using our brand name without permission, or publish another person’s contact details. Participation should arise from genuine product recommendations to people you know.",
        ],
      },
      {
        id: "changes",
        heading: "6. Suspension, changes and closure",
        paragraphs: [
          "We may investigate abuse and suspend affected benefits while reviewing records. We may change or close the programme for legal, commercial or operational reasons, with reasonable notice for material changes where practicable. Confirmed redemptions and rights that cannot be excluded by law remain unaffected.",
        ],
      },
      {
        id: "tax",
        heading: "7. Tax and questions",
        paragraphs: [
          `You are responsible for personal tax obligations, if any, arising from a benefit. For a ledger correction or programme question, email ${businessDetails.email} with your registered mobile number and the relevant invoice or wallet entry.`,
        ],
      },
    ],
  },
  grievance: {
    path: "/grievance",
    title: "Customer Grievance Redressal",
    shortTitle: "Grievance Redressal",
    summary: "How to raise, track and escalate a customer or privacy complaint.",
    sections: [
      {
        id: "contact",
        heading: "1. Grievance Officer",
        paragraphs: [
          `${businessDetails.grievanceOfficer}, ${businessDetails.merchantName}`,
          `Address: ${businessDetails.address}`,
          `Email: ${businessDetails.email}`,
          `Phone: ${businessDetails.phoneDisplay}`,
        ],
      },
      {
        id: "submit",
        heading: "2. What to include",
        bullets: [
          "Registered mobile number and your name.",
          "Order-request number or invoice number, if applicable.",
          "Selected store/seller and product involved.",
          "A clear description, relevant dates and the resolution requested.",
          "Supporting invoice, certificate, photographs or messages where relevant; never email an OTP, PIN or full payment credential.",
        ],
      },
      {
        id: "timeline",
        heading: "3. Our response timeline",
        paragraphs: [
          "We aim to acknowledge a consumer complaint within 48 hours and provide a reasoned resolution within one month of receipt. Complex cases may require information from the selected store, courier, payment provider or laboratory; we will keep you informed if more information is needed.",
        ],
      },
      {
        id: "escalation",
        heading: "4. External escalation",
        paragraphs: [
          "If you are not satisfied, you may use the National Consumer Helpline at consumerhelpline.gov.in or call 1915, and may approach the Consumer Commission or another competent authority. Privacy grievances may be taken to the Data Protection Board of India when the applicable provisions and process are in force.",
          "Nothing in this process limits a statutory remedy or applicable limitation period.",
        ],
      },
    ],
  },
};

export const legalPolicyList = Object.values(legalPolicies);
