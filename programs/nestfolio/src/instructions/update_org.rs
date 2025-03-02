use crate::states::Organisation;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateOrganisationSettings<'info> {
    #[account(mut)]
    pub organization: Account<'info, Organisation>,
}

impl<'info> UpdateOrganisationSettings<'info> {
    pub fn update_organisation(
        &mut self,
        voting_threshold: u64,
        proposal_limit: u32,
    ) -> Result<()> {
        self.organization.voting_threshold = voting_threshold;
        self.organization.proposal_limit = proposal_limit;

        Ok(())
    }

    pub fn emergency_pause(&mut self, unlock_time: i64) -> Result<()> {
        self.organization.paused = true;
        self.organization.unlock_timestamp = unlock_time;
        Ok(())
    }

    pub fn resume_operations(&mut self) -> Result<()> {
        self.organization.paused = false;
        Ok(())
    }
}
