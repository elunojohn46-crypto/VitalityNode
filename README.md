# VitalityNode

A blockchain-powered platform that empowers patients to own, control, and securely share their health data, solving interoperability issues and privacy concerns in healthcare — all on-chain.

---

## Overview

VitalityNode consists of four main smart contracts that together form a decentralized, transparent, and patient-centric ecosystem for health data management:

1. **Patient Record NFT Contract** – Issues and manages NFTs representing patient health records.
2. **Access Permission Contract** – Handles granular access controls and sharing permissions.
3. **Data Rewards Contract** – Distributes rewards to patients for data contributions and participation.
4. **Governance DAO Contract** – Enables community voting on platform updates and policies.

---

## Features

- **Patient-owned health NFTs** for secure, portable medical records  
- **Permissioned data sharing** with doctors, insurers, or researchers  
- **Rewards system** for anonymized data sharing in research  
- **DAO governance** for patient-driven platform evolution  
- **Interoperability hooks** for off-chain health data integration via oracles  
- **Privacy-preserving mechanisms** to prevent unauthorized access  
- **Transparent audit trails** for all data interactions  

---

## Smart Contracts

### Patient Record NFT Contract
- Mint NFTs for new patient health records
- Update metadata with encrypted health data entries
- Transfer ownership only to verified patient wallets

### Access Permission Contract
- Grant/revoke time-bound access to specific data fields
- Enforce role-based permissions (e.g., doctor view-only)
- Log all access requests and approvals on-chain

### Data Rewards Contract
- Stake tokens to participate in data pools for research
- Automate reward distributions based on contribution value
- Integrate with oracles for verifying data usage in studies

### Governance DAO Contract
- Token-weighted voting on proposals for platform features
- On-chain execution of approved changes
- Quorum requirements and proposal submission thresholds

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/vitalitynode.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract operates independently but integrates with others for a complete health data management experience.
Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License

