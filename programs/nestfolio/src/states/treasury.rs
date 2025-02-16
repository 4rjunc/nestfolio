use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Treasury {
    pub amount: u64,
    pub bump: u8,
    pub admin: Pubkey,
}
