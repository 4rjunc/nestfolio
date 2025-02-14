use anchor_lang::prelude::*;
use crate::states::Organisation;

#[derive(Accounts)]
pub struct UpdateOrganisationSettings<'info> {
    #[account(mut)]
    pub organisation: Account<'info, Organisation>,
}

impl<'info> UpdateOrganisationSettings<'info> {
    pub fn update_organisation(
        &mut self,
        voting_threshold: u64,
        proposal_limit: u32
    ) -> Result<()> {
        self.organisation.voting_threshold = voting_threshold;
        self.organisation.proposal_limit = proposal_limit;

        Ok(())
    }
}
