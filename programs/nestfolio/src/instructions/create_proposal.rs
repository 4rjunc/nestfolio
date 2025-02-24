use anchor_lang::prelude::*;

use crate::states::{Organisation, Proposal, ProposalStatus};

#[derive(Accounts)]
#[instruction(title: String, description: String)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,
    #[account(
        init,
        payer = proposer,
        seeds = [b"proposal", proposer.key().as_ref() ,organization.key().as_ref(), title.as_bytes()],
        bump,
        space = 8 +  
        4 + title.len() +
        4 + description.len() +  
        32 +  
        4 + 4 +  
        1 +  
        8 +  
        32 + 
        1,   
    )]
    pub proposal: Account<'info, Proposal>,
    pub organization: Account<'info, Organisation>,
    pub system_program: Program<'info, System>,
}

impl <'info> CreateProposal<'info> {
    pub fn create_proposal(
        &mut self,
        title: String,
        description: String,
        expiry_time: i64,
        proposal_bump: u8,
    ) -> Result<()> {
        self.proposal.set_inner(Proposal {
            title,
            description,
            proposer: self.proposer.key().clone(),
            up_votes: 0,
            down_votes: 0,
            status: ProposalStatus::Pending,
            expiry_time,
            organization: self.organization.key().clone(),
            proposal_bump,
        });

        Ok(())
    }

   
    
}
