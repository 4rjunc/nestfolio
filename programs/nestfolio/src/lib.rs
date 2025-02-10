use anchor_lang::prelude::*;

mod states;
mod instructions;


declare_id!("FXvTKSj5SXeRvaKqGxVc97pekvqN77btHBoZ4Qsn9iZX");

#[program]
pub mod nestfolio {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
