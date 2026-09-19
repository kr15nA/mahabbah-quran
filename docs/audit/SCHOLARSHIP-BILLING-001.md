# SCHOLARSHIP-BILLING-001 Phase 0 Audit

## A. Current Finance Architecture

**Invoice Model**: 
`financeInvoices` represents an invoice with a single flat `amount`. There is no `invoice_lines` table. The `amount` field must be strictly `> 0` due to a database constraint (`finance_invoices_amount_chk`).

**Payment Allocation**: 
`financePaymentAllocations` links `paymentId` to `invoiceId` with an `allocatedAmount`.

**Outstanding Formula**: 
Calculated at runtime (e.g., in `getInvoiceDetails` and `reconcileInvoiceStatus`).
`Outstanding = Invoice.amount - Sum(Allocations where Payment is CONFIRMED)`.

**Posting Model**: 
Invoices are posted to the ledger upon `ISSUED` status:
- Debit: `feeType.receivableAccountId` (Asset)
- Credit: `feeType.incomeAccountId` (Income)
For the full `invoice.amount`.

Payments are posted upon `CONFIRMED`:
- Debit: `payment.destinationAccountId` (Asset/Bank)
- Credit: `feeType.receivableAccountId` (Asset)

**Reversal Model**: 
Canceling an `ISSUED` invoice reverses the exact original Journal Entry. Payments can be canceled if `PENDING`.

**Money Representation**: 
PostgreSQL `bigint` (no floating point issues), mapped to TypeScript `bigint`.

**Restricted Fund Model**: 
Funds (`financeFunds`) have `restrictionType: 'RESTRICTED' | 'UNRESTRICTED'`. All ledger lines (`financeJournalLines`) require a `fundId`. Invoices use `feeType.defaultFundId`.

**Existing Discount/Waiver Model**: 
None exists. `amount` is currently both the gross charge and the net payable.

## B. Production Read-Only Precheck

Using the local Neon read-only clone (`scripts/inspect-finance.ts`):
- **Students**: 128
- **Open Invoices**: 4
- **Overdue Invoices**: 0
- **Existing Apparent Discount Cases**: 0

## C. Recommended Scholarship Domain

**Recommendation**: **OPTION A** (Gross Invoice + Scholarship Adjustment/Credit) via a side-table.

**Why not Option B (Net Invoice)?** 
Because `financeInvoices.amount` has a strict database check `> 0`. A 100% scholarship would result in a Net Payable of 0, which would fail insertion. Furthermore, accounting standard dictates recognizing the full gross revenue and a corresponding contra-revenue/expense for the scholarship.

**Why not Option C (Gross + Lines)?**
There is no existing invoice lines architecture. Introducing it would require rewriting every single existing billing query and UI component.

**Why not Option D (Virtual Payment)?**
Treating a scholarship as a `financePayments` record pollutes the cash-flow metrics. A payment requires a `destinationAccountId` (an ASSET). Scholarships are Expenses/Contra-Revenue, not Cash Assets. 

### Proposed Model:
- Keep `financeInvoices.amount` as the **Gross Charge**.
- Create a new table `finance_invoice_scholarships` bridging an invoice to a scholarship, capturing the `amount` of the discount.
- **Net Payable Formula**: `Net = Invoice.amount - Sum(InvoiceScholarships.amount)`.
- **Outstanding Formula**: `Outstanding = Net - Sum(PaymentAllocations)`.

### Entities & Relationships
1. `scholarship_programs`: Defines the scholarship (Name, Type: Full/Percentage/Fixed, Expense Account, Fund ID).
2. `student_scholarships`: Awards a program to a student for a specific academic year/period.
3. `finance_invoice_scholarships`: The immutable snapshot of a scholarship applied to a specific invoice at the time of drafting.

### Accounting Integration
When an invoice with a scholarship is `ISSUED`, the Journal Entry should be:
- Debit: `feeType.receivableAccountId` (Net Payable Amount)
- Debit: `scholarship.expenseAccountId` (Scholarship Amount)
- Credit: `feeType.incomeAccountId` (Gross Invoice Amount)

This keeps the journal balanced, recognizes full income, properly tracks the expense, and only debits the receivable for what the student actually owes.

### Constraints & Edge Cases
- **Overpayment Behavior**: Net Payable cannot drop below 0. A scholarship amount cannot exceed the Gross invoice amount.
- **Revocation Behavior**: Modifying/revoking a `student_scholarship` does **not** retroactively change already `ISSUED` invoices. It only applies to future drafts. If an existing invoice needs changing, it must be `CANCELLED` (reversing the ledger) and re-drafted.
- **Zero-Net Invoices**: If Net Payable is 0 (100% scholarship), the invoice status should immediately transition to `PAID` upon issuance, as no cash collection is required.

