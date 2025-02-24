use anchor_lang::{ prelude::*, system_program::{ transfer, Transfer } };
use crate::states::{ Organisation, Treasury };

#[derive(Accounts)]
pub struct WithdrawFund<'info> {
    #[account(mut, signer)]
    pub member: Signer<'info>,

    #[account(mut)]
    pub organization: Account<'info, Organisation>,

    #[account(
        mut,
        seeds = [b"treasury", organization.key().as_ref()],
        bump,
    )]
    pub treasury: Account<'info, Treasury>,
    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawFund<'info> {
    pub fn withdraw_fund(&mut self, amount: u64) -> Result<()> {
        let system_program = self.system_program.to_account_info();
        let acounts = Transfer {
            from: self.treasury.to_account_info(),
            to: self.member.to_account_info(),
        };

        let seeds: &[&[u8]] = &[
            b"treasury",
            self.organization.to_account_info().key.as_ref(),
            &[self.treasury.bump],
        ];
        let signer_seeds: &[&[&[u8]]] = &[&seeds];

        let cpi_ctx = CpiContext::new_with_signer(system_program, acounts, signer_seeds);

        transfer(cpi_ctx, amount)?;

        Ok(())
    }
}
