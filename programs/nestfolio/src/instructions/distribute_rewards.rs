use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, system_instruction},
};

use crate::{
    error::NestfolioError,
    states::{Organisation, Proposal, Treasury},
};

#[derive(Accounts)]
pub struct DistributeRewards<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(mut)]
    pub organization: Account<'info, Organisation>,

    #[account(mut)]
    pub proposal1: Account<'info, Proposal>,

    #[account(mut)]
    pub proposal2: Account<'info, Proposal>,

    #[account(mut)]
    pub proposal3: Account<'info, Proposal>,

    #[account(mut)]
    pub proposer: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> DistributeRewards<'info> {
    pub fn distribute_rewards(&mut self) -> Result<()> {
        let mut highest_proposal = &self.proposal1;
        let mut highest_votes = self.proposal1.up_votes - self.proposal1.down_votes;

        let proposal2_votes = self.proposal2.up_votes - self.proposal2.down_votes;
        if proposal2_votes > highest_votes {
            highest_proposal = &self.proposal2;
            highest_votes = proposal2_votes;
        }

        let proposal3_votes = self.proposal3.up_votes - self.proposal3.down_votes;
        if proposal3_votes > highest_votes {
            highest_proposal = &self.proposal3;
        }

        let reward_amount = self.organization.treasury_balance;
        require!(reward_amount > 0, NestfolioError::InsufficientFunds);

        let ix = system_instruction::transfer(
            &self.treasury.key(),
            &highest_proposal.proposer,
            reward_amount,
        );

        let signer_seeds: &[&[u8]] = &[b"treasury", &[self.treasury.bump]];
        let signer = &[&signer_seeds[..]];

        invoke_signed(
            &ix,
            &[
                self.treasury.to_account_info(),
                self.proposer.to_account_info(), 
                self.system_program.to_account_info(),
            ],
            signer,
        )?;

        Ok(())
    }
}
