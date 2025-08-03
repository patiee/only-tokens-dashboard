use cosmwasm_std::{
    attr, entry_point, to_binary, to_json_binary, Addr, BalanceResponse, BankQuery, Binary, Coin,
    Deps, DepsMut, Env, MessageInfo, Order, Response, StdResult, Storage, SubMsg, Uint128, WasmMsg,
};
use cw20::{Cw20ExecuteMsg, Cw20ReceiveMsg};
use sha2::{Digest, Sha256};

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg};
use crate::state::{
    AliceWithdrawnEvent, BobWithdrawnEvent, Config, Cw20Withdrawal, CONFIG, CW20_BALANCES,
    NATIVE_BALANCES,
};
use cw2::set_contract_version;

// version info for migration info
const CONTRACT_NAME: &str = "crates.io:htcl";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    // Validate bob address
    let bob = deps.api.addr_validate(&msg.bob)?;
    if bob == info.sender {
        return Err(ContractError::InvalidRecipientAddress {});
    }

    // Validate timelock (must be in the future)
    if msg.timelock <= _env.block.time.seconds() {
        return Err(ContractError::InvalidTimelock {});
    }

    // Validate hashlock (must not be empty)
    if msg.hashlock.is_empty() {
        return Err(ContractError::InvalidHashlock {});
    }

    let config = Config {
        alice: info.sender.clone(),
        bob,
        timelock: msg.timelock,
        hashlock: msg.hashlock,
        cw20: msg.cw20.clone(),
        native: msg.native.clone(),
    };

    CONFIG.save(deps.storage, &config)?;

    for coin in info.funds {
        NATIVE_BALANCES.save(deps.storage, coin.denom, &coin.amount)?;
    }

    // Emit event
    let event = crate::state::HTCLCreatedEvent {
        alice: info.sender.to_string(),
        bob: config.bob.to_string(),
        timelock: config.timelock,
        hashlock: config.hashlock.clone(),
    };

    let mut token_type = "".to_string();
    if msg.cw20.is_some() {
        token_type = msg.cw20.unwrap().to_string();
    } else {
        token_type = msg.native.unwrap();
    }

    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("alice", info.sender)
        .add_attribute("bob", config.bob)
        .add_attribute("timelock", config.timelock.to_string())
        .add_attribute("hashlock", config.hashlock)
        .add_attribute("token", token_type)
        .set_data(to_json_binary(&event)?))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::BobWithdraw { secret } => execute_bob_withdraw(deps, env, info, secret),
        ExecuteMsg::AliceWithdraw {} => execute_alice_withdraw(deps, env, info),
        ExecuteMsg::Receive(msg) => execute_receive_cw20(deps, env, info, msg),
        ExecuteMsg::DepositNative {} => execute_deposit_native(deps, env, info),
    }
}

pub fn execute_bob_withdraw(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    secret: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // Check if caller is Bob
    if info.sender != config.bob {
        return Err(ContractError::Unauthorized {});
    }

    // Check if timelock has expired
    if env.block.time.seconds() >= config.timelock {
        return Err(ContractError::TimelockExpired {});
    }

    // Validate secret
    let mut hasher = Sha256::new();
    hasher.update(secret.as_bytes());
    let secret_hash = format!("{:x}", hasher.finalize());

    if secret_hash != config.hashlock {
        return Err(ContractError::InvalidSecret {});
    }

    // Get native balance
    let mut native_coins = NATIVE_BALANCES.keys(deps.storage, None, None, Order::Ascending);

    // Get cw20 balances
    let mut cw20_withdrawals = Vec::new();
    let mut cw20_messages = Vec::new();

    for result in CW20_BALANCES.range(deps.storage, None, None, Order::Ascending) {
        let (token_addr, amount) = result.unwrap();
        if amount > Uint128::zero() {
            cw20_withdrawals.push(Cw20Withdrawal {
                token: token_addr.to_string(),
                amount,
            });

            // Create transfer message
            let transfer_msg = Cw20ExecuteMsg::Transfer {
                recipient: config.bob.to_string(),
                amount,
            };

            let wasm_msg = WasmMsg::Execute {
                contract_addr: token_addr.to_string(),
                msg: to_json_binary(&transfer_msg)?,
                funds: vec![],
            };

            cw20_messages.push(SubMsg::new(wasm_msg));
            // // Clear cw20 balances
            // CW20_BALANCES.remove(deps.storage, token_addr);
        }
    }

    // Create native transfer message
    let mut coins = vec![];
    let mut messages = cw20_messages;
    while let Some(denom) = native_coins.next() {
        let d = denom.unwrap();
        let amount = NATIVE_BALANCES.load(deps.storage, d.clone())?;
        let coin = Coin {
            denom: d.clone(),
            amount: amount,
        };
        messages.push(SubMsg::new(cosmwasm_std::BankMsg::Send {
            to_address: config.bob.to_string(),
            amount: vec![coin.clone()],
        }));
        coins.push(coin);
        // NATIVE_BALANCES.remove(deps.storage, d);
    }

    // Emit event
    let event = BobWithdrawnEvent {
        bob: config.bob.to_string(),
        secret,
        native_amount: coins,
        cw20_amount: cw20_withdrawals,
    };

    Ok(Response::new()
        .add_submessages(messages)
        .add_attribute("method", "bob_withdraw")
        .add_attribute("bob", config.bob)
        .set_data(to_binary(&event)?))
}

