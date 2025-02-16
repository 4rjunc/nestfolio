use anchor_lang::{ prelude::*, system_program::{ transfer, Transfer } };
use crate::states::{ Organisation, Treasury };

#[derive(Accounts)]
pub struct DepositFund<'info> {
    #[account(mut, signer)]
    pub member: Signer<'info>,

    #[account(mut)]
    pub organisation: Account<'info, Organisation>,

    #[account(
        init,
        payer = member,
        seeds = [b"treasury", organisation.key().as_ref()],
        bump,
        space = 8 + Treasury::INIT_SPACE
    )]
    pub treasury: Account<'info, Treasury>,
    pub system_program: Program<'info, System>,
}

impl<'info> DepositFund<'info> {
    pub fn deposit_fund(&mut self, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.member.to_account_info(),
            to: self.treasury.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.system_program.to_account_info(), cpi_accounts);

        transfer(cpi_ctx, amount)?;

        Ok(())
    }
}
