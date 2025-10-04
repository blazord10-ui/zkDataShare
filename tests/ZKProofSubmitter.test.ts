import { describe, it, expect, beforeEach } from "vitest";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_PROOF = 101;
const ERR_INVALID_STUDY_ID = 102;
const ERR_INVALID_PROOF_TYPE = 103;
const ERR_PROOF_ALREADY_SUBMITTED = 104;
const ERR_INVALID_METADATA = 105;
const ERR_STUDY_NOT_ACTIVE = 106;
const ERR_INVALID_PARAM = 107;
const ERR_PROOF_EXPIRED = 108;
const ERR_INVALID_SIGNATURE = 109;
const ERR_INVALID_COMMITMENT = 110;
const ERR_VERIFIER_NOT_SET = 111;
const ERR_INVALID_EXPIRY = 112;
const ERR_MAX_PROOFS_EXCEEDED = 113;
const ERR_INVALID_PROOF_LENGTH = 114;
const ERR_INVALID_PROOF_FORMAT = 115;
const ERR_INVALID_VERIFIER = 116;
const ERR_INVALID_REWARD = 117;
const ERR_INSUFFICIENT_REWARD = 118;
const ERR_REWARD_ALREADY_CLAIMED = 119;
const ERR_INVALID_CLAIM = 120;
const ERR_INVALID_UPDATE = 121;
const ERR_UPDATE_NOT_ALLOWED = 122;
const ERR_INVALID_TIMESTAMP = 123;
const ERR_INVALID_STATUS = 124;
const ERR_INVALID_ROLE = 125;
const ERR_INVALID_ACCESS = 126;
const ERR_INVALID_ORACLE = 127;
const ERR_ORACLE_NOT_VERIFIED = 128;
const ERR_INVALID_EVENT = 129;
const ERR_INVALID_QUERY = 130;

interface Proof {
  studyId: number;
  proof: Uint8Array;
  proofType: string;
  metadata: string;
  submitter: string;
  timestamp: number;
  expiry: number;
  commitment: Uint8Array;
  signature: Uint8Array;
  status: boolean;
  rewardClaimed: boolean;
}

interface ProofUpdate {
  updateMetadata: string;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class ZKProofSubmitterMock {
  state: {
    nextProofId: number;
    maxProofsPerStudy: number;
    submissionFee: number;
    verifierContract: string | null;
    oracleContract: string | null;
    rewardPool: number;
    minReward: number;
    expiryDuration: number;
    proofs: Map<number, Proof>;
    proofsByStudy: Map<number, number[]>;
    proofUpdates: Map<number, ProofUpdate>;
    studyStatus: Map<number, boolean>;
    userRoles: Map<string, string>;
  } = {
    nextProofId: 0,
    maxProofsPerStudy: 100,
    submissionFee: 10,
    verifierContract: null,
    oracleContract: null,
    rewardPool: 0,
    minReward: 5,
    expiryDuration: 144,
    proofs: new Map(),
    proofsByStudy: new Map(),
    proofUpdates: new Map(),
    studyStatus: new Map(),
    userRoles: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxBalances: Map<string, number> = new Map([["ST1TEST", 1000], ["contract", 0]]);
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];
  verifyProofCalls: Array<{ proof: Uint8Array; studyId: number; commitment: Uint8Array }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextProofId: 0,
      maxProofsPerStudy: 100,
      submissionFee: 10,
      verifierContract: null,
      oracleContract: null,
      rewardPool: 0,
      minReward: 5,
      expiryDuration: 144,
      proofs: new Map(),
      proofsByStudy: new Map(),
      proofUpdates: new Map(),
      studyStatus: new Map(),
      userRoles: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxBalances = new Map([["ST1TEST", 1000], ["contract", 0]]);
    this.stxTransfers = [];
    this.verifyProofCalls = [];
  }

  mockVerifyProof(proof: Uint8Array, studyId: number, commitment: Uint8Array): Result<boolean> {
    this.verifyProofCalls.push({ proof, studyId, commitment });
    return { ok: true, value: true };
  }

  setVerifierContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.verifierContract !== null) return { ok: false, value: ERR_VERIFIER_NOT_SET };
    this.state.verifierContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setOracleContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.oracleContract !== null) return { ok: false, value: ERR_ORACLE_NOT_VERIFIED };
    this.state.oracleContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setMaxProofs(newMax: number): Result<boolean> {
    if (newMax <= 0) return { ok: false, value: ERR_INVALID_PARAM };
    if (this.state.userRoles.get(this.caller) !== "lead") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.maxProofsPerStudy = newMax;
    return { ok: true, value: true };
  }

  setSubmissionFee(newFee: number): Result<boolean> {
    if (newFee < 0) return { ok: false, value: ERR_INVALID_PARAM };
    if (this.state.userRoles.get(this.caller) !== "lead") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.submissionFee = newFee;
    return { ok: true, value: true };
  }

  setMinReward(newMin: number): Result<boolean> {
    if (newMin <= 0) return { ok: false, value: ERR_INVALID_REWARD };
    if (this.state.userRoles.get(this.caller) !== "lead") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.minReward = newMin;
    return { ok: true, value: true };
  }

  depositReward(): Result<boolean> {
    const balance = this.stxBalances.get(this.caller) || 0;
    if (balance < this.state.minReward) return { ok: false, value: ERR_INSUFFICIENT_REWARD };
    this.stxTransfers.push({ amount: this.state.minReward, from: this.caller, to: "contract" });
    this.stxBalances.set(this.caller, balance - this.state.minReward);
    this.stxBalances.set("contract", (this.stxBalances.get("contract") || 0) + this.state.minReward);
    this.state.rewardPool += this.state.minReward;
    return { ok: true, value: true };
  }

  setStudyStatus(studyId: number, active: boolean): Result<boolean> {
    if (studyId <= 0) return { ok: false, value: ERR_INVALID_STUDY_ID };
    if (this.state.userRoles.get(this.caller) !== "lead") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.studyStatus.set(studyId, active);
    return { ok: true, value: true };
  }

  setUserRole(user: string, role: string): Result<boolean> {
    if (!["contributor", "verifier", "lead"].includes(role)) return { ok: false, value: ERR_INVALID_ROLE };
    if (this.state.userRoles.get(this.caller) !== "lead") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.userRoles.set(user, role);
    return { ok: true, value: true };
  }

  submitProof(
    studyId: number,
    proof: Uint8Array,
    proofType: string,
    metadata: string,
    commitment: Uint8Array,
    signature: Uint8Array,
    expiry: number
  ): Result<number> {
    if (!(this.state.studyStatus.get(studyId) ?? false)) return { ok: false, value: ERR_STUDY_NOT_ACTIVE };
    if (studyId <= 0) return { ok: false, value: ERR_INVALID_STUDY_ID };
    if (proof.length === 0 || proof.length > 512) return { ok: false, value: ERR_INVALID_PROOF };
    if (!["range", "equality", "membership", "stats"].includes(proofType)) return { ok: false, value: ERR_INVALID_PROOF_TYPE };
    if (metadata.length > 256) return { ok: false, value: ERR_INVALID_METADATA };
    if (commitment.length !== 32) return { ok: false, value: ERR_INVALID_COMMITMENT };
    if (signature.length !== 65) return { ok: false, value: ERR_INVALID_SIGNATURE };
    if (expiry <= this.blockHeight) return { ok: false, value: ERR_INVALID_EXPIRY };
    if (this.state.userRoles.get(this.caller) !== "contributor") return { ok: false, value: ERR_NOT_AUTHORIZED };
    const proofsInStudy = this.state.proofsByStudy.get(studyId)?.length ?? 0;
    if (proofsInStudy >= this.state.maxProofsPerStudy) return { ok: false, value: ERR_MAX_PROOFS_EXCEEDED };
    if (!this.state.verifierContract) return { ok: false, value: ERR_VERIFIER_NOT_SET };
    if (!this.state.oracleContract) return { ok: false, value: ERR_ORACLE_NOT_VERIFIED };
    const balance = this.stxBalances.get(this.caller) || 0;
    if (balance < this.state.submissionFee) return { ok: false, value: ERR_INSUFFICIENT_REWARD };
    this.stxTransfers.push({ amount: this.state.submissionFee, from: this.caller, to: "contract" });
    this.stxBalances.set(this.caller, balance - this.state.submissionFee);
    this.stxBalances.set("contract", (this.stxBalances.get("contract") || 0) + this.state.submissionFee);
    const verifyResult = this.mockVerifyProof(proof, studyId, commitment);
    if (!verifyResult.ok) return { ok: false, value: verifyResult.value as number };
    const id = this.state.nextProofId;
    const newProof: Proof = {
      studyId,
      proof,
      proofType,
      metadata,
      submitter: this.caller,
      timestamp: this.blockHeight,
      expiry,
      commitment,
      signature,
      status: true,
      rewardClaimed: false,
    };
    this.state.proofs.set(id, newProof);
    const currentProofs = this.state.proofsByStudy.get(studyId) ?? [];
    this.state.proofsByStudy.set(studyId, [...currentProofs, id]);
    this.state.nextProofId++;
    return { ok: true, value: id };
  }

  updateProofMetadata(proofId: number, newMetadata: string): Result<boolean> {
    const proof = this.state.proofs.get(proofId);
    if (!proof) return { ok: false, value: ERR_INVALID_PROOF };
    if (proof.submitter !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newMetadata.length > 256) return { ok: false, value: ERR_INVALID_METADATA };
    if (this.blockHeight >= proof.expiry) return { ok: false, value: ERR_PROOF_EXPIRED };
    const updated: Proof = { ...proof, metadata: newMetadata };
    this.state.proofs.set(proofId, updated);
    this.state.proofUpdates.set(proofId, {
      updateMetadata: newMetadata,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  claimReward(proofId: number): Result<boolean> {
    const proof = this.state.proofs.get(proofId);
    if (!proof) return { ok: false, value: ERR_INVALID_CLAIM };
    if (proof.submitter !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!proof.status) return { ok: false, value: ERR_INVALID_STATUS };
    if (proof.rewardClaimed) return { ok: false, value: ERR_REWARD_ALREADY_CLAIMED };
    if (this.state.rewardPool < this.state.minReward) return { ok: false, value: ERR_INSUFFICIENT_REWARD };
    this.stxTransfers.push({ amount: this.state.minReward, from: "contract", to: this.caller });
    this.stxBalances.set("contract", (this.stxBalances.get("contract") || 0) - this.state.minReward);
    this.stxBalances.set(this.caller, (this.stxBalances.get(this.caller) || 0) + this.state.minReward);
    this.state.rewardPool -= this.state.minReward;
    const updated: Proof = { ...proof, rewardClaimed: true };
    this.state.proofs.set(proofId, updated);
    return { ok: true, value: true };
  }

  validateProofPrecheck(proofId: number): Result<boolean> {
    const proof = this.state.proofs.get(proofId);
    if (!proof) return { ok: false, value: ERR_INVALID_PROOF };
    if (proof.studyId <= 0) return { ok: false, value: ERR_INVALID_STUDY_ID };
    if (proof.proof.length === 0 || proof.proof.length > 512) return { ok: false, value: ERR_INVALID_PROOF };
    if (!["range", "equality", "membership", "stats"].includes(proof.proofType)) return { ok: false, value: ERR_INVALID_PROOF_TYPE };
    if (proof.metadata.length > 256) return { ok: false, value: ERR_INVALID_METADATA };
    if (proof.commitment.length !== 32) return { ok: false, value: ERR_INVALID_COMMITMENT };
    if (proof.signature.length !== 65) return { ok: false, value: ERR_INVALID_SIGNATURE };
    if (!(this.state.studyStatus.get(proof.studyId) ?? false)) return { ok: false, value: ERR_STUDY_NOT_ACTIVE };
    if (this.blockHeight >= proof.expiry) return { ok: false, value: ERR_PROOF_EXPIRED };
    return { ok: true, value: true };
  }

  getProofCount(): Result<number> {
    return { ok: true, value: this.state.nextProofId };
  }

  getRewardPool(): Result<number> {
    return { ok: true, value: this.state.rewardPool };
  }
}

describe("ZKProofSubmitter", () => {
  let contract: ZKProofSubmitterMock;

  beforeEach(() => {
    contract = new ZKProofSubmitterMock();
    contract.reset();
  });

  it("sets verifier contract successfully", () => {
    const result = contract.setVerifierContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.verifierContract).toBe("ST2TEST");
  });

  it("rejects setting verifier to caller", () => {
    const result = contract.setVerifierContract("ST1TEST");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("sets oracle contract successfully", () => {
    const result = contract.setOracleContract("ST3TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.oracleContract).toBe("ST3TEST");
  });

  it("sets max proofs successfully", () => {
    contract.state.userRoles.set("ST1TEST", "lead");
    const result = contract.setMaxProofs(200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.maxProofsPerStudy).toBe(200);
  });

  it("rejects invalid max proofs", () => {
    contract.state.userRoles.set("ST1TEST", "lead");
    const result = contract.setMaxProofs(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PARAM);
  });

  it("sets submission fee successfully", () => {
    contract.state.userRoles.set("ST1TEST", "lead");
    const result = contract.setSubmissionFee(20);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.submissionFee).toBe(20);
  });

  it("sets min reward successfully", () => {
    contract.state.userRoles.set("ST1TEST", "lead");
    const result = contract.setMinReward(10);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.minReward).toBe(10);
  });

  it("deposits reward successfully", () => {
    contract.state.minReward = 100;
    contract.stxBalances.set("ST1TEST", 200);
    const result = contract.depositReward();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.rewardPool).toBe(100);
    expect(contract.stxBalances.get("ST1TEST")).toBe(100);
    expect(contract.stxBalances.get("contract")).toBe(100);
  });

  it("rejects insufficient reward deposit", () => {
    contract.state.minReward = 100;
    contract.stxBalances.set("ST1TEST", 50);
    const result = contract.depositReward();
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSUFFICIENT_REWARD);
  });

  it("sets study status successfully", () => {
    contract.state.userRoles.set("ST1TEST", "lead");
    const result = contract.setStudyStatus(1, true);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.studyStatus.get(1)).toBe(true);
  });

  it("sets user role successfully", () => {
    contract.state.userRoles.set("ST1TEST", "lead");
    const result = contract.setUserRole("ST2USER", "contributor");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.userRoles.get("ST2USER")).toBe("contributor");
  });

  it("rejects submit proof for inactive study", () => {
    contract.state.userRoles.set("ST1TEST", "contributor");
    contract.setVerifierContract("ST2VERIFIER");
    contract.setOracleContract("ST3ORACLE");
    const proof = new Uint8Array(256);
    const commitment = new Uint8Array(32);
    const signature = new Uint8Array(65);
    const result = contract.submitProof(1, proof, "range", "meta", commitment, signature, 100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_STUDY_NOT_ACTIVE);
  });

  it("returns correct reward pool", () => {
    contract.state.rewardPool = 50;
    const result = contract.getRewardPool();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(50);
  });
});