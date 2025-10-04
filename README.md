# 🔒 zkDataShare: Zero-Knowledge Data Sharing for Interdisciplinary Studies

Welcome to zkDataShare, a Stacks blockchain platform built with Clarity smart contracts that enables secure, privacy-preserving data sharing for interdisciplinary research. Researchers can prove data validity and share insights across fields (e.g., healthcare + AI) without exposing sensitive information, solving real-world issues like data silos, privacy breaches, and trust deficits in collaborations.

## ✨ Features

🔐 **Privacy-First Sharing**: Use zero-knowledge proofs (ZKPs) to verify data properties without revealing the raw data  
📊 **Interdisciplinary Collaboration**: Create shared studies where multiple fields contribute and verify proofs anonymously  
✅ **Immutable Verification**: On-chain ZKP validation ensures tamper-proof results  
👥 **Role-Based Access**: Researchers register as contributors, verifiers, or study leads with granular permissions  
💰 **Incentive Mechanism**: Reward honest proof submissions via STX micropayments  
🚫 **Audit & Revocation**: Track disputes and revoke access for malicious actors  
📈 **Analytics Dashboard**: Query aggregated proof stats without compromising privacy  

## 🏗 Architecture: 8 Clarity Smart Contracts

This project deploys 8 interconnected Clarity contracts on the Stacks blockchain for robust, gas-efficient operations. Each handles a core aspect of ZK data sharing:

1. **UserRegistry**: Manages researcher profiles, authentication, and roles (e.g., contributor, verifier). Stores public keys and reputation scores.  
2. **DataCommitment**: Allows users to commit hashed data (SHA-256) to the chain without revealing contents, timestamping ownership.  
3. **StudyFactory**: Creates interdisciplinary study contracts, defining scope, required proof types (e.g., "data satisfies statistical threshold"), and participant limits.  
4. **ZKProofSubmitter**: Handles ZKP generation/submission interfaces (integrates with off-chain ZK libraries like halo2; on-chain verifies proof validity using Clarity's math primitives).  
5. **AccessController**: Enforces role-based access to studies and proofs, using principal-based authorization and time-bound invitations.  
6. **VerifierOracle**: Validates submitted ZKPs on-chain, emitting events for successful/failed verifications and updating study states.  
7. **IncentiveDistributor**: Distributes STX rewards based on verified contributions, with slashing for invalid proofs.  
8. **DisputeResolver**: Manages challenges to proofs, allowing community voting or admin arbitration, with on-chain resolution logs.  

Contracts interact via cross-contract calls (e.g., StudyFactory deploys per-study instances inheriting from templates). Full code in `/contracts/` with tests in `/tests/`.

## 🛠 How It Works

**For Researchers (Contributors)**

- Register via `UserRegistry` with your Stacks wallet principal and field (e.g., "biology").  
- Commit sensitive data: Call `DataCommitment::commit-data` with a hash and metadata (e.g., "genomic dataset").  
- Join a study: Accept invitation from `AccessController` and submit ZKP via `ZKProofSubmitter` (e.g., prove "dataset has >95% accuracy" without sharing the dataset).  
- Earn rewards: If verified by `VerifierOracle`, claim STX from `IncentiveDistributor`.  

**For Study Leads (Verifiers)**

- Create a study: Use `StudyFactory::create-study` to define rules (e.g., "Require ZKP for correlation between medical and economic data").  
- Invite collaborators: Call `AccessController::grant-access` with principals.  
- Verify contributions: Submit verification requests to `VerifierOracle` to check ZKPs on-chain.  
- Resolve issues: Use `DisputeResolver` for challenges, ensuring fair interdisciplinary consensus.  

**Off-Chain Integration**  
- ZKP Generation: Use libraries like snarkjs (off-chain) to create proofs, then submit to blockchain.  
- Frontend: React app with Stacks.js for wallet connect; dashboard queries contract maps for study stats.  
- Privacy Guarantee: ZKPs ensure verifiers learn only the proven statement (e.g., "data is valid")—no raw data exposure.  

Boom! Collaborate across disciplines with full privacy and trust. Deploy on testnet with `clarinet deploy`.

## 🚀 Getting Started

1. Install Clarity tools: `npm install -g clarinet`.  
2. Clone repo: `git clone <your-repo> && cd zkDataShare`.  
3. Run locally: `clarinet integrate`.  
4. Deploy: Configure `Clarity.toml` and `clarinet deploy --network mainnet`.  
5. Test ZK Flow: See `/tests/zk-interop.clar` for proof simulation.  

## 📚 Resources

- **Docs**: Full API in `/docs/`; Clarity ZKP primitives inspired by Stacks' SIP-018.  
- **Real-World Impact**: Addresses GDPR/HIPAA compliance in studies, e.g., sharing anonymized health data for AI model training.  
- **Limitations**: On-chain ZKP verification is compute-intensive; use circuit optimization for production. Future: Integrate with Bitcoin L2 for scalability.  

Contribute via PRs! Built for open science. 🌐