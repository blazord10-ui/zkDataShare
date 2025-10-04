(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-PROOF u101)
(define-constant ERR-INVALID-STUDY-ID u102)
(define-constant ERR-INVALID-PROOF-TYPE u103)
(define-constant ERR-PROOF-ALREADY-SUBMITTED u104)
(define-constant ERR-INVALID-METADATA u105)
(define-constant ERR-STUDY-NOT-ACTIVE u106)
(define-constant ERR-INVALID-PARAM u107)
(define-constant ERR-PROOF-EXPIRED u108)
(define-constant ERR-INVALID-SIGNATURE u109)
(define-constant ERR-INVALID-COMMITMENT u110)
(define-constant ERR-VERIFIER-NOT-SET u111)
(define-constant ERR-INVALID-EXPIRY u112)
(define-constant ERR-MAX-PROOFS-EXCEEDED u113)
(define-constant ERR-INVALID-PROOF-LENGTH u114)
(define-constant ERR-INVALID-PROOF-FORMAT u115)
(define-constant ERR-INVALID-VERIFIER u116)
(define-constant ERR-INVALID-REWARD u117)
(define-constant ERR-INSUFFICIENT-REWARD u118)
(define-constant ERR-REWARD-ALREADY-CLAIMED u119)
(define-constant ERR-INVALID-CLAIM u120)
(define-constant ERR-INVALID-UPDATE u121)
(define-constant ERR-UPDATE-NOT-ALLOWED u122)
(define-constant ERR-INVALID-TIMESTAMP u123)
(define-constant ERR-INVALID-STATUS u124)
(define-constant ERR-INVALID-ROLE u125)
(define-constant ERR-INVALID-ACCESS u126)
(define-constant ERR-INVALID-ORACLE u127)
(define-constant ERR-ORACLE-NOT-VERIFIED u128)
(define-constant ERR-INVALID-EVENT u129)
(define-constant ERR-INVALID-QUERY u130)

(define-data-var next-proof-id uint u0)
(define-data-var max-proofs-per-study uint u100)
(define-data-var submission-fee uint u10)
(define-data-var verifier-contract (optional principal) none)
(define-data-var oracle-contract (optional principal) none)
(define-data-var reward-pool uint u0)
(define-data-var min-reward uint u5)
(define-data-var expiry-duration uint u144)

(define-map proofs
  { proof-id: uint }
  {
    study-id: uint,
    proof: (buff 512),
    proof-type: (string-ascii 32),
    metadata: (string-utf8 256),
    submitter: principal,
    timestamp: uint,
    expiry: uint,
    commitment: (buff 32),
    signature: (buff 65),
    status: bool,
    reward-claimed: bool
  }
)

(define-map proofs-by-study
  { study-id: uint }
  { proof-ids: (list 100 uint) }
)

(define-map proof-updates
  { proof-id: uint }
  {
    update-metadata: (string-utf8 256),
    update-timestamp: uint,
    updater: principal
  }
)

(define-map study-status { study-id: uint } { active: bool })
(define-map user-roles { user: principal } { role: (string-ascii 20) })

(define-trait verifier-trait
  (
    (verify-proof ((buff 512) uint (buff 32)) (response bool uint))
  )
)

(define-read-only (get-proof (id uint))
  (map-get? proofs { proof-id: id })
)

(define-read-only (get-proof-updates (id uint))
  (map-get? proof-updates { proof-id: id })
)

(define-read-only (get-proofs-for-study (study-id uint))
  (default-to { proof-ids: (list) } (map-get? proofs-by-study { study-id: study-id }))
)

(define-read-only (get-study-status (study-id uint))
  (default-to false (get active (map-get? study-status { study-id: study-id })))
)

(define-read-only (get-user-role (user principal))
  (default-to "none" (get role (map-get? user-roles { user: user })))
)

(define-private (validate-proof (proof (buff 512)))
  (if (and (> (len proof) u0) (<= (len proof) u512))
      (ok true)
      (err ERR-INVALID-PROOF))
)

(define-private (validate-study-id (id uint))
  (if (> id u0)
      (ok true)
      (err ERR-INVALID-STUDY-ID))
)

