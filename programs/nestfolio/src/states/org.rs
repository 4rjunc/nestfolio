use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Organisation {
    pub(crate) admin: Pubkey,
    #[max_len(20)]
    pub name: String,
    pub treasury_balance: u64,
    pub total_members: u32,
    pub created_at: i64,
    pub status: bool,
    pub proposal_limit: u32,
    pub member_registration_fee: u64,
    pub minimum_deposit_amount: u64,
    pub org_bump: u8,
    pub voting_threshold: u64,
    pub paused: bool,
    pub unlock_timestamp: i64,
    #[max_len(100)]
    pub proposal_list: Vec<Pubkey>,
}
