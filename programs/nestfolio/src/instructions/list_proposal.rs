use anchor_lang::prelude::*;

use crate::states::Organisation;

use crate::states::Proposal;
#[derive(Accounts)]
pub struct ListProposal<'info> {
    pub admin: Signer<'info>,
    #[account(
        seeds = [b"organization", organization.key().as_ref()], 
        bump = organization.org_bump
    )]
    pub organization: Account<'info, Organisation>,

    #[account(
        has_one = organization,
        constraint = proposal.organization == organization.key()
    )]
    pub proposal: Account<'info, Proposal>,
}

impl<'info> ListProposal<'info> {
    pub fn list_proposal(
        &mut self,
        title: String,
        description: String,
        expiry_time: i64,
    ) -> Result<()> {
        let proposal_bump = *self.proposal.to_account_info().key.as_ref().last().unwrap();

        self.proposal.set_inner(Proposal {
            title,
            description,
            expiry_time,
            up_votes: 0,
            down_votes: 0,
            status: crate::states::ProposalStatus::Pending,
            organization: self.organization.key(),
            proposal_bump,
            proposer: self.admin.key(),
        });

        Ok(())
    }
}