(define-private (validate-proof-type (type (string-ascii 32)))
  (if (or (is-eq type "range") (is-eq type "equality") (is-eq type "membership") (is-eq type "stats"))
      (ok true)
      (err ERR-INVALID-PROOF-TYPE))
)

(define-private (validate-metadata (meta (string-utf8 256)))
  (if (<= (len meta) u256)
      (ok true)
      (err ERR-INVALID-METADATA))
)

(define-private (validate-commitment (commit (buff 32)))
  (if (is-eq (len commit) u32)
      (ok true)
      (err ERR-INVALID-COMMITMENT))
)

(define-private (validate-signature (sig (buff 65)))
  (if (is-eq (len sig) u65)
      (ok true)
      (err ERR-INVALID-SIGNATURE))
)

(define-private (validate-expiry (expiry uint))
  (if (> expiry block-height)
      (ok true)
      (err ERR-INVALID-EXPIRY))
)

(define-private (validate-role (role (string-ascii 20)))
  (if (or (is-eq role "contributor") (is-eq role "verifier") (is-eq role "lead"))
      (ok true)
      (err ERR-INVALID-ROLE))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p tx-sender))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-private (is-study-active (study-id uint))
  (if (get-study-status study-id)
      (ok true)
      (err ERR-STUDY-NOT-ACTIVE))
)

(define-private (is-proof-expired (expiry uint))
  (if (< block-height expiry)
      (ok true)
      (err ERR-PROOF-EXPIRED))
)

(define-public (set-verifier-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get verifier-contract)) (err ERR-VERIFIER-NOT-SET))
    (var-set verifier-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-oracle-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get oracle-contract)) (err ERR-ORACLE-NOT-VERIFIED))
    (var-set oracle-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-proofs (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-PARAM))
    (asserts! (is-eq (get-user-role tx-sender) "lead") (err ERR-NOT-AUTHORIZED))
    (var-set max-proofs-per-study new-max)
    (ok true)
  )
)

(define-public (set-submission-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-PARAM))
    (asserts! (is-eq (get-user-role tx-sender) "lead") (err ERR-NOT-AUTHORIZED))
    (var-set submission-fee new-fee)
    (ok true)
  )
)

(define-public (set-min-reward (new-min uint))
  (begin
    (asserts! (> new-min u0) (err ERR-INVALID-REWARD))
    (asserts! (is-eq (get-user-role tx-sender) "lead") (err ERR-NOT-AUTHORIZED))
    (var-set min-reward new-min)
    (ok true)
  )
)

(define-public (deposit-reward)
  (begin
    (asserts! (>= (stx-get-balance tx-sender) (var-get min-reward)) (err ERR-INSUFFICIENT-REWARD))
    (try! (stx-transfer? (var-get min-reward) tx-sender (as-contract tx-sender)))
    (var-set reward-pool (+ (var-get reward-pool) (var-get min-reward)))
    (print { event: "reward-deposited", amount: (var-get min-reward), depositor: tx-sender })
    (ok true)
  )
)

(define-public (set-study-status (study-id uint) (active bool))
  (begin
    (try! (validate-study-id study-id))
    (asserts! (is-eq (get-user-role tx-sender) "lead") (err ERR-NOT-AUTHORIZED))
    (map-set study-status { study-id: study-id } { active: active })
    (print { event: "study-status-updated", study-id: study-id, active: active })
    (ok true)
  )
)

(define-public (set-user-role (user principal) (role (string-ascii 20)))
  (begin
    (try! (validate-role role))
    (asserts! (is-eq (get-user-role tx-sender) "lead") (err ERR-NOT-AUTHORIZED))
    (map-set user-roles { user: user } { role: role })
    (print { event: "user-role-set", user: user, role: role })
    (ok true)
  )
)

