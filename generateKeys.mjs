import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", {
  extractable: true,
});
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

process.stdout.write(`bunx convex env set JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, " ")}"\n\nbunx convex env set JWKS='${jwks}'\n\nbunx convex env set SITE_URL="https://localhost:3000"\n\n`);