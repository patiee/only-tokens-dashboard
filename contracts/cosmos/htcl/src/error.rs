use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Invalid secret")]
    InvalidSecret {},

    #[error("Timelock has not expired yet")]
    TimelockNotExpired {},

    #[error("Timelock has already expired")]
    TimelockExpired {},

    #[error("No funds to withdraw")]
    NoFundsToWithdraw {},

    #[error("Invalid cw20 token")]
    InvalidCw20Token {},

    #[error("Invalid native token")]
    InvalidNativeToken {},

    #[error("Invalid amount")]
    InvalidAmount {},

    #[error("Invalid timelock")]
    InvalidTimelock {},

    #[error("Invalid hashlock")]
    InvalidHashlock {},

    #[error("Invalid recipient address")]
    InvalidRecipientAddress {},
}
