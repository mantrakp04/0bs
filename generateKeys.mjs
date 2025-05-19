import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", {
  extractable: true,
});
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

process.stdout.write(`npx convex env set JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, " ")}"\n\nnpx convex env set JWKS='${jwks}'\n\nnpx convex env set SITE_URL="https://localhost:3000"\n\n`);