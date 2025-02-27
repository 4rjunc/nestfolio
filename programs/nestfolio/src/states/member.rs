use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Member {
    #[max_len(20)]
    pub name: String,
    pub address: Pubkey,
    pub staked_amount: u64,
    pub voting_power: u32,
    pub joined_at: i64,
    pub member_bump: u8,
    pub delegate: Option<Pubkey>,
    pub is_active: bool,
}
