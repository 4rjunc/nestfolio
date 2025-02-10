use anchor_lang::prelude::*;

#[account]
pub struct Member {
    pub address: Pubkey,
    pub reputation: Vec<Pubkey>,
    pub staked_amount: u64,
    pub voting_power: u32,
    pub joined_at: i64,
}