pub fn execute_alice_withdraw(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // Check if caller is Alice
    if info.sender != config.alice {
        return Err(ContractError::Unauthorized {});
    }

    // Check if timelock has expired
    if env.block.time.seconds() < config.timelock {
        return Err(ContractError::TimelockNotExpired {});
    }

    // Get native balance
    let mut native_coins = NATIVE_BALANCES.keys(deps.storage, None, None, Order::Ascending);

    // Get cw20 balances
    let mut cw20_withdrawals = Vec::new();
    let mut cw20_messages = Vec::new();

    for result in CW20_BALANCES.range(deps.storage, None, None, Order::Ascending) {
        let (token_addr, amount) = result.unwrap();
        if amount > Uint128::zero() {
            cw20_withdrawals.push(Cw20Withdrawal {
                token: token_addr.to_string(),
                amount,
            });

            // Create transfer message
            let transfer_msg = Cw20ExecuteMsg::Transfer {
                recipient: config.bob.to_string(),
                amount,
            };

            let wasm_msg = WasmMsg::Execute {
                contract_addr: token_addr.to_string(),
                msg: to_json_binary(&transfer_msg)?,
                funds: vec![],
            };

            cw20_messages.push(SubMsg::new(wasm_msg));
            // // Clear cw20 balances
            // CW20_BALANCES.remove(deps.storage, token_addr);
        }
    }

    // Create native transfer message
    let mut coins = vec![];
    let mut messages = cw20_messages;
    while let Some(denom) = native_coins.next() {
        let d = denom.unwrap();
        let amount = NATIVE_BALANCES.load(deps.storage, d.clone())?;
        let coin = Coin {
            denom: d.clone(),
            amount: amount,
        };
        messages.push(SubMsg::new(cosmwasm_std::BankMsg::Send {
            to_address: config.bob.to_string(),
            amount: vec![coin.clone()],
        }));
        coins.push(coin);
        // NATIVE_BALANCES.remove(deps.storage, d);
    }

    // Emit event
    let event = AliceWithdrawnEvent {
        alice: config.alice.to_string(),
        native_amount: coins,
        cw20_amount: cw20_withdrawals,
    };

    Ok(Response::new()
        .add_submessages(messages)
        .add_attribute("method", "alice_withdraw")
        .add_attribute("alice", config.alice)
        .set_data(to_json_binary(&event)?))
}

pub fn execute_receive_cw20(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    cw20_msg: Cw20ReceiveMsg,
) -> Result<Response, ContractError> {
    // Store the cw20 tokens
    let token_addr = info.sender;
    let amount = cw20_msg.amount;

    let current_balance = CW20_BALANCES
        .load(deps.storage, token_addr.clone())
        .unwrap_or(Uint128::zero());
    CW20_BALANCES.save(
        deps.storage,
        token_addr.clone(),
        &(current_balance + amount),
    )?;

    Ok(Response::new()
        .add_attribute("method", "receive_cw20")
        .add_attribute("token", token_addr)
        .add_attribute("amount", amount))
}

pub fn execute_deposit_native(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    let mut attrs = vec![attr("action", "deposit_native")];

    for coin in info.funds.iter() {
        let existing = NATIVE_BALANCES
            .may_load(deps.storage, coin.denom.clone())?
            .unwrap_or_default();

        let new_total = existing + coin.amount;
        NATIVE_BALANCES.save(deps.storage, coin.denom.clone(), &new_total)?;

        attrs.push(attr("denom", coin.denom.clone()));
        attrs.push(attr("amount", coin.amount.to_string()));
    }

    Ok(Response::new().add_attributes(attrs))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(_deps: Deps, _env: Env, _msg: QueryMsg) -> StdResult<Binary> {
    unimplemented!()
}

#[cfg(test)]
mod tests {}
