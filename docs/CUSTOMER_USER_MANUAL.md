# Sai Suryaa Jewellers Customer Application — User Manual

**Applies to:** Customer frontend and customer backend  
**Channels:** Customer website and supported mobile application builds  
**Document version:** 2026-07-19

## 1. Purpose

The customer application allows customers to explore the Sai Suryaa Jewellers catalogue, save favourites, send jewellery requests to a preferred store, maintain account details, review completed invoices, and view eligible wallet and referral activity.

Sending a product request is not an online purchase. The selected store confirms availability, actual weight, current metal rate, charges, discounts, tax, billing, fulfilment, and payment before completing a sale.

The customer frontend provides the service to the customer. The customer backend validates identity and profile information, protects account-specific records, validates order requests, and returns the customer’s catalogue, favourite, invoice, wallet, and referral data.

## 2. Signing in with mobile OTP

Password login has been replaced by mobile OTP login.

1. Enter a valid mobile number.
2. Request an OTP.
3. Enter the OTP received through the configured SMS provider.
4. After successful verification, the application signs in and securely identifies the customer for account-specific actions.

If the mobile number is not yet registered, successful OTP verification can create a basic customer account automatically. Complete the account profile before submitting a jewellery request.

### OTP protections

- A short resend cooldown prevents repeated OTP requests.
- An OTP expires after the configured validity period.
- An OTP can be used only once.
- Repeated incorrect attempts require a new OTP.
- The application provides messages for expired, already-used, invalid, or prematurely re-requested OTPs.

The local development bypass is available only when explicitly enabled in a development environment. It is not a production sign-in method.

## 3. Customer profile

The following profile details are required before a store request can be submitted:

- Full name
- Valid email address
- Mobile number
- Delivery address
- State

The backend verifies that the signed-in customer is updating their own account. Email addresses are normalized and must be unique. If an email belongs to another account, the update is rejected with the message “This email is already registered to another account.”

Keep the address and state accurate because they are used to find relevant stores and to prepare billing records.

## 4. Catalogue and product information

Customers can browse and search jewellery using the available product information, including:

- Product type, category, sub-category, and labels
- Metal type and purity
- Product descriptions and images
- Weight and stone information where provided
- Estimated or current catalogue price
- Related products

Filters and sorting change only the displayed catalogue results. They do not change product data.

Catalogue prices are informative until a store confirms the product’s actual weight, current metal rate, charges, discount, and tax. Product availability is also confirmed by the selected store.

## 5. Favourites

A signed-in customer can save products to Favourites and remove them later.

- Saving an already-favourited product does not create a duplicate.
- Removing a product that is no longer saved is treated safely and does not affect other account data.
- Favourites are private to the signed-in customer.
- A product removed from the live catalogue may no longer be available in Favourites, while historical invoice information remains protected separately.

## 6. Request bag

Add catalogue products to the request bag and review the selection before choosing a store.

For each product, the quantity must be a whole number between **1 and 20**. Invalid product identifiers or quantities are rejected by the backend even if a request is submitted outside the normal application flow.

Amounts shown in the request bag are estimates. No payment is collected when the request is submitted.

## 7. Selecting a store and submitting a request

Before submitting:

1. Sign in with mobile OTP.
2. Complete all required profile fields.
3. Add at least one valid product to the request bag.
4. Search for a store using a district or state name.
5. Select the preferred store.
6. Review and accept the current Order Request Terms and Privacy Notice.
7. Submit the request.

The backend verifies the selected store, the signed-in customer, the full profile, every requested product and quantity, and the accepted terms version.

If the terms have changed since the request page was opened, review the current terms and submit again.

After a successful submission:

- A unique order request number is created.
- The request begins in `Pending` status.
- The selected store receives the request details.
- The store contacts the customer to confirm availability, pricing, billing, fulfilment, and payment.

An order request is not a tax invoice, confirmed sale, reservation guarantee, or payment confirmation.

## 8. Customer order and billing lifecycle

The selected store reviews the request and may record an expected delivery date, address confirmation, payment information, and an advance when agreed with the customer.

The advance stored against the order represents the total advance received. Repeated saves by staff do not duplicate it. When the final invoice is created, the stored advance is deducted from the final amount receivable.

