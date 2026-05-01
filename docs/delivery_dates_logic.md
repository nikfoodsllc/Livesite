# Delivery Date Resolution Algorithm — **Authoritative Spec**

## 1. Definitions (Strict)

* **Cart**: A collection of items grouped by **distinct future dates**
* **Dates**: Sorted ascending; gaps are irrelevant
* **Value(date)**: Total monetary value of items on that date
* **Minimum (MIN)**: Single global minimum order value for the entire cart
* **Accumulator (ACC)**: Running total of values for the current chain
* **Chain**: A contiguous forward grouping of dates whose values are accumulated together
* **Delivery Day**: A date on which the accumulated value of its chain is ≥ MIN
* **Blocked Cart**: A cart for which no valid delivery plan exists

---

## 2. Hard Invariants (Must Always Hold)

These are **non-negotiable**. Any violation means the logic is wrong.

1. Every cart item must belong to **exactly one** delivery day
2. Every delivery day must have **total assigned value ≥ MIN**
3. Carry-forward is **forward-only** (never backward)
4. No delivery happens until the **entire cart is evaluated**
5. Cart is either:

   * fully deliverable, or
   * fully blocked (no partial success)
6. Zero-value dates **do not exist**
7. Evaluation must be **deterministic and idempotent**

---

## 3. High-Level Strategy (Conceptual)

The algorithm:

* Scans dates **once, forward**
* Builds **delivery chains**
* Decides **when a chain must be extended**
* Decides **when a chain can be finalized**
* Ensures **no future date is stranded below MIN**

This is a **partitioning problem**, not a greedy minimum-check.

---

## 4. Core Rule (The Most Important One)

> **A delivery chain MUST continue forward if finalizing it would leave any future date that cannot reach MIN on its own or with remaining future dates.**

This rule overrides all “early delivery” instincts.

---

## 5. Algorithm (Step-by-Step, Deterministic)

### Step 1: Pre-check

* Let `TOTAL = sum of Value(date) for all dates`
* If `TOTAL < MIN`:

  * **Block cart**
  * Exit

---

### Step 2: Initialize

* `ACC = 0`
* `DELIVERIES = empty list`
* `i = 0` (index over dates)

---

### Step 3: Forward Scan

While `i < number of dates`:

1. Start a new chain:

   * `ACC = 0`
   * `chain_start = i`

2. Extend the chain forward:

   * Add `Value(date[i])` to `ACC`
   * Increment `i`

3. If `ACC < MIN`:

   * Continue extending the chain
   * If no more dates exist:

     * **Block cart**
     * Exit

4. If `ACC >= MIN`:

   * The chain is **eligible**
   * **DO NOT finalize yet**
   * You must decide whether to extend or finalize

---

### Step 4: Finalization Decision (Critical Logic)

When `ACC >= MIN`, evaluate the **remaining tail**:

* Let `REMAINING_TOTAL = sum of Value(date[j]) for all j >= i`

#### Case A — No remaining dates

* Finalize chain
* Delivery day = **last date in the chain**
* Add to `DELIVERIES`
* Exit loop

#### Case B — Remaining dates exist

You **MUST extend the chain** if:

* `REMAINING_TOTAL < MIN`

Reason:

* Finalizing now would strand the tail

Otherwise:

* It is **safe to finalize**

---

### Step 5: Finalize Chain (When Safe)

* Delivery day = **last date included in the chain**
* Assign all chain values to this delivery
* Add delivery day to `DELIVERIES`
* Reset `ACC`
* Continue outer loop from current `i`

---

## 6. End of Scan

* If all dates are consumed and all chains finalized:

  * **Delivery plan is valid**
* Else:

  * **Block cart**

---

## 7. Explicitly Forbidden Behaviors

The algorithm must **never**:

* Finalize a chain just because MIN is met
* Leave leftover value < MIN at the end
* Merge backward
* Split a date across deliveries
* Deliver the same value twice
* Apply a “last-day override” after any delivery is already planned
* Depend on execution-time delivery state

---

## 8. Worked Example (Your Last Case)

### Input

* Day 1 ≥ MIN
* Day 2 + Day 3 ≥ MIN
* Day 4 ≥ MIN
* Day 5 < MIN

### Result

* Delivery on **Day 1**
* Delivery on **Day 3**
* Delivery on **Day 5** (Day 4 + Day 5)

Why:

* Finalizing Day 4 alone would strand Day 5
* Therefore the chain must extend

---

## 9. Final Guarantee

If this algorithm:

* accepts a cart → **every item will be delivered legally**
* blocks a cart → **no valid delivery plan exists under the rules**

There are **no undefined states**.
---------------------------

Below is the **final, no-nonsense deliverable**:

1. a **formal decision table**
2. a **test-case matrix** that exhaustively proves correctness

No prose fluff. This is what you hand to engineers and QA.

---

# 1️⃣ FORMAL DECISION TABLE (ZERO AMBIGUITY)

