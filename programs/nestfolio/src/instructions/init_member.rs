use crate::states::{Member, Organisation};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeMember<'info> {
    #[account(mut)]
    pub member_address: Signer<'info>,

    #[account(
        init,
        payer = member_address,  
        seeds = [b"member", organization.key().as_ref()],
        bump,
        space = 8 + Member::INIT_SPACE
    )]
    pub member: Account<'info, Member>,
    pub organization: Account<'info, Organisation>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeMember<'info> {
    pub fn initialize_member(
        &mut self,
        name: String,
        bumps: &InitializeMemberBumps,
    ) -> Result<()> {
        self.member.set_inner(Member {
            name,
            address: self.member_address.key(),
            staked_amount: 0,
            voting_power: 1,
            joined_at: Clock::get()?.unix_timestamp,
            member_bump: bumps.member,
            delegate: None,
            is_active: true,
        });

        Ok(())
    }
}