After a successful invoice is generated, the source request is completed. Completed requests cannot be edited by staff through the normal order-update process.

## 9. My Orders and invoices

My Orders lists invoices that belong to the signed-in customer. Records are paginated and ordered from newest to oldest.

Opening an invoice can show:

- Invoice number and date
- Seller/store snapshot
- Customer details
- Purchased items, HSN information, quantity, and taxable values
- GST and invoice total
- Payment information
- Wallet coins credited or redeemed for that invoice

Only the customer who owns an invoice can retrieve it through the customer backend. Another customer’s invoice number does not grant access.

Historical invoices retain the seller and product information recorded at billing time, even if the live store or product catalogue is later changed.

## 10. Wallet activity

Eligible customers can view their wallet balance and recent wallet transactions. A transaction can contain:

- Credit or debit amount in coins
- Source and note
- Transaction date
- Related invoice number when applicable

Wallet redemption during billing uses the configured redemption value and cannot exceed the available balance or permitted billing discount.

Returns, exchanges, or invoice corrections can recalculate wallet and referral transactions so the final coin balance matches the retained sale value.

## 11. Referrals

Referral access becomes available after the customer has an eligible Sai Suryaa Jewellers bill.

Depending on the account and approved referral relationship, the customer can review:

- Referral wallet balance
- Recent wallet activity
- Level-wise referral commission totals
- The level with the highest eligible commission
- Downloadable commission details

New or changed referral relationships can require admin approval. A referral code or “join company” choice creates a pending referral request rather than immediately changing the approved referral tree.

Commission data is based on completed billing records. Returns and invoice corrections can create recalculation entries.

## 12. Privacy and account protection

- OTPs must not be shared with store staff or other customers.
- Use only your own mobile number and account.
- Sign out on shared devices.
- Review the Privacy Notice, Terms of Use, Order Request Terms, and Referral Wallet Terms before using the related service.
- Customer invoices, favourites, profile details, and authenticated wallet information are protected by account identity checks.

## 13. Common messages and actions

| Message or condition | What to do |
|---|---|
| Valid mobile number is required | Enter a supported mobile number with at least 10 digits. |
| OTP already sent | Wait for the displayed cooldown before requesting another OTP. |
| OTP expired or already used | Request a new OTP. |
| Too many attempts | Request a new OTP and enter the latest code. |
| Email already registered | Use the email already associated with this account or enter another unique email. |
| Complete all profile fields | Add full name, email, mobile, address, and state in Account Settings. |
| Enter district or state name | Enter at least two characters and search again. |
| No store found | Review the location or view the available store locations. |
| Selected store not found | Refresh the store list and select an active store. |
| Review current terms | Reopen the current Order Request Terms, accept them, and submit again. |
| Invalid product or quantity | Return to the request bag and use a quantity from 1 to 20. |
| Invoice not found | Confirm the invoice belongs to the signed-in account. |
| Failed to load data | Check connectivity, sign in again if the session expired, and retry. |

## 14. Frontend and backend responsibilities

### Customer frontend

- Collects sign-in, profile, favourite, request, store, and account actions
- Displays catalogue, invoice, wallet, and referral information returned by the services
- Prevents known invalid actions before submission
- Shows meaningful validation or service messages

### Customer backend

- Issues authenticated customer sessions after OTP verification
- Creates a basic account for a successfully verified new mobile number
- Enforces profile ownership and unique-email rules
- Validates order products, quantities, stores, and legal terms
- Protects customer-specific favourites and invoices
- Returns product, taxonomy, store, invoice, wallet, and referral data

### Shared admin backend behavior affecting customers

- Preserves historical invoice information when live products are deleted
- Stores billing-day metal rates and seller snapshots
- Deducts approved advances and wallet redemption from final billing
- Preserves invoice adjustments and recalculates wallet/commission data after authorized returns or corrections
- Prevents completed orders from being modified

## 15. Important business statement

Browsing, favouriting, or submitting an order request does not complete a purchase. A sale is completed only after the store confirms product availability and final commercial details, generates the applicable invoice, and completes the agreed payment and fulfilment process.

