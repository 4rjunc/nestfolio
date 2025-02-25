use anchor_lang::prelude::*;

use crate::{
    error::NestfolioError,
    states::{Member, Organisation},
};

#[derive(Accounts)]
pub struct DelegateVote<'info> {
    #[account(mut, signer)]
    pub voter: Signer<'info>,

    #[account(mut)]
    pub delegate: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"member", voter.key().as_ref()],
        bump
    )]
    pub voter_account: Account<'info, Member>,

    #[account(
        mut,
        seeds = [b"member", delegate.key().as_ref()],
        bump
    )]
    pub delegate_account: Account<'info, Member>,

    pub organization: Account<'info, Organisation>,
}

impl<'info> DelegateVote<'info> {
    pub fn delegate_vote(&mut self) -> Result<()> {
        require!(
            self.voter_account.is_active,
            NestfolioError::MemberNotActive
        );
        require!(
            self.delegate_account.is_active,
            NestfolioError::MemberNotActive
        );
        require!(
            self.voter.key() != self.delegate.key(),
            NestfolioError::CannotDelegateToSelf
        );
        require!(
            self.voter_account.delegate.is_none(),
            NestfolioError::AlreadyDelegated
        );

        self.voter_account.delegate = Some(self.delegate.key());

        msg!(
            "Vote delegated from {} to {}",
            self.voter.key(),
            self.delegate.key()
        );

        Ok(())
    }
}
