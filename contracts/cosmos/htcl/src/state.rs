use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Coin, Uint128};
use cw_storage_plus::{Item, Map};

#[cw_serde]
pub struct Config {
    pub alice: Addr,
    pub bob: Addr,
    pub timelock: u64,
    pub hashlock: String, // Universal hashlock that works across all chains
    pub cw20: Option<Addr>,
    pub native: Option<String>,
}

pub const CONFIG: Item<Config> = Item::new("config");
pub const CW20_BALANCES: Map<Addr, Uint128> = Map::new("cw20_balances");
pub const NATIVE_BALANCES: Map<String, Uint128> = Map::new("native_balances");

// Events
#[cw_serde]
pub struct HTCLCreatedEvent {
    pub alice: String,
    pub bob: String,
    pub timelock: u64,
    pub hashlock: String, // Universal hashlock
}

#[cw_serde]
pub struct AliceWithdrawnEvent {
    pub alice: String,
    pub native_amount: Vec<Coin>,
    pub cw20_amount: Vec<Cw20Withdrawal>,
}

#[cw_serde]
pub struct BobWithdrawnEvent {
    pub bob: String,
    pub secret: String,
    pub native_amount: Vec<Coin>,
    pub cw20_amount: Vec<Cw20Withdrawal>,
}

#[cw_serde]
pub struct Cw20Withdrawal {
    pub token: String,
    pub amount: Uint128,
}
