#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

mod states;
mod instructions;
use crate::instructions::*;

declare_id!("FXvTKSj5SXeRvaKqGxVc97pekvqN77btHBoZ4Qsn9iZX");

#[program]
pub mod nestfolio {
    use super::*;

    pub fn initialize_organization(
        ctx: Context<InitializeOrganization>,
        name: String,
        fee: u64
    ) -> Result<()> {
        ctx.accounts.initialize_organization(name, fee, &ctx.bumps)?;
        Ok(())
    }

    pub fn update_organisation(
        ctx: Context<UpdateOrganisationSettings>,
        voting_threshold: u64,
        proposal_limit: u32
    ) -> Result<()> {
        ctx.accounts.update_organisation(voting_threshold, proposal_limit)?;
        Ok(())
    }
}
