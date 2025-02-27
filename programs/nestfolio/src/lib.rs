#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

mod instructions;
mod states;
use crate::instructions::*;

mod error;

declare_id!("FXvTKSj5SXeRvaKqGxVc97pekvqN77btHBoZ4Qsn9iZX");

#[program]
pub mod nestfolio {
    use super::*;

    pub fn initialize_organization(
        ctx: Context<InitializeOrganization>,
        name: String,
        fee: u64,
    ) -> Result<()> {
        ctx.accounts
            .initialize_organization(name, fee, &ctx.bumps)?;
        Ok(())
    }

    pub fn initialize_member(ctx: Context<InitializeMember>, name: String) -> Result<()> {
        ctx.accounts.initialize_member(name, &ctx.bumps)?;
        Ok(())
    }

    pub fn update_organisation(
        ctx: Context<UpdateOrganisationSettings>,
        voting_threshold: u64,
        proposal_limit: u32,
    ) -> Result<()> {
        ctx.accounts
            .update_organisation(voting_threshold, proposal_limit)?;
        Ok(())
    }

    pub fn emergency_pause(
        ctx: Context<UpdateOrganisationSettings>,
        unlock_time: i64,
    ) -> Result<()> {
        ctx.accounts.emergency_pause(unlock_time)?;
        Ok(())
    }

    pub fn resume_operations(ctx: Context<UpdateOrganisationSettings>) -> Result<()> {
        ctx.accounts.resume_operations()?;
        Ok(())
    }

    pub fn deposit_fund(ctx: Context<DepositFund>, amount: u64) -> Result<()> {
        ctx.accounts.deposit_fund(amount)?;
        Ok(())
    }

    pub fn withdraw_fund(ctx: Context<WithdrawFund>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw_fund(amount)?;
        Ok(())
    }
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        expiry_time: i64,
    ) -> Result<()> {
        ctx.accounts
            .create_proposal(title, description, expiry_time, ctx.bumps.proposal)?;
        Ok(())
    }
    pub fn vote_on_proposal(ctx: Context<VoteOnProposal>, vote: bool) -> Result<()> {
        ctx.accounts.vote_on_proposal(vote)?;
        Ok(())
    }

    pub fn list_proposal(
        ctx: Context<ListProposal>,
        title: String,
        description: String,
        expiry_time: i64,
    ) -> Result<()> {
        ctx.accounts
            .list_proposal(title, description, expiry_time)?;
        Ok(())
    }
}
