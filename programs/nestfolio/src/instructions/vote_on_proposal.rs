use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{self, Mint, MintTo, Token, TokenAccount}};

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

    #[account (
        init_if_needed,
        payer = voter,  
        seeds = [b"proposal", proposal.key().as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = voter.key(),
    )]
    pub proposal_nft_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = voter,
        associated_token::mint = proposal_nft_mint,
        associated_token::authority = voter
    )]

    pub proposal_nft_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

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

            
        let cpi_accounts = MintTo {
            mint: self.proposal_nft_mint.to_account_info(),
            to: self.proposal_nft_token_account.to_account_info(),
            authority: self.voter.to_account_info(),
        };
    
        let cpi_ctx = CpiContext::new(self.token_program.to_account_info(), cpi_accounts);
        token::mint_to(cpi_ctx, 1)?;

        } else if self.proposal.down_votes >= approval_threshold {
            self.proposal.status = ProposalStatus::Rejected;
        }
        msg!("Total votes: {}", total_votes);
        Ok(())
    }
}
