import * as fs from "node:fs"
import * as path from "node:path"
import { pick } from "./helper"


const CONFIG_FILE = ".openflow.json";

export interface OpenflowConfig {
    terms: {
        type: "file";
        location: string;
        index: string;
    };
}

let root: string | undefined;

export function initConfig(ctx: unknown): void {
    // Get the context directory
    // If there is no project directory, exit silently - Opencode calls the setup
    // multiple times and not all have a project directory
    // Calls with a project directory are always the same though
    const dir = pick(ctx, ["location", "project", "directory"]);
    if (typeof dir !== "string" || dir.trim() === "") {
        return;
    }
    root = dir;
}

export function getRootDir(): string {
    if (root === undefined) {
        throw new Error(
            `initConfig() did not get a project directory (last value: ${String(lastArg)}). ` +
            `A project must be open.`
        );
    }
    return root;
}
export function getConfig(): OpenflowConfig {
    if (root === undefined) {
        throw new Error(
            `initConfig() did not get a project directory (last value: ${String(lastArg)}). ` +
            `A project must be open.`
        );
    }
    const configPath = path.join(root, CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
        throw new Error(`No config at ${configPath}. Run /start_project first.`);
    }
    return JSON.parse(fs.readFileSync(configPath, "utf8")) as OpenflowConfig;
}
