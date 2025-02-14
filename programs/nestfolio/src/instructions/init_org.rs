use anchor_lang::prelude::*;

use crate::states::Organisation;

#[derive(Accounts)]
pub struct InitializeOrganization<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        seeds = [b"organization", creator.key().as_ref()],
        bump,
        space = 8 + Organisation::INIT_SPACE
    )]
    pub organisation: Account<'info, Organisation>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeOrganization<'info> {
    pub fn initialize_organization(
        &mut self,
        name: String,
        fee: u64,
        bumps: &InitializeOrganizationBumps
    ) -> Result<()> {
        self.organisation.set_inner(Organisation {
            admin: self.creator.key().clone(),
            name,
            treasury_balance: 0,
            total_members: 0,
            created_at: Clock::get()?.unix_timestamp,
            status: true,
            proposal_limit: 10,
            member_registration_fee: fee,
            minimum_deposit_amount: 1000,
            org_bump: bumps.organisation,
            voting_threshold: 5000000000,
            paused: false,
            unlock_timestamp: 0,
        });
        Ok(())
    }
}
