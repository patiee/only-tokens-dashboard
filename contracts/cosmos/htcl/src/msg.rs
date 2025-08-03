use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Addr, Coin, Uint128};
use cw20::Cw20ReceiveMsg;

#[cw_serde]
pub struct InstantiateMsg {
    pub bob: String,
    pub timelock: u64,
    pub hashlock: String, // Universal hashlock that works across all chains
    pub cw20: Option<Addr>,
    pub native: Option<String>,
}

#[cw_serde]
pub enum ExecuteMsg {
    // Bob can withdraw before timelock with correct secret
    BobWithdraw { secret: String },
    // Alice can withdraw after timelock expires
    AliceWithdraw {},
    // Receive cw20 tokens
    Receive(Cw20ReceiveMsg),
    // Receive native tokens
    DepositNative {},
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(ConfigResponse)]
    GetConfig {},
    #[returns(BalanceResponse)]
    GetBalance {},
    #[returns(bool)]
    IsTimelockExpired {},
    #[returns(bool)]
    IsValidSecret { secret: String },
    #[returns(ContractInfoResponse)]
    GetContractInfo {},
}

#[cw_serde]
pub struct ConfigResponse {
    pub alice: String,
    pub bob: String,
    pub timelock: u64,
    pub hashlock: String, // Universal hashlock
}

#[cw_serde]
pub struct BalanceResponse {
    pub native: Vec<Coin>,
    pub cw20: Vec<Cw20Balance>,
}

#[cw_serde]
pub struct Cw20Balance {
    pub address: String,
    pub amount: Uint128,
}

#[cw_serde]
pub struct ContractInfoResponse {
    pub alice: String,
    pub bob: String,
    pub timelock: u64,
    pub hashlock: String, // Universal hashlock
    pub native_balance: Vec<Coin>,
    pub cw20_balances: Vec<Cw20Balance>,
}
