import * as _octokit_openapi_types from '@octokit/openapi-types';
import { Client, AgentRuntime } from '@elizaos/core';

interface GitHubConfig {
    owner: string;
    repo: string;
    branch?: string;
    path?: string;
    token: string;
}
declare class GitHubClient {
    private octokit;
    private git;
    private config;
    private runtime;
    private repoPath;
    constructor(runtime: AgentRuntime);
    initialize(): Promise<void>;
    private cloneRepository;
    createMemoriesFromFiles(): Promise<void>;
    createPullRequest(title: string, branch: string, files: Array<{
        path: string;
        content: string;
    }>, description?: string): Promise<{
        url: string;
        id: number;
        node_id: string;
        html_url: string;
        diff_url: string;
        patch_url: string;
        issue_url: string;
        commits_url: string;
        review_comments_url: string;
        review_comment_url: string;
        comments_url: string;
        statuses_url: string;
        number: number;
        state: "open" | "closed";
        locked: boolean;
        title: string;
        user: _octokit_openapi_types.components["schemas"]["simple-user"];
        body: string | null;
        labels: {
            id: number;
            node_id: string;
            url: string;
            name: string;
            description: string | null;
            color: string;
            default: boolean;
        }[];
        milestone: _octokit_openapi_types.components["schemas"]["nullable-milestone"];
        active_lock_reason?: string | null;
        created_at: string;
        updated_at: string;
        closed_at: string | null;
        merged_at: string | null;
        merge_commit_sha: string | null;
        assignee: _octokit_openapi_types.components["schemas"]["nullable-simple-user"];
        assignees?: _octokit_openapi_types.components["schemas"]["simple-user"][] | null;
        requested_reviewers?: _octokit_openapi_types.components["schemas"]["simple-user"][] | null;
        requested_teams?: _octokit_openapi_types.components["schemas"]["team-simple"][] | null;
        head: {
            label: string;
            ref: string;
            repo: _octokit_openapi_types.components["schemas"]["repository"];
            sha: string;
            user: _octokit_openapi_types.components["schemas"]["simple-user"];
        };
        base: {
            label: string;
            ref: string;
            repo: _octokit_openapi_types.components["schemas"]["repository"];
            sha: string;
            user: _octokit_openapi_types.components["schemas"]["simple-user"];
        };
        _links: {
            comments: _octokit_openapi_types.components["schemas"]["link"];
            commits: _octokit_openapi_types.components["schemas"]["link"];
            statuses: _octokit_openapi_types.components["schemas"]["link"];
            html: _octokit_openapi_types.components["schemas"]["link"];
            issue: _octokit_openapi_types.components["schemas"]["link"];
            review_comments: _octokit_openapi_types.components["schemas"]["link"];
            review_comment: _octokit_openapi_types.components["schemas"]["link"];
            self: _octokit_openapi_types.components["schemas"]["link"];
        };
        author_association: _octokit_openapi_types.components["schemas"]["author-association"];
        auto_merge: _octokit_openapi_types.components["schemas"]["auto-merge"];
        draft?: boolean;
        merged: boolean;
        mergeable: boolean | null;
        rebaseable?: boolean | null;
        mergeable_state: string;
        merged_by: _octokit_openapi_types.components["schemas"]["nullable-simple-user"];
        comments: number;
        review_comments: number;
        maintainer_can_modify: boolean;
        commits: number;
        additions: number;
        deletions: number;
        changed_files: number;
    }>;
    createCommit(message: string, files: Array<{
        path: string;
        content: string;
    }>): Promise<void>;
}
declare const GitHubClientInterface: Client;

export { GitHubClient, GitHubClientInterface, type GitHubConfig, GitHubClientInterface as default };
