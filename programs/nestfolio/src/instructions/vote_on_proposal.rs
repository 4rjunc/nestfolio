use anchor_lang::prelude::*;

use crate::{
    error::NestfolioError,
    states::{Proposal, ProposalStatus},
};

#[derive(Accounts)]

pub struct VoteOnProposal<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub system_program: Program<'info, System>,
}

impl<'info> VoteOnProposal<'info> {
    pub fn vote_on_proposal(&mut self, up_vote: bool) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            current_time < self.proposal.expiry_time,
            NestfolioError::ProposalExpired
        );

        if up_vote {
            self.proposal.up_votes += 1;
        } else {
            self.proposal.down_votes += 1;
        }

        let total_votes = self.proposal.up_votes + self.proposal.down_votes;
        let approval_threshold = 9;

        if self.proposal.up_votes >= approval_threshold {
            self.proposal.status = ProposalStatus::Approved;
        } else if self.proposal.down_votes >= approval_threshold {
            self.proposal.status = ProposalStatus::Rejected;
        }
        msg!("Total votes: {}", total_votes);
        Ok(())
    }
}