## D. Schema Migration Required

**Proposed Tables**:
```ts
export const scholarshipPrograms = pgTable('scholarship_programs', { ... })
export const studentScholarships = pgTable('student_scholarships', { ... })
export const financeInvoiceScholarships = pgTable('finance_invoice_scholarships', {
  invoiceId: bigint... references financeInvoices,
  scholarshipId: bigint... references studentScholarships,
  amount: bigint...
})
```

## E. Parent Finance Impact
The UI must be updated to display:
- **Gross**: `invoice.amount`
- **Scholarship**: `invoiceScholarship.amount`
- **Net Payable**: `Gross - Scholarship`
- **Paid**: `allocations`
- **Remaining**: `Net - Paid`

## F. Phase Plan

- **Phase A**: Schema definition (`scholarshipPrograms`, `studentScholarships`, `financeInvoiceScholarships`), domain CRUD logic, and the calculation engine that drafts invoices with scholarships.
- **Phase B**: Update `issueInvoice` ledger posting to handle the three-way journal split, update `reconcileInvoiceStatus` and `getInvoiceDetails` to factor in scholarship deductions.
- **Phase C**: Admin UI for managing scholarship programs and awarding them to students.
- **Phase D**: Update Guru, Parent, and Student portals to display the gross/scholarship/net breakdown visually. Update recurring billing crons to auto-attach active scholarships.

## G. PHASE A IMPLEMENTATION

**LIVE BILLING INTEGRATION**: NOT YET ENABLED
**Existing invoices**: UNCHANGED
**Outstanding**: UNCHANGED
**Ledger**: UNCHANGED
**Parent Finance**: UNCHANGED

### Schema
The following tables were introduced via `drizzle/migrations/0019_pale_sabretooth.sql`:
- `scholarship_programs`: Central definition of a scholarship (type, fixed amount, percentage).
- `scholarship_program_fee_types`: Binds a program to eligible `feeTypeIds`.
- `student_scholarships`: Awards a program to a specific student for a specific `academicYearId`.
- `finance_invoice_scholarships`: Snapshots the scholarship benefit onto an invoice when drafted.

### Constraints & Indexes
- Check constraints ensure `calculationType` is one of `PERCENTAGE`, `FIXED_AMOUNT`, `FULL`.
- Percentage ranges are constrained `> 0` and `<= 10000`.
- Snapshot `scholarship_amount` is constrained to be `>= 0` and `<= gross_eligible_amount`.
- Indexes created for fast lookups on active `student_scholarships` and `finance_invoice_scholarships` by `invoice_id`.

### Calculation Model
Implemented a pure calculation engine in `calculateScholarshipBenefit`:
- **Rounding**: Percentage math uses BigInt: `(gross * basis_points) / 10000n`, which truncates fractions (floor).
- **FULL**: 100% of gross.
- **FIXED**: Fixed amount, capped at gross.
- **PERCENTAGE**: Exact basis points application.
No negative net payables are ever produced.

### Fee Scope & Unit Isolation
- **Fee Scope**: Handled strictly via `scholarship_program_fee_types`. A scholarship only applies if the invoice `feeTypeId` is listed in this mapping table.
- **Unit Isolation**: Managed by bounding awards to specific `academicYearId` records which inherently scope to the correct institutional period.
- **Effective Period**: Bound to the exact `academicYearId` and constrained by `startDate` / `endDate` in `student_scholarships`.

### Stacking V1
- V1 strictly denies assigning an active scholarship to a student in an academic year if another active scholarship already covers the same `feeTypeId`. This is enforced transactionally during assignment.

### Accounting Configuration
- Draft programs can exist without accounting configuration.
- To `ACTIVATE` a program, `fundingFundId` and `scholarshipAccountId` MUST be configured.
- Audit actions introduced: `SCHOLARSHIP_PROGRAM_CREATE`, `SCHOLARSHIP_PROGRAM_UPDATE`, `SCHOLARSHIP_PROGRAM_ACTIVATE`, `SCHOLARSHIP_PROGRAM_DEACTIVATE`, `STUDENT_SCHOLARSHIP_ASSIGN`, `STUDENT_SCHOLARSHIP_UPDATE`, `STUDENT_SCHOLARSHIP_REVOKE`.
