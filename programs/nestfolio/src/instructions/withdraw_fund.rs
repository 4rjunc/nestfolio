use crate::states::{Organisation, Treasury};
use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, system_instruction},
};

#[derive(Accounts)]
pub struct WithdrawFund<'info> {
    ///CHECK
    #[account(mut)]
    pub signer: AccountInfo<'info>,

    #[account(mut)]
    pub organization: Account<'info, Organisation>,

    #[account(
        mut,
        seeds = [b"treasury", organization.key().as_ref()],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, Treasury>,

    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawFund<'info> {
    pub fn withdraw_fund(&mut self, amount: u64) -> Result<()> {
        msg!("WithdrawFund+++++++++++++++++++");

        msg!("orga {}", self.organization.key());

        let binding = self.organization.key();
        let treasury_seeds = &[b"treasury", binding.as_ref(), &[self.treasury.bump]];
        let signer_seeds = &[&treasury_seeds[..]];

        msg!("Expected Treasury PDA: {}", self.treasury.key());
        msg!("Treasury Bump in Program: {}", self.treasury.bump);

        let transfer_instruction = system_instruction::transfer(
            &self.treasury.key(), // Sender (Treasury PDA)
            &self.signer.key(),   // Receiver (Signer)
            amount,
        );

        invoke_signed(
            &transfer_instruction,
            &[
                self.treasury.to_account_info(),
                self.signer.to_account_info(),
                self.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        Ok(())
    }
}
