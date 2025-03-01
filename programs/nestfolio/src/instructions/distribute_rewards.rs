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
        seeds = [b"treasury", organization.key().as_ref()],
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

    pub system_program: Program<'info, System>,
}

impl<'info> DistributeRewards<'info> {
    pub fn distribute_rewards(&mut self) -> Result<()> {
        let highest_proposer = &self.proposal1.proposer;

        let reward_amount = self.organization.treasury_balance;
        require!(reward_amount > 0, NestfolioError::InsufficientFunds);
        let org = self.organization.key();

        let ix = system_instruction::transfer(&self.treasury.key(), &highest_proposer.key(), 10);

        let signer_seeds: &[&[u8]] = &[b"treasury", org.as_ref(), &[self.treasury.bump]];
        let signer = &[&signer_seeds[..]];

        invoke_signed(
            &ix,
            &[
                self.treasury.to_account_info(),
                self.creator.to_account_info(),
                self.system_program.to_account_info(),
            ],
            signer,
        )?;

        Ok(())
    }
}
