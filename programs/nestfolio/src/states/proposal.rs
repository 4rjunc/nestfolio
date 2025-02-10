use anchor_lang::prelude::*;

#[account]
pub struct Proposal {
    pub title: String,
    pub description: String,
    pub proposer: Pubkey,
    pub up_votes: u32,
    pub down_votes: u32,
    pub status: ProposalStatus,
    pub expiry_time: i64,
    pub organization: Pubkey,
    pub proposal_bump: u8,
}
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub enum ProposalStatus {
    Pending,
    Approved,
    Rejected,
}
