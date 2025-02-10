use anchor_lang::prelude::*;

#[account]
pub struct Organisation {
    pub name: String,
    pub treasury_balance: u64,
    pub total_members: u32,
    pub created_at: i64,
    pub status: bool,
    pub proposal_limit: u32,
    pub member_registration_fee: u64,
    pub minimum_deposit_amount: u64,
    pub org_bump: u8,
}
