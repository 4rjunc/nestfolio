use crate::states::{Member, Organisation};
use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{self, Mint, MintTo, Token, TokenAccount}};

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

    #[account(
        init,
        payer = member_address,
        seeds = [b"member_nft", organization.key().as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = member_address.key(),
    )]
    pub member_nft_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = member_address,
        associated_token::mint = member_nft_mint,
        associated_token::authority = member_address
    )]
    pub member_nft_token_account: Account<'info, TokenAccount>,

    pub organization: Account<'info, Organisation>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
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
        });

        let cpi_accounts = MintTo {
            mint: self.member_nft_mint.to_account_info(),
            to: self.member_nft_token_account.to_account_info(),
            authority: self.member_address.to_account_info(),
        };
    
        let cpi_ctx = CpiContext::new(self.token_program.to_account_info(), cpi_accounts);
        token::mint_to(cpi_ctx, 1)?;

        Ok(())
    }
}
