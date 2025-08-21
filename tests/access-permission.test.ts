import { describe, it, expect, beforeEach } from "vitest";

interface Permission {
  granted: boolean;
  expiry: bigint;
  role: bigint;
}

interface AuditLog {
  patient: string;
  requester: string;
  dataField: bigint;
  action: string;
  timestamp: bigint;
}

const mockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  permissions: new Map<string, Permission>(),
  auditLog: new Map<bigint, AuditLog>(),
  logCounter: 0n,
  blockHeight: 1000n,
  VALID_DATA_FIELDS: [1n, 2n, 3n, 4n, 5n],
  VALID_ROLES: [1n, 2n, 3n],

  isAdmin(caller: string): boolean {
    return caller === this.admin;
  },

  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number } {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  grantAccess(
    caller: string,
    patient: string,
    requester: string,
    dataField: bigint,
    duration: bigint,
    role: bigint
  ): { value: boolean } | { error: number } {
    if (this.paused) return { error: 109 };
    if (caller !== patient) return { error: 100 };
    if (requester === "SP000000000000000000002Q6VF78" || patient === "SP000000000000000000002Q6VF78") return { error: 108 };
    if (!this.VALID_DATA_FIELDS.includes(dataField)) return { error: 105 };
    if (!this.VALID_ROLES.includes(role)) return { error: 102 };
    const key = `${patient}-${requester}-${dataField}`;
    const current = this.permissions.get(key) || { granted: false, expiry: 0n, role: 0n };
    if (current.granted) return { error: 106 };
    this.permissions.set(key, { granted: true, expiry: this.blockHeight + duration, role });
    this.auditLog.set(this.logCounter, { patient, requester, dataField, action: "GRANT", timestamp: this.blockHeight });
    this.logCounter += 1n;
    return { value: true };
  },

  revokeAccess(
    caller: string,
    patient: string,
    requester: string,
    dataField: bigint
  ): { value: boolean } | { error: number } {
    if (this.paused) return { error: 109 };
    if (caller !== patient) return { error: 100 };
    if (!this.VALID_DATA_FIELDS.includes(dataField)) return { error: 105 };
    const key = `${patient}-${requester}-${dataField}`;
    const current = this.permissions.get(key) || { granted: false, expiry: 0n, role: 0n };
    if (!current.granted) return { error: 107 };
    this.permissions.set(key, { granted: false, expiry: 0n, role: 0n });
    this.auditLog.set(this.logCounter, { patient, requester, dataField, action: "REVOKE", timestamp: this.blockHeight });
    this.logCounter += 1n;
    return { value: true };
  },

  hasAccess(
    patient: string,
    requester: string,
    dataField: bigint
  ): { value: bigint } | { error: number } {
    const key = `${patient}-${requester}-${dataField}`;
    const permission = this.permissions.get(key) || { granted: false, expiry: 0n, role: 0n };
    if (permission.granted && permission.expiry > this.blockHeight) {
      return { value: permission.role };
    }
    return { error: 103 };
  },

  getAuditLog(logId: bigint): { value: AuditLog } | { error: number } {
    const log = this.auditLog.get(logId);
    return log ? { value: log } : { error: 0 };
  },
};

describe("VitalityNode Access Permission Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.permissions = new Map();
    mockContract.auditLog = new Map();
    mockContract.logCounter = 0n;
    mockContract.blockHeight = 1000n;
  });

  it("should allow patient to grant access", () => {
    const patient = "ST2CY5...";
    const requester = "ST3NB...";
    const result = mockContract.grantAccess(patient, patient, requester, 1n, 100n, 1n);
    expect(result).toEqual({ value: true });
    const key = `${patient}-${requester}-1`;
    expect(mockContract.permissions.get(key)).toEqual({
      granted: true,
      expiry: 1100n,
      role: 1n,
    });
    expect(mockContract.auditLog.get(0n)).toEqual({
      patient,
      requester,
      dataField: 1n,
      action: "GRANT",
      timestamp: 1000n,
    });
  });

  it("should prevent non-patient from granting access", () => {
    const result = mockContract.grantAccess("ST4XYZ...", "ST2CY5...", "ST3NB...", 1n, 100n, 1n);
    expect(result).toEqual({ error: 100 });
  });

  it("should prevent granting with invalid data field", () => {
    const patient = "ST2CY5...";
    const result = mockContract.grantAccess(patient, patient, "ST3NB...", 999n, 100n, 1n);
    expect(result).toEqual({ error: 105 });
  });

  it("should prevent granting with invalid role", () => {
    const patient = "ST2CY5...";
    const result = mockContract.grantAccess(patient, patient, "ST3NB...", 1n, 100n, 999n);
    expect(result).toEqual({ error: 102 });
  });

  it("should prevent granting to zero address", () => {
    const patient = "ST2CY5...";
    const result = mockContract.grantAccess(patient, patient, "SP000000000000000000002Q6VF78", 1n, 100n, 1n);
    expect(result).toEqual({ error: 108 });
  });

  it("should prevent granting if already granted", () => {
    const patient = "ST2CY5...";
    const requester = "ST3NB...";
    mockContract.grantAccess(patient, patient, requester, 1n, 100n, 1n);
    const result = mockContract.grantAccess(patient, patient, requester, 1n, 100n, 1n);
    expect(result).toEqual({ error: 106 });
  });

  it("should allow patient to revoke access", () => {
    const patient = "ST2CY5...";
    const requester = "ST3NB...";
    mockContract.grantAccess(patient, patient, requester, 1n, 100n, 1n);
    const result = mockContract.revokeAccess(patient, patient, requester, 1n);
    expect(result).toEqual({ value: true });
    const key = `${patient}-${requester}-1`;
    expect(mockContract.permissions.get(key)).toEqual({
      granted: false,
      expiry: 0n,
      role: 0n,
    });
    expect(mockContract.auditLog.get(1n)).toEqual({
      patient,
      requester,
      dataField: 1n,
      action: "REVOKE",
      timestamp: 1000n,
    });
  });

  it("should prevent revoking non-existent permission", () => {
    const patient = "ST2CY5...";
    const requester = "ST3NB...";
    const result = mockContract.revokeAccess(patient, patient, requester, 1n);
    expect(result).toEqual({ error: 107 });
  });

  it("should allow checking valid access", () => {
    const patient = "ST2CY5...";
    const requester = "ST3NB...";
    mockContract.grantAccess(patient, patient, requester, 1n, 100n, 1n);
    const result = mockContract.hasAccess(patient, requester, 1n);
    expect(result).toEqual({ value: 1n });
  });

  it("should deny access if expired", () => {
    const patient = "ST2CY5...";
    const requester = "ST3NB...";
    mockContract.grantAccess(patient, patient, requester, 1n, 100n, 1n);
    mockContract.blockHeight = 1200n;
    const result = mockContract.hasAccess(patient, requester, 1n);
    expect(result).toEqual({ error: 103 });
  });

  it("should deny access if not granted", () => {
    const patient = "ST2CY5...";
    const requester = "ST3NB...";
    const result = mockContract.hasAccess(patient, requester, 1n);
    expect(result).toEqual({ error: 103 });
  });

  it("should not allow operations when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const patient = "ST2CY5...";
    const requester = "ST3NB...";
    const grantResult = mockContract.grantAccess(patient, patient, requester, 1n, 100n, 1n);
    const revokeResult = mockContract.revokeAccess(patient, patient, requester, 1n);
    expect(grantResult).toEqual({ error: 109 });
    expect(revokeResult).toEqual({ error: 109 });
  });
});