(define-public (submit-proof
  (study-id uint)
  (proof (buff 512))
  (proof-type (string-ascii 32))
  (metadata (string-utf8 256))
  (commitment (buff 32))
  (signature (buff 65))
  (expiry uint)
)
  (let (
    (next-id (var-get next-proof-id))
    (proofs-in-study (len (get proof-ids (get-proofs-for-study study-id))))
    (verifier (var-get verifier-contract))
    (oracle (var-get oracle-contract))
  )
    (try! (is-study-active study-id))
    (try! (validate-study-id study-id))
    (try! (validate-proof proof))
    (try! (validate-proof-type proof-type))
    (try! (validate-metadata metadata))
    (try! (validate-commitment commitment))
    (try! (validate-signature signature))
    (try! (validate-expiry expiry))
    (asserts! (is-eq (get-user-role tx-sender) "contributor") (err ERR-NOT-AUTHORIZED))
    (asserts! (< proofs-in-study (var-get max-proofs-per-study)) (err ERR-MAX-PROOFS-EXCEEDED))
    (asserts! (is-some verifier) (err ERR-VERIFIER-NOT-SET))
    (asserts! (is-some oracle) (err ERR-ORACLE-NOT-VERIFIED))
    (try! (stx-transfer? (var-get submission-fee) tx-sender (as-contract tx-sender)))
    (let ((verifier-principal (unwrap! verifier (err ERR-INVALID-VERIFIER))))
      (try! (contract-call? verifier-principal verify-proof proof study-id commitment))
    )
    (map-set proofs { proof-id: next-id }
      {
        study-id: study-id,
        proof: proof,
        proof-type: proof-type,
        metadata: metadata,
        submitter: tx-sender,
        timestamp: block-height,
        expiry: expiry,
        commitment: commitment,
        signature: signature,
        status: true,
        reward-claimed: false
      }
    )
    (map-set proofs-by-study { study-id: study-id }
      { proof-ids: (append (get proof-ids (get-proofs-for-study study-id)) next-id) }
    )
    (var-set next-proof-id (+ next-id u1))
    (print { event: "proof-submitted", id: next-id, study-id: study-id })
    (ok next-id)
  )
)

(define-public (update-proof-metadata (proof-id uint) (new-metadata (string-utf8 256)))
  (let ((proof (map-get? proofs { proof-id: proof-id })))
    (match proof
      p
      (begin
        (asserts! (is-eq (get submitter p) tx-sender) (err ERR-NOT-AUTHORIZED))
        (try! (validate-metadata new-metadata))
        (try! (is-proof-expired (get expiry p)))
        (map-set proofs { proof-id: proof-id }
          (merge p { metadata: new-metadata })
        )
        (map-set proof-updates { proof-id: proof-id }
          {
            update-metadata: new-metadata,
            update-timestamp: block-height,
            updater: tx-sender
          }
        )
        (print { event: "proof-updated", id: proof-id })
        (ok true)
      )
      (err ERR-INVALID-PROOF)
    )
  )
)

(define-public (claim-reward (proof-id uint))
  (let ((proof (map-get? proofs { proof-id: proof-id })))
    (match proof
      p
      (begin
        (asserts! (is-eq (get submitter p) tx-sender) (err ERR-NOT-AUTHORIZED))
        (asserts! (get status p) (err ERR-INVALID-STATUS))
        (asserts! (not (get reward-claimed p)) (err ERR-REWARD-ALREADY-CLAIMED))
        (asserts! (>= (var-get reward-pool) (var-get min-reward)) (err ERR-INSUFFICIENT-REWARD))
        (try! (as-contract (stx-transfer? (var-get min-reward) tx-sender tx-sender)))
        (var-set reward-pool (- (var-get reward-pool) (var-get min-reward)))
        (map-set proofs { proof-id: proof-id }
          (merge p { reward-claimed: true })
        )
        (print { event: "reward-claimed", id: proof-id, amount: (var-get min-reward) })
        (ok true)
      )
      (err ERR-INVALID-CLAIM)
    )
  )
)

(define-public (validate-proof-precheck (proof-id uint))
  (let ((proof (map-get? proofs { proof-id: proof-id })))
    (match proof
      p
      (begin
        (try! (validate-study-id (get study-id p)))
        (try! (validate-proof (get proof p)))
        (try! (validate-proof-type (get proof-type p)))
        (try! (validate-metadata (get metadata p)))
        (try! (validate-commitment (get commitment p)))
        (try! (validate-signature (get signature p)))
        (try! (is-study-active (get study-id p)))
        (try! (is-proof-expired (get expiry p)))
        (print { event: "precheck-passed", id: proof-id })
        (ok true)
      )
      (err ERR-INVALID-PROOF)
    )
  )
)

(define-public (get-proof-count)
  (ok (var-get next-proof-id))
)

(define-public (get-reward-pool)
  (ok (var-get reward-pool))
)