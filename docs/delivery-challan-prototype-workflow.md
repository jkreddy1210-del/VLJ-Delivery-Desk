# Delivery Challan Prototype Workflow

## Purpose
This document freezes the prototype business model before final GST/Tally implementation.

### Core dimensions
- **Direction:** OUTWARD or INWARD. This describes the physical movement of goods and drives stock movement.
- **Delivery Type / Purpose:** APPROVAL, JOB_WORK, MARKETING. This classifies the business reason and should not itself change stock sign.
- **Movement Method:** BY HAND, BY ROAD, BY AIR, BY AIR/ROAD, BY RAIL, BY SEA, COURIER, or other applicable method.
- **References:** A movement may optionally point to an earlier voucher or commercial document. Prototype UI can capture these references before the final relationship model is fixed.

## Examples

### Approval: we send
OUTWARD + APPROVAL -> stock leaves VLJ.
A subsequent return of unwanted goods is a new INWARD movement referencing the original voucher.
Selected goods can later be invoiced without deleting or rewriting the physical movement history.

### Approval: we receive
INWARD + APPROVAL -> stock enters VLJ.
A subsequent return of unwanted goods is a new OUTWARD movement referencing the original voucher.
Retained goods can later be purchased/invoiced separately.

### Job work
OUTWARD + JOB_WORK -> stock sent to job worker.
INWARD + JOB_WORK -> processed/returned stock received from job worker.
Outstanding quantities must remain visible until accounted for.

### Marketing
OUTWARD + MARKETING -> stock leaves VLJ for marketing.
INWARD + MARKETING -> stock returns to VLJ.

### Repair
Repair is represented by the same delivery challan format and movement model. Purpose text can say the actual business reason (for example, stock sent for repair). A return is a separate opposite-direction movement.

### Post-invoice return
After a tax invoice exists, a physical return is still a new physical movement. It must reference the original invoice and can separately reference the applicable credit/debit note. The original invoice and original challan remain intact.

### By-hand movement
BY HAND describes how goods moved, not whether the movement is inward or outward.

## Prototype principles
1. Do not use Customer/Vendor classification as the authoritative direction of a voucher.
2. Do not use a manual "Stock Received" status transition to post inventory.
3. A saved movement posts stock according to its direction.
4. Returns are new movements, not edits to historical movements.
5. Historical voucher identity and physical movement history should remain stable once posted.
6. The printed challan should retain the company's existing basic Delivery Challan format; purpose text and transaction data change, not the overall document format.
7. GST/e-way-bill/Tally reporting rules are a later implementation layer and must not be inferred solely from the prototype purpose labels.
