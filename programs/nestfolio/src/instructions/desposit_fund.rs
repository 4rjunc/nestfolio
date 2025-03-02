use crate::states::{Organisation, Treasury};
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

    #[account(
        init,
        payer = member,
        space = 8 + Treasury::INIT_SPACE,
        seeds = [b"treasury".as_ref(), organization.key().as_ref()],
        bump,
    )]
    pub treasury: Account<'info, Treasury>,
    pub system_program: Program<'info, System>,
}

impl<'info> DepositFund<'info> {
    pub fn deposit_fund(&mut self, amount: u64, bump: u8) -> Result<()> {
        self.treasury.set_inner(Treasury {
            amount,
            bump,
            admin: *self.member.key,
        });
        msg!("bump kitna hain ? ++++++++++ {}", bump);
        msg!("Treasury updated balance: {}", self.treasury.amount);

        let cpi_accounts = Transfer {
            from: self.member.to_account_info(),
            to: self.treasury.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.system_program.to_account_info(), cpi_accounts);

        transfer(cpi_ctx, amount)?;

        self.treasury.amount += amount;
        self.organization.treasury_balance += amount;

        msg!("Treasury updated balance: {}", self.treasury.amount);

        Ok(())
    }
}
