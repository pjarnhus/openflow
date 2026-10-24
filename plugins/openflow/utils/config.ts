import * as fs from "node:fs"
import * as path from "node:path"


let root: string | undefined;

export function initConfig(ctx) {
    root = ctx.location.project.directory;
}

export async function getConfig() {
    // Check if path to config file has been set
    if (!root) throw new Error("initConfig() was never called");
    // Check if file exists, otherwise inform the user to run /start_project
    config_path = path.join(root, ".opencode.json");
    if (!fs.existsSync(config_path)) throw new Error("Project has not been initialised. Run /start_project first.");

    // Return the config
    return JSON.parse(await fs.readFile(path.join(root, ".opencode.json"), "utf8"));
}
