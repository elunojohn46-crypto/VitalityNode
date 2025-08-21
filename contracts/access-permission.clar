;; Access Permission Contract
;; Clarity v2
;; Manages granular access controls for patient health record NFTs

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-PATIENT u101)
(define-constant ERR-INVALID-REQUESTER u102)
(define-constant ERR-PERMISSION-DENIED u103)
(define-constant ERR-EXPIRED-PERMISSION u104)
(define-constant ERR-INVALID-DATA-FIELD u105)
(define-constant ERR-ALREADY-GRANTED u106)
(define-constant ERR-NOT-GRANTED u107)
(define-constant ERR-ZERO-ADDRESS u108)
(define-constant ERR-CONTRACT-PAUSED u109)

;; Contract metadata
(define-constant CONTRACT-NAME "VitalityNode Access Permission")
(define-constant VERSION "1.0.0")

;; Admin and contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)

;; Data field types
(define-constant DATA-FIELD-MEDICAL-HISTORY u1)
(define-constant DATA-FIELD-DIAGNOSES u2)
(define-constant DATA-FIELD-TREATMENTS u3)
(define-constant DATA-FIELD-LAB-RESULTS u4)
(define-constant DATA-FIELD-VITALS u5)
(define-constant VALID-DATA-FIELDS (list DATA-FIELD-MEDICAL-HISTORY DATA-FIELD-DIAGNOSES DATA-FIELD-TREATMENTS DATA-FIELD-LAB-RESULTS DATA-FIELD-VITALS))

;; Role types
(define-constant ROLE-DOCTOR u1)
(define-constant ROLE-INSURER u2)
(define-constant ROLE-RESEARCHER u3)
(define-constant VALID-ROLES (list ROLE-DOCTOR ROLE-INSURER ROLE-RESEARCHER))

;; Permission structure: maps patient -> requester -> data field -> permission details
(define-map permissions 
  { patient: principal, requester: principal, data-field: uint }
  { granted: bool, expiry: uint, role: uint }
)

;; Audit log for tracking permission changes
(define-map audit-log 
  { log-id: uint }
  { patient: principal, requester: principal, data-field: uint, action: (string-ascii 32), timestamp: uint }
)
(define-data-var log-counter uint u0)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-CONTRACT-PAUSED))
)

;; Private helper: is-valid-data-field
(define-private (is-valid-data-field (field uint))
  (is-some (index-of VALID-DATA-FIELDS field))
)

;; Private helper: is-valid-role
(define-private (is-valid-role (role uint))
  (is-some (index-of VALID-ROLES role))
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Pause/unpause the contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Grant access to a requester for a specific data field
(define-public (grant-access (patient principal) (requester principal) (data-field uint) (duration uint) (role uint))
  (begin
    (ensure-not-paused)
    (asserts! (is-eq tx-sender patient) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq requester 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (not (is-eq patient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (is-valid-data-field data-field) (err ERR-INVALID-DATA-FIELD))
    (asserts! (is-valid-role role) (err ERR-INVALID-REQUESTER))
    (let
      ((permission-key { patient: patient, requester: requester, data-field: data-field })
       (current-permission (default-to { granted: false, expiry: u0, role: u0 } (map-get? permissions permission-key))))
      (asserts! (not (get granted current-permission)) (err ERR-ALREADY-GRANTED))
      (map-set permissions permission-key
        { granted: true, expiry: (+ block-height duration), role: role })
      (map-set audit-log
        { log-id: (var-get log-counter) }
        { patient: patient, requester: requester, data-field: data-field, action: "GRANT", timestamp: block-height })
      (var-set log-counter (+ (var-get log-counter) u1))
      (ok true)
    )
  )
)

;; Revoke access to a requester for a specific data field
(define-public (revoke-access (patient principal) (requester principal) (data-field uint))
  (begin
    (ensure-not-paused)
    (asserts! (is-eq tx-sender patient) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-valid-data-field data-field) (err ERR-INVALID-DATA-FIELD))
    (let
      ((permission-key { patient: patient, requester: requester, data-field: data-field })
       (current-permission (default-to { granted: false, expiry: u0, role: u0 } (map-get? permissions permission-key))))
      (asserts! (get granted current-permission) (err ERR-NOT-GRANTED))
      (map-set permissions permission-key
        { granted: false, expiry: u0, role: u0 })
      (map-set audit-log
        { log-id: (var-get log-counter) }
        { patient: patient, requester: requester, data-field: data-field, action: "REVOKE", timestamp: block-height })
      (var-set log-counter (+ (var-get log-counter) u1))
      (ok true)
    )
  )
)

;; Check if a requester has valid access
(define-read-only (has-access (patient principal) (requester principal) (data-field uint))
  (let
    ((permission-key { patient: patient, requester: requester, data-field: data-field })
     (permission (default-to { granted: false, expiry: u0, role: u0 } (map-get? permissions permission-key))))
    (if (and (get granted permission) (> (get expiry permission) block-height))
      (ok (get role permission))
      (err ERR-PERMISSION-DENIED)
    )
  )
)

;; Get audit log entry
(define-read-only (get-audit-log (log-id uint))
  (match (map-get? audit-log { log-id: log-id })
    log-entry (ok log-entry)
    (err u0)
  )
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: check if paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: get permission details
(define-read-only (get-permission (patient principal) (requester principal) (data-field uint))
  (ok (default-to { granted: false, expiry: u0, role: u0 }
       (map-get? permissions { patient: patient, requester: requester, data-field: data-field })))
)

;; Read-only: get valid data fields
(define-read-only (get-valid-data-fields)
  (ok VALID-DATA-FIELDS)
)

;; Read-only: get valid roles
(define-read-only (get-valid-roles)
  (ok VALID-ROLES)
)

;; Read-only: get log counter
(define-read-only (get-log-counter)
  (ok (var-get log-counter))
)