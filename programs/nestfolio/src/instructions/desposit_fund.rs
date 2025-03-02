use crate::states::Organisation;
use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

#[derive(Accounts)]
pub struct DepositFund<'info> {
    #[account(mut)]
    pub member: Signer<'info>,

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

impl<'info> DepositFund<'info> {
    pub fn deposit_fund(&mut self, amount: u64, bump: u8) -> Result<()> {
        msg!("Treasury Bump {}", bump);

        let cpi_accounts = Transfer {
            from: self.member.to_account_info(),
            to: self.treasury_pda.to_account_info(),
        };

        let binding = self.organization.key();
        let seeds = &[b"treasury", binding.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            self.system_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        transfer(cpi_ctx, amount)?;

        self.organization.treasury_balance += amount;

        msg!(
            "Treasury Updated Balance: {}",
            self.organization.treasury_balance
        );

        Ok(())
    }
}
