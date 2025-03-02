use crate::states::Organisation;
use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, system_instruction},
};

#[derive(Accounts)]
pub struct WithdrawFund<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub organization: Account<'info, Organisation>,
    ///CHECK
    #[account(
        mut,
        seeds = [b"treasury", organization.key().as_ref()],
        bump,
    )]
    pub treasury_pda: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawFund<'info> {
    pub fn withdraw_fund(&mut self, amount: u64, bump: u8) -> Result<()> {
        msg!("Organization: {}", self.organization.key());
        msg!("Treasury PDA: {}", self.treasury_pda.key());
        msg!("Treasury Bump: {}", bump);

        let transfer_instruction =
            system_instruction::transfer(&self.treasury_pda.key(), &self.signer.key(), amount);

        let binding = self.organization.key();
        let seeds = &[b"treasury", binding.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        invoke_signed(
            &transfer_instruction,
            &[
                self.treasury_pda.to_account_info(),
                self.signer.to_account_info(),
                self.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        self.organization.treasury_balance = self
            .organization
            .treasury_balance
            .checked_sub(amount)
            .ok_or(ProgramError::InsufficientFunds)?;

        msg!(
            "Treasury Updated Balance: {}",
            self.organization.treasury_balance
        );

        Ok(())
    }
}
