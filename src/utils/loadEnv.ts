import { config } from "dotenv";

/* 
  Populate process.env with vars from .env and verify required vars are present. 
  Thanks Z for this function.
*/
export function loadEnv(): void {
    config();
    const requiredEnvVars: string[] = [
        "VEX_CHANNEL_ID",
        "PK",
        "PW",
        "DISCORD_TOKEN",
        "DISCORD_SERVER_ID",
        "DISCORD_CHANNEL_ID",
    ];
    for (const required of requiredEnvVars) {
        if (process.env[required] === undefined) {
            console.warn(
                `Required environment variable '${required}' is not set. Please consult the README.`
            );
            process.exit(1);
        }
    }
}
