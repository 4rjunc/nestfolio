use anchor_lang::prelude::*;
use anchor_spl::token::{ transfer, Token, Transfer };
use crate::states::Organisation;

#[derive(Accounts)]
pub struct DepositFund<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(mut)]
    pub org: Account<'info, Organisation>,

    ///CHECK
    #[account(
        mut,
    )]
    pub treasury: AccountInfo<'info>,
    /// CHECK
    #[account(
        mut,
    )]
    pub deposit_token: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> DepositFund<'info> {
    pub fn deposit_fund(&mut self, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.deposit_token.to_account_info(),
            to: self.treasury.to_account_info(),
            authority: self.depositor.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.token_program.to_account_info(), cpi_accounts);

        transfer(cpi_ctx, amount)?;

        Ok(())
    }
}
