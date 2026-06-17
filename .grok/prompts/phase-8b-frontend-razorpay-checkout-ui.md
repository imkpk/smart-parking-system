Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 8b only: Frontend Razorpay Checkout UI.

Create a new branch from latest develop:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/phase-8b-frontend-razorpay-checkout-ui
```

Important:
Phase 8a must already be merged into develop because this phase depends on:

* `POST /api/payments/verify`
* Razorpay signature verification support
* Razorpay payment provider fields in payment response

If Phase 8a is not present, stop and report:
"Phase 8a must be merged first."

Do not change backend unless absolutely required for frontend type alignment.
Do not change payment-service unless absolutely required.
Do not add webhook in this phase.
Do not add refund flow.
Do not remove MOCK provider.
Do not commit real Razorpay keys.
Do not expose Razorpay secret in frontend.
Do not merge the PR.

Goal:
Add frontend support for Razorpay checkout popup and payment verification.

Current state:

* MOCK provider works.
* RAZORPAY provider creates a Razorpay order and stores `gatewayOrderId`.
* Payment-service has `POST /api/payments/verify`.
* Frontend Razorpay checkout UI is pending.

Scope:
Frontend primary:

* frontend/src/api/paymentsApi.ts
* frontend/src/pages/payments or payment-related page/components
* frontend/src/types/payment types if present
* frontend env example / README if present
* shared components only if needed

Payment service/backend:

* Only inspect if frontend types do not match response shape.
* Avoid changes unless necessary.

Expected frontend behavior:

1. Payments page shows Razorpay payments clearly.
2. For payment records:

   * status = INITIATED
   * provider = RAZORPAY
   * gatewayOrderId exists
     Show `Pay Now` action for allowed users.
3. Clicking `Pay Now` opens Razorpay Checkout popup.
4. On Razorpay success callback:

   * collect `razorpay_order_id`
   * collect `razorpay_payment_id`
   * collect `razorpay_signature`
5. Call payment-service verify endpoint:

   * `POST /api/payments/verify`
6. On verify success:

   * refresh payment list
   * show success snackbar
   * payment status should become SUCCESS
7. On verify failure:

   * show friendly error snackbar
   * do not mark payment success in UI manually

Razorpay frontend key:
Use public key only:

* `VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx`

Do not use or expose:

* `RAZORPAY_KEY_SECRET`
* backend secrets
* payment-service secrets

Razorpay script:
Load Razorpay checkout script safely:
`https://checkout.razorpay.com/v1/checkout.js`

Implementation suggestions:

1. Create a small reusable script loader:

   * `frontend/src/lib/loadRazorpayScript.ts`
     or
   * `frontend/src/utils/loadRazorpayScript.ts`

2. Create clear Razorpay types:

   * `RazorpayCheckoutOptions`
   * `RazorpaySuccessResponse`

3. Add API method:

   * `verifyRazorpayPayment(request)`

Request body:

```json
{
  "paymentId": 10,
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature_xxx"
}
```

4. Payment response should support fields:

   * id
   * amount
   * currency
   * status
   * provider
   * gatewayOrderId
   * gatewayStatus
   * providerReference

5. Keep existing MOCK admin actions working:

   * mock success
   * mock failure

6. Do not show Pay Now for:

   * MOCK payments
   * SUCCESS payments
   * FAILED payments
   * REFUNDED payments
   * RAZORPAY payments missing gatewayOrderId

Role rules:

* USER can pay own Razorpay payments.
* ADMIN can pay/verify if existing access allows.
* SECURITY should not get user payment checkout action unless current product logic intentionally allows it.
* Do not loosen access.

UI rules:

* Keep table readable.
* Keep business labels like Receipt No, Booking No, Customer, Amount, Status.
* Do not expose raw technical IDs in normal table.
* Use DetailsDialog technical section if needed.
* Use existing AppSnackbar / SearchField / EmptyState / StatusChip patterns.
* Do not create duplicate components if shared components exist.

Error handling:
Show friendly snackbar for:

* Razorpay script failed to load
* Missing `VITE_RAZORPAY_KEY_ID`
* Payment missing `gatewayOrderId`
* Razorpay popup failed/cancelled
* Verify endpoint rejected signature
* Payment already verified
* Payment-service unavailable

Tests:
Frontend tests should cover:

* Pay Now button visible only for INITIATED RAZORPAY payments with gatewayOrderId
* Pay Now hidden for MOCK/SUCCESS/FAILED payments
* Missing Razorpay key shows friendly error
* Successful Razorpay callback calls verify API
* Verify success refreshes list or invalidates query
* Verify failure shows error

Run:

```bash
cd frontend
npm run build
```

Run backend/payment-service tests only if those projects are changed:

```bash
cd backend
npm run build
npm run test:cov
```

```bash
cd payment-service
mvn clean test
mvn clean package
```

Manual test:
MOCK mode:

1. Payment-service provider MOCK.
2. Payments page still loads.
3. Admin mock success/failure still works.
4. Razorpay Pay Now button should not appear for MOCK payments.

RAZORPAY mode:

1. Set payment-service provider RAZORPAY with test credentials if available.
2. Set frontend `VITE_RAZORPAY_KEY_ID`.
3. Create booking → check-in → checkout.
4. Confirm payment is INITIATED with provider RAZORPAY and gatewayOrderId.
5. Open frontend payments page.
6. Click Pay Now.
7. Razorpay checkout opens.
8. Complete test payment if test credentials are available.
9. Verify endpoint marks payment SUCCESS.
10. Payment list refreshes and shows SUCCESS.

Without test keys:

1. Confirm frontend build passes.
2. Confirm Pay Now button visibility logic works with mocked/sample data if available.
3. Document live Razorpay payment as pending test credentials.

Documentation:
Create report:
`.grok/reports/phase-8b-frontend-razorpay-checkout-ui.md`

Report must include:

1. Files changed
2. Razorpay UI behavior
3. Verify API integration
4. Role/access behavior
5. Tests added
6. Build result
7. Manual test result
8. Pending issues

Commit:

```bash
git status
git add .
git commit -m "Add frontend Razorpay checkout UI"
git push -u origin feature/phase-8b-frontend-razorpay-checkout-ui
```

Open a PR to develop:
Title:
`Add frontend Razorpay checkout UI`

PR body:

* Summary
* Razorpay UI behavior
* Verify API integration
* Validation
* Manual smoke test
* Pending issues

Do not merge the PR.
