use anchor_lang::prelude::*;

#[error_code]
pub enum NestfolioError {
    #[msg("Unauthorized: You do not have permission to perform this action.")]
    Unauthorized,

    #[msg("InsufficientFunds: Not enough funds to complete the transaction.")]
    InsufficientFunds,

    #[msg("AccountNotInitialized: The account has not been initialized.")]
    AccountNotInitialized,

    #[msg("AccountAlreadyInitialized: The account is already initialized.")]
    AccountAlreadyInitialized,

    // DAO-Specific Errors
    #[msg("DAONotFound: The specified DAO does not exist.")]
    DAONotFound,

    #[msg("DAONotActive: The DAO is not active and cannot accept proposals or votes.")]
    DAONotActive,

    #[msg("ProposalNotFound: The specified proposal does not exist.")]
    ProposalNotFound,

    #[msg("ProposalNotActive: The proposal is not active and cannot be voted on.")]
    ProposalNotActive,

    #[msg("ProposalAlreadyExecuted: The proposal has already been executed.")]
    ProposalAlreadyExecuted,

    #[msg("ProposalExpired: The proposal has expired and can no longer be voted on.")]
    ProposalExpired,

    #[msg(
        "ProposalVotingThresholdNotMet: The proposal did not meet the required voting threshold."
    )]
    ProposalVotingThresholdNotMet,

    #[msg("ProposalAlreadyCanceled: The proposal has already been canceled.")]
    ProposalAlreadyCanceled,

    #[msg("ProposalNotCancelable: The proposal cannot be canceled in its current state.")]
    ProposalNotCancelable,

    // Membership Errors
    #[msg("MemberNotFound: The specified member does not exist in the DAO.")]
    MemberNotFound,

    #[msg("MemberAlreadyExists: The user is already a member of the DAO.")]
    MemberAlreadyExists,

    #[msg("InsufficientStake: The user has not staked enough tokens to perform this action.")]
    InsufficientStake,

    #[msg("StakeLocked: The staked tokens are locked and cannot be withdrawn yet.")]
    StakeLocked,

    // Treasury Errors
    #[msg("TreasuryWithdrawalFailed: The treasury withdrawal failed due to insufficient funds or invalid parameters.")]
    TreasuryWithdrawalFailed,

    #[msg("TreasuryDepositFailed: The treasury deposit failed due to invalid parameters.")]
    TreasuryDepositFailed,

    // Voting Errors
    #[msg("AlreadyVoted: The user has already voted on this proposal.")]
    AlreadyVoted,

    #[msg("VotingNotAllowed: The user is not allowed to vote on this proposal.")]
    VotingNotAllowed,
}