### Legend

* `ACC` = accumulator for current chain
* `MIN` = global minimum
* `REMAIN` = total value of all future unprocessed dates
* `FINALIZE` = close current chain and create delivery
* `EXTEND` = include next date in current chain
* `BLOCK` = cart invalid

---

## Decision Point: After Adding a Date to a Chain

| Condition | ACC < MIN | ACC ≥ MIN | REMAIN = 0 | REMAIN < MIN | Action   |
| --------- | --------- | --------- | ---------- | ------------ | -------- |
| 1         | ✅         | ❌         | –          | –            | EXTEND   |
| 2         | ❌         | ✅         | ✅          | –            | FINALIZE |
| 3         | ❌         | ✅         | ❌          | ✅            | EXTEND   |
| 4         | ❌         | ✅         | ❌          | ❌            | FINALIZE |
| 5         | ✅         | ❌         | ✅          | –            | BLOCK    |

### Explanation (compressed)

* **Rule 1**: Below minimum → must extend
* **Rule 2**: Meets minimum, no future dates → finalize
* **Rule 3**: Meets minimum but remaining tail cannot stand alone → extend
* **Rule 4**: Meets minimum and tail can resolve → finalize
* **Rule 5**: End reached but still below minimum → block

This table is **complete**.
No other state combinations exist.

---

# 2️⃣ TEST-CASE MATRIX (EXHAUSTIVE, MINIMAL)

Each case validates **one invariant or branch**.
If all pass, the logic is correct.

---

## A. Base / Boundary Cases

| Case | Dates (values) | Expected Result                  |
| ---- | -------------- | -------------------------------- |
| A1   | [10], MIN=10   | Deliver Day 1                    |
| A2   | [9], MIN=10    | BLOCK                            |
| A3   | [10, 0] ❌      | Invalid input (zero not allowed) |

---

## B. Simple Carry-Forward

| Case | Dates   | Expected Deliveries |
| ---- | ------- | ------------------- |
| B1   | [4,6]   | Day 2               |
| B2   | [3,3,4] | Day 3               |
| B3   | [9,1]   | Day 2               |

---

## C. Early Minimum but Forced Extension

| Case | Dates    | Why             | Expected     |
| ---- | -------- | --------------- | ------------ |
| C1   | [10,1]   | Tail stranded   | Day 2        |
| C2   | [10,1,9] | Tail rescued    | Day 1, Day 3 |
| C3   | [10,1,1] | Tail impossible | Day 3        |

---

## D. Multiple Independent Chains

| Case | Dates      | Expected Deliveries |
| ---- | ---------- | ------------------- |
| D1   | [5,5,5,5]  | Day 2, Day 4        |
| D2   | [6,4,6,4]  | Day 2, Day 4        |
| D3   | [10,10,10] | Day 1, Day 2, Day 3 |

---

## E. Tail-Merge Enforcement (Critical)

| Case | Dates       | Explanation      | Expected     |
| ---- | ----------- | ---------------- | ------------ |
| E1   | [10,10,1]   | Day 3 stranded   | Day 3        |
| E2   | [10,10,9]   | Tail rescued     | Day 1, Day 2 |
| E3   | [10,10,1,9] | Tail saved later | Day 1, Day 4 |

---

## F. Your Exact Scenarios (Regression)

| Case | Dates                                       | Expected            |
| ---- | ------------------------------------------- | ------------------- |
| F1   | [D1+D2 ≥ MIN, D3 < MIN]                     | Day 3               |
| F2   | [D1 ≥ MIN, D2+D3 ≥ MIN, D4 ≥ MIN, D5 < MIN] | Day 1, Day 3, Day 5 |

---

## G. Hard Block (No Valid Partition)

| Case | Dates              | Reason        | Expected |
| ---- | ------------------ | ------------- | -------- |
| G1   | [3,3,3]            | Total < MIN   | BLOCK    |
| G2   | [6,4,3]            | Tail stranded | BLOCK    |
| G3   | [10,1] with MIN=12 | Cannot reach  | BLOCK    |

---

## H. Determinism / Idempotency

| Case | Action                   | Expected           |
| ---- | ------------------------ | ------------------ |
| H1   | Run evaluation twice     | Same delivery plan |
| H2   | Reverse internal loops ❌ | Must fail tests    |
| H3   | Partial finalize ❌       | Must fail tests    |

---

# 3️⃣ GLOBAL INVARIANTS (ASSERT AFTER EVERY RUN)

These must be asserted programmatically or in tests:

1. **Value Conservation**

   ```
   sum(all cart values) == sum(all delivered values)
   ```

2. **No Undelivered Residue**

   ```
   every cart date ∈ exactly one delivery chain
   ```

3. **Minimum Guarantee**

   ```
   for each delivery: delivery_value ≥ MIN
   ```

4. **Forward-Only Assignment**

   ```
   no date contributes to an earlier delivery
   ```

